import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { generateSessionDates } from '@/lib/date-utils'
import { logger } from '@/lib/logger'

export class SessionService {
  // Crear una sesión individual
  static async createSession(data: {
    gymId: string
    profId: string
    roomId: string
    classTypeId: string
    startAt: Date
    endAt: Date
    capacity: number
  }, createdBy: string) {
    // Verificar que el usuario tenga acceso al gimnasio
    const membership = await prisma.gymMember.findFirst({
      where: {
        userId: createdBy,
        gymId: data.gymId,
        roleInGym: {
          in: ['ADMIN', 'PROFESOR']
        }
      }
    })

    if (!membership) {
      // Si no tiene membresía, crearla automáticamente para profesores
      const user = await prisma.user.findUnique({
        where: { id: createdBy },
        select: { role: true }
      })

      if (user?.role === 'PROFESOR') {
        await prisma.gymMember.create({
          data: {
            userId: createdBy,
            gymId: data.gymId,
            roleInGym: 'PROFESOR',
            isActive: true
          }
        })
      } else {
        throw new AuthError('No tienes permisos para crear sesiones en este gimnasio', 403)
      }
    }

    // CORRECCIÓN: Sumar 1 día a las fechas para compensar el desfase de zona horaria
    const correctedStartAt = new Date(data.startAt)
    correctedStartAt.setDate(correctedStartAt.getDate() + 1)
    
    const correctedEndAt = new Date(data.endAt)
    correctedEndAt.setDate(correctedEndAt.getDate() + 1)
    
    console.log('SessionService.createSession - Fechas corregidas:', {
      originalStartAt: data.startAt,
      correctedStartAt: correctedStartAt,
      originalEndAt: data.endAt,
      correctedEndAt: correctedEndAt
    })

    // Verificar que la sala esté disponible en ese horario (usar fechas corregidas)
    const conflictingSession = await prisma.classSession.findFirst({
      where: {
        roomId: data.roomId,
        status: {
          in: ['PROGRAMADA', 'EN_CURSO']
        },
        OR: [
          {
            startAt: {
              lt: correctedEndAt
            },
            endAt: {
              gt: correctedStartAt
            }
          }
        ]
      }
    })

    if (conflictingSession) {
      throw new AuthError('La sala no está disponible en ese horario', 400)
    }

    // Crear la sesión con fechas corregidas
    const session = await prisma.classSession.create({
      data: {
        gymId: data.gymId,
        profId: data.profId,
        roomId: data.roomId,
        classTypeId: data.classTypeId,
        startAt: correctedStartAt,
        endAt: correctedEndAt,
        capacity: data.capacity,
        status: 'PROGRAMADA'
      },
      include: {
        gym: true,
        professor: {
          select: {
            name: true
          }
        },
        room: {
          include: {
            location: true
          }
        },
        classType: true
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: createdBy,
        entity: 'ClassSession',
        entityId: session.id,
        action: 'CREATE',
        diff: {
          gymId: data.gymId,
          profId: data.profId,
          roomId: data.roomId,
          classTypeId: data.classTypeId,
          startAt: data.startAt,
          endAt: data.endAt,
          capacity: data.capacity
        }
      }
    })

    return session
  }

  // Generar sesiones desde una plantilla
  static async generateSessionsFromTemplate(
    data: {
      templateId: string
      weeks: number
      startDate: Date
    },
    generatedBy: string
  ) {
    const template = await prisma.scheduleTemplate.findUnique({
      where: { id: data.templateId },
      include: {
        gym: true,
        room: {
          include: {
            location: true
          }
        },
        classType: true
      }
    })

    if (!template) {
      throw new AuthError('Plantilla no encontrada', 404)
    }

    if (!template.room || !template.room.location) {
      throw new AuthError('Información de sala o ubicación no encontrada', 404)
    }

    if (!template.active) {
      throw new AuthError('La plantilla no está activa', 400)
    }

    // Generar fechas de sesiones
    const sessionDates = generateSessionDates(
      data.startDate,
      template.daysOfWeek,
      data.weeks
    )

    const generatedSessions = []
    const errors = []

    for (const date of sessionDates) {
      try {
        // Calcular horarios
        const [hours, minutes] = template.startTime.split(':').map(Number)
        const startAt = new Date(date)
        startAt.setHours(hours, minutes, 0, 0)
        
        const endAt = new Date(startAt.getTime() + template.durationMin * 60 * 1000)

        // CORRECCIÓN: Sumar 1 día a las fechas para compensar el desfase de zona horaria
        const correctedStartAt = new Date(startAt)
        correctedStartAt.setDate(correctedStartAt.getDate() + 1)
        
        const correctedEndAt = new Date(endAt)
        correctedEndAt.setDate(correctedEndAt.getDate() + 1)
        
        console.log('SessionService.generateSessionsFromTemplate - Fechas corregidas:', {
          originalStartAt: startAt,
          correctedStartAt: correctedStartAt,
          originalEndAt: endAt,
          correctedEndAt: correctedEndAt
        })

        // Verificar disponibilidad de la sala (usar fechas corregidas)
        const conflictingSession = await prisma.classSession.findFirst({
          where: {
            roomId: template.roomId,
            status: {
              in: ['PROGRAMADA', 'EN_CURSO']
            },
            OR: [
              {
                startAt: {
                  lt: correctedEndAt
                },
                endAt: {
                  gt: correctedStartAt
                }
              }
            ]
          }
        })

        if (conflictingSession) {
          errors.push(`Conflicto en ${date.toLocaleDateString()} ${template.startTime}`)
          continue
        }

        // Crear la sesión con fechas corregidas
        const session = await prisma.classSession.create({
          data: {
            gymId: template.gymId,
            profId: template.profId,
            roomId: template.roomId,
            classTypeId: template.classTypeId,
            startAt: correctedStartAt,
            endAt: correctedEndAt,
            capacity: template.capacity,
            status: 'PROGRAMADA'
          }
        })

        generatedSessions.push(session)

        // Registrar en auditoría
        await prisma.auditLog.create({
          data: {
            actorId: generatedBy,
            entity: 'ClassSession',
            entityId: session.id,
            action: 'CREATE_FROM_TEMPLATE',
            diff: {
              templateId: data.templateId,
              startDate: data.startDate,
              weeks: data.weeks
            }
          }
        })
      } catch (error) {
        errors.push(`Error al crear sesión para ${date.toLocaleDateString()}: ${error}`)
      }
    }

    return {
      generated: generatedSessions.length,
      sessions: generatedSessions,
      errors,
      template: {
        name: template.classType.name,
        room: template.room.name,
        location: template.room.location.name
      }
    }
  }

  // Actualizar una sesión
  static async updateSession(
    sessionId: string,
    data: {
      startAt?: Date
      endAt?: Date
      capacity?: number
      status?: 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'
    },
    updatedBy: string
  ) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        bookings: {
          where: {
            status: {
              in: ['RESERVADA', 'ASISTIO']
            }
          }
        }
      }
    })

    if (!session) {
      throw new AuthError('Sesión no encontrada', 404)
    }

    // Verificar que no se reduzca la capacidad por debajo de las reservas existentes
    if (data.capacity !== undefined && data.capacity < session.bookings.length) {
      throw new AuthError('No se puede reducir la capacidad por debajo de las reservas existentes', 400)
    }

    // Verificar disponibilidad de la sala si se cambia el horario
    if (data.startAt || data.endAt) {
      const startAt = data.startAt || session.startAt
      const endAt = data.endAt || session.endAt

      const conflictingSession = await prisma.classSession.findFirst({
        where: {
          roomId: session.roomId,
          id: { not: sessionId },
          status: {
            in: ['PROGRAMADA', 'EN_CURSO']
          },
          OR: [
            {
              startAt: {
                lt: endAt
              },
              endAt: {
                gt: startAt
              }
            }
          ]
        }
      })

      if (conflictingSession) {
        throw new AuthError('La sala no está disponible en ese horario', 400)
      }
    }

    // Actualizar la sesión
    const updatedSession = await prisma.classSession.update({
      where: { id: sessionId },
      data,
      include: {
        gym: true,
        professor: {
          select: {
            name: true
          }
        },
        room: {
          include: {
            location: true
          }
        },
        classType: true
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: updatedBy,
        entity: 'ClassSession',
        entityId: sessionId,
        action: 'UPDATE',
        diff: {
          previous: {
            startAt: session.startAt,
            endAt: session.endAt,
            capacity: session.capacity,
            status: session.status
          },
          new: {
            startAt: updatedSession.startAt,
            endAt: updatedSession.endAt,
            capacity: updatedSession.capacity,
            status: updatedSession.status
          }
        }
      }
    })

    return updatedSession
  }

  // Cancelar una sesión
  static async cancelSession(
    sessionId: string,
    reason: string,
    cancelledBy: string
  ) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        bookings: {
          where: {
            status: {
              in: ['RESERVADA', 'ASISTIO']
            }
          }
        }
      }
    })

    if (!session) {
      throw new AuthError('Sesión no encontrada', 404)
    }

    if (session.status === 'CANCELADA') {
      throw new AuthError('La sesión ya está cancelada', 400)
    }

    // Cancelar todas las reservas activas
    for (const booking of session.bookings) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELADA' }
      })

      // Reembolsar tokens si corresponde
      if (booking.tokenGrantId) {
        const tokenGrant = await prisma.tokenGrant.findUnique({
          where: { id: booking.tokenGrantId }
        })

        if (tokenGrant) {
          // Importar TokenService dinámicamente para evitar dependencias circulares
          const { TokenService } = await import('./token.service')
          await TokenService.refundTokens(
            tokenGrant.walletId,
            1,
            `Sesión cancelada: ${reason}`
          )
        }
      }
    }

    // Actualizar estado de la sesión
    const updatedSession = await prisma.classSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELADA' }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: cancelledBy,
        entity: 'ClassSession',
        entityId: sessionId,
        action: 'CANCEL',
        diff: {
          reason,
          cancelledBookings: session.bookings.length,
          previousStatus: session.status
        }
      }
    })

    return updatedSession
  }

  // Obtener sesiones con filtros
  static async getSessions(filters: {
    gymId?: string
    profId?: string
    classTypeId?: string
    startDate?: Date
    endDate?: Date
    status?: string
    roomId?: string
    limit?: number
  }) {
    logger.debug('SessionService.getSessions - Filtros recibidos:', filters);
    
    const where: any = {}

    if (filters.gymId) {
      where.gymId = filters.gymId
    }

    if (filters.profId) {
      where.profId = filters.profId
    }

    if (filters.classTypeId) {
      where.classTypeId = filters.classTypeId
    }

    if (filters.roomId) {
      where.roomId = filters.roomId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.startDate || filters.endDate) {
      where.startAt = {}
      
      if (filters.startDate) {
        where.startAt.gte = filters.startDate
      }
      
      if (filters.endDate) {
        where.startAt.lte = filters.endDate
      }
    }

    logger.debug('SessionService.getSessions - Where clause:', JSON.stringify(where, null, 2);)

    const sessions = await prisma.classSession.findMany({
      where,
      include: {
        gym: true,
        professor: {
          select: {
            name: true
          }
        },
        room: {
          include: {
            location: true
          }
        },
        classType: true,
        bookings: {
          where: {
            status: {
              in: ['RESERVADA', 'ASISTIO']
            }
          },
          include: {
            alumno: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        startAt: 'asc'
      },
      ...(filters.limit && { take: filters.limit })
    })

    logger.debug('SessionService.getSessions - Sesiones encontradas:', sessions.length);
    if (sessions.length > 0) {
      console.log('SessionService.getSessions - Primera sesión:', {
        id: sessions[0].id,
        startAt: sessions[0].startAt,
        endAt: sessions[0].endAt,
        gymId: sessions[0].gymId,
        profId: sessions[0].profId
      })
    }

    return sessions
  }

  // Obtener sesiones de una semana específica
  static async getWeekSessions(
    gymId: string,
    startDate: Date,
    endDate: Date
  ) {
    return this.getSessions({
      gymId,
      startDate,
      endDate
    })
  }

  // Obtener sesiones de un mes específico
  static async getMonthSessions(
    gymId: string,
    year: number,
    month: number
  ) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    return this.getSessions({
      gymId,
      startDate,
      endDate
    })
  }

  // Obtener estadísticas de sesiones
  static async getSessionStats(
    gymId: string,
    startDate: Date,
    endDate: Date
  ) {
    const sessions = await this.getSessions({
      gymId,
      startDate,
      endDate
    })

    const stats = {
      total: sessions.length,
      byStatus: {} as Record<string, number>,
      byClassType: {} as Record<string, number>,
      byProfessor: {} as Record<string, number>,
      totalCapacity: 0,
      totalBookings: 0,
      averageOccupancy: 0
    }

    for (const session of sessions) {
      // Contar por estado
      stats.byStatus[session.status] = (stats.byStatus[session.status] || 0) + 1

      // Contar por tipo de clase
      const className = session.classType.name
      stats.byClassType[className] = (stats.byClassType[className] || 0) + 1

      // Contar por profesor
      const profName = session.professor.name
      stats.byProfessor[profName] = (stats.byProfessor[profName] || 0) + 1

      // Capacidad y reservas
      stats.totalCapacity += session.capacity
      stats.totalBookings += session.bookings.length
    }

    if (stats.totalCapacity > 0) {
      stats.averageOccupancy = (stats.totalBookings / stats.totalCapacity) * 100
    }

    return stats
  }

  // Duplicar una sesión
  static async duplicateSession(
    sessionId: string,
    newStartAt: Date,
    duplicatedBy: string
  ) {
    const originalSession = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        classType: true,
        room: true
      }
    })

    if (!originalSession) {
      throw new AuthError('Sesión original no encontrada', 404)
    }

    // Calcular nueva fecha de fin
    const duration = originalSession.endAt.getTime() - originalSession.startAt.getTime()
    const newEndAt = new Date(newStartAt.getTime() + duration)

    // Verificar disponibilidad
    const conflictingSession = await prisma.classSession.findFirst({
      where: {
        roomId: originalSession.roomId,
        status: {
          in: ['PROGRAMADA', 'EN_CURSO']
        },
        OR: [
          {
            startAt: {
              lt: newEndAt
            },
            endAt: {
              gt: newStartAt
            }
          }
        ]
      }
    })

    if (conflictingSession) {
      throw new AuthError('La sala no está disponible en ese horario', 400)
    }

    // Crear sesión duplicada
    const duplicatedSession = await prisma.classSession.create({
      data: {
        gymId: originalSession.gymId,
        profId: originalSession.profId,
        roomId: originalSession.roomId,
        classTypeId: originalSession.classTypeId,
        startAt: newStartAt,
        endAt: newEndAt,
        capacity: originalSession.capacity,
        status: 'PROGRAMADA'
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: duplicatedBy,
        entity: 'ClassSession',
        entityId: duplicatedSession.id,
        action: 'DUPLICATE',
        diff: {
          originalSessionId: sessionId,
          newStartAt,
          newEndAt
        }
      }
    })

    return duplicatedSession
  }
}
