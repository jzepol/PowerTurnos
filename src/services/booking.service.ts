import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { TokenService } from './token.service'
import { logger } from '@/lib/logger'

export class BookingService {
  // Helper function para acceder de manera segura a las reglas del plan
  private static getPlanRule(plan: any, ruleName: string): any {
    if (!plan || !plan.rules || typeof plan.rules !== 'object') {
      return null
    }
    return (plan.rules as any)[ruleName] || null
  }

  // Crear una reserva
  static async createBooking(
    data: {
      sessionId: string
      alumnoId: string
      tokenGrantId?: string
    },
    userId: string
  ) {
    // Verificar que el usuario sea el alumno o tenga permisos
    if (data.alumnoId !== userId) {
      throw new AuthError('Solo puedes reservar para tu propia cuenta', 403)
    }

    // Obtener la sesión con información completa
    const session = await prisma.classSession.findUnique({
      where: { id: data.sessionId },
      include: {
        gym: true,
        classType: true,
        room: true,
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

    // Verificar que la sesión esté programada
    if (session.status !== 'PROGRAMADA') {
      throw new AuthError('La sesión no está disponible para reservas', 400)
    }

    // Verificar que no haya una reserva existente
    const existingBooking = await prisma.booking.findUnique({
      where: {
        sessionId_alumnoId: {
          sessionId: data.sessionId,
          alumnoId: data.alumnoId
        }
      }
    })

    if (existingBooking) {
      throw new AuthError('Ya tienes una reserva para esta sesión', 400)
    }

    // Verificar capacidad
    if (session.bookings.length >= session.capacity) {
      // Agregar a lista de espera
      const waitlistPosition = await this.getNextWaitlistPosition(data.sessionId)
      
      const waitlist = await prisma.waitlist.create({
        data: {
          sessionId: data.sessionId,
          alumnoId: data.alumnoId,
          position: waitlistPosition
        }
      })

      return {
        type: 'waitlist',
        data: waitlist,
        message: 'Sesión llena, agregado a lista de espera'
      }
    }

    // Buscar el token wallet del alumno para este gimnasio
    let tokenWallet = null
    let tokenGrant = null
    
    if (data.tokenGrantId) {
      // Si se especifica un grant específico, usarlo
      tokenGrant = await prisma.tokenGrant.findUnique({
        where: { id: data.tokenGrantId }
      })

      if (!tokenGrant) {
        throw new AuthError('Concesión de tokens no encontrada', 404)
      }

      // Verificar que el token no haya expirado
      if (tokenGrant.expiresAt && tokenGrant.expiresAt < new Date()) {
        throw new AuthError('Los tokens han expirado', 400)
      }

      tokenWallet = await prisma.tokenWallet.findUnique({
        where: { id: tokenGrant.walletId }
      })
    } else {
      // Buscar automáticamente el wallet del alumno para este gimnasio
      tokenWallet = await prisma.tokenWallet.findFirst({
        where: {
          userId: data.alumnoId,
          gymId: session.gymId
        }
      })

      if (!tokenWallet) {
        throw new AuthError('No tienes tokens disponibles para este gimnasio', 400)
      }

      // Buscar un grant válido (no expirado) con tokens disponibles
      tokenGrant = await prisma.tokenGrant.findFirst({
        where: {
          walletId: tokenWallet.id,
          tokens: { gt: 0 },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { createdAt: 'asc' } // Usar el grant más antiguo primero
      })

      if (!tokenGrant) {
        throw new AuthError('No tienes tokens disponibles para hacer reservas', 400)
      }
    }

    // Verificar que el wallet tenga tokens suficientes
    if (!tokenWallet || tokenWallet.balance < 1) {
      throw new AuthError('No tienes suficientes tokens para hacer esta reserva', 400)
    }

    // Consumir tokens
    await TokenService.consumeTokens(
      tokenWallet.id,
      1,
      `Reserva para sesión ${session.classType.name}`
    )

    // Crear la reserva
    const booking = await prisma.booking.create({
      data: {
        sessionId: data.sessionId,
        alumnoId: data.alumnoId,
        status: 'RESERVADA',
        tokenGrantId: tokenGrant.id
      },
      include: {
        session: {
          include: {
            classType: true,
            room: true,
            professor: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        entity: 'Booking',
        entityId: booking.id,
        action: 'CREATE',
        diff: {
          sessionId: data.sessionId,
          alumnoId: data.alumnoId,
          tokenGrantId: data.tokenGrantId
        }
      }
    })

    return {
      type: 'booking',
      data: booking,
      message: 'Reserva creada exitosamente'
    }
  }

  // Cancelar una reserva
  static async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: {
          include: {
            classType: true,
            gym: true
          }
        },
        tokenGrant: true
      }
    })

    if (!booking) {
      throw new AuthError('Reserva no encontrada', 404)
    }

    // Verificar que el usuario sea el dueño de la reserva o tenga permisos
    if (booking.alumnoId !== userId) {
      throw new AuthError('No puedes cancelar esta reserva', 403)
    }

    // Verificar que la reserva esté activa
    if (booking.status !== 'RESERVADA') {
      throw new AuthError('La reserva no puede ser cancelada', 400)
    }

    // Verificar reglas de cancelación
    const canRefund = await this.canRefundTokens(booking, reason)
    
    // Actualizar estado de la reserva
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELADA' }
    })

    // Reembolsar tokens si es posible
    if (canRefund && booking.tokenGrantId) {
      const tokenGrant = await prisma.tokenGrant.findUnique({
        where: { id: booking.tokenGrantId }
      })

      if (tokenGrant) {
        await TokenService.refundTokens(
          tokenGrant.walletId,
          1,
          `Cancelación de reserva: ${reason || 'Sin motivo especificado'}`
        )
      }
    }

    // Promover desde lista de espera si hay cupo
    await this.promoteFromWaitlist(booking.sessionId)

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        entity: 'Booking',
        entityId: bookingId,
        action: 'CANCEL',
        diff: {
          reason,
          canRefund,
          previousStatus: 'RESERVADA',
          newStatus: 'CANCELADA'
        }
      }
    })

    return { success: true, canRefund }
  }

  // Check-in de un alumno
  static async checkin(
    sessionId: string,
    alumnoId: string,
    checkedBy: string,
    method: 'manual' | 'qr' = 'manual'
  ) {
    const booking = await prisma.booking.findUnique({
      where: {
        sessionId_alumnoId: {
          sessionId,
          alumnoId
        }
      }
    })

    if (!booking) {
      throw new AuthError('Reserva no encontrada', 404)
    }

    if (booking.status !== 'RESERVADA') {
      throw new AuthError('La reserva no puede ser marcada como asistencia', 400)
    }

    // Actualizar estado de la reserva
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'ASISTIO' }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: checkedBy,
        entity: 'Booking',
        entityId: booking.id,
        action: 'CHECKIN',
        diff: {
          method,
          previousStatus: 'RESERVADA',
          newStatus: 'ASISTIO'
        }
      }
    })

    return { success: true }
  }

  // Marcar como no-show
  static async markNoShow(
    sessionId: string,
    alumnoId: string,
    markedBy: string
  ) {
    const booking = await prisma.booking.findUnique({
      where: {
        sessionId_alumnoId: {
          sessionId,
          alumnoId
        }
      },
      include: {
        tokenGrant: true
      }
    })

    if (!booking) {
      throw new AuthError('Reserva no encontrada', 404)
    }

    if (booking.status !== 'ASISTIO') {
      throw new AuthError('Solo se puede marcar no-show a reservas con asistencia', 400)
    }

    // Actualizar estado de la reserva
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'NO_SHOW' }
    })

    // Aplicar penalización de tokens si corresponde
    if (booking.tokenGrantId) {
      const tokenGrant = await prisma.tokenGrant.findUnique({
        where: { id: booking.tokenGrantId }
      })

      if (tokenGrant) {
        // Verificar reglas del plan
        const plan = await prisma.packagePlan.findFirst({
          where: { id: tokenGrant.planId || '' }
        })

        if (plan && this.getPlanRule(plan, 'noShowPenalty')) {
          // No reembolsar tokens por no-show
          // Los tokens se pierden
        }
      }
    }

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: markedBy,
        entity: 'Booking',
        entityId: booking.id,
        action: 'NO_SHOW',
        diff: {
          previousStatus: 'ASISTIO',
          newStatus: 'NO_SHOW'
        }
      }
    })

    return { success: true }
  }

  // Obtener reservas de un usuario
  static async getUserBookings(
    userId: string,
    filters?: {
      status?: string
      startDate?: string
      endDate?: string
      gymId?: string
    }
  ) {
    const where: any = {
      alumnoId: userId
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.gymId) {
      where.session = {
        gymId: filters.gymId
      }
    }

    if (filters?.startDate || filters?.endDate) {
      where.session = {
        ...where.session,
        startAt: {}
      }

      if (filters.startDate) {
        where.session.startAt.gte = new Date(filters.startDate)
      }

      if (filters.endDate) {
        where.session.startAt.lte = new Date(filters.endDate)
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        session: {
          include: {
            classType: true,
            room: {
              include: {
                location: true
              }
            },
            professor: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        session: {
          startAt: 'asc'
        }
      }
    })

    return bookings
  }

  // Obtener reservas de una sesión
  static async getSessionBookings(sessionId: string) {
    const bookings = await prisma.booking.findMany({
      where: { sessionId },
      include: {
        alumno: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return bookings
  }

  // Verificar si se pueden reembolsar tokens
  static async canRefundTokens(
    booking: any,
    reason?: string
  ): Promise<boolean> {
    if (!booking.tokenGrantId) {
      return false
    }

    const tokenGrant = await prisma.tokenGrant.findUnique({
      where: { id: booking.tokenGrantId },
      include: { plan: true }
    })

    if (!tokenGrant || !tokenGrant.plan) {
      return false
    }

    const plan = tokenGrant.plan
    const sessionStart = new Date(booking.session.startAt)
    const now = new Date()
    const hoursUntilSession = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Verificar reglas de cancelación
    const cancelBeforeHours = this.getPlanRule(plan, 'cancelBeforeHours')
    if (cancelBeforeHours && hoursUntilSession < cancelBeforeHours) {
      return false
    }

    return true
  }

  // Promover desde lista de espera
  static async promoteFromWaitlist(sessionId: string) {
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

    if (!session) return

    const availableSpots = session.capacity - session.bookings.length

    if (availableSpots <= 0) return

    // Obtener próximos en lista de espera
    const waitlist = await prisma.waitlist.findMany({
      where: { sessionId },
      orderBy: { position: 'asc' },
      take: availableSpots
    })

    for (const waitlistEntry of waitlist) {
      // Crear reserva automáticamente
      await this.createBooking({
        sessionId,
        alumnoId: waitlistEntry.alumnoId
      }, waitlistEntry.alumnoId)

      // Eliminar de lista de espera
      await prisma.waitlist.delete({
        where: { id: waitlistEntry.id }
      })

      // Notificar al usuario (implementar en el futuro)
      logger.debug('Usuario ${waitlistEntry.alumnoId} promovido desde lista de espera', );
    }
  }

  // Obtener posición en lista de espera
  static async getNextWaitlistPosition(sessionId: string): Promise<number> {
    const lastPosition = await prisma.waitlist.findFirst({
      where: { sessionId },
      orderBy: { position: 'desc' }
    })

    return (lastPosition?.position || 0) + 1
  }

  // Obtener estadísticas de reservas
  static async getBookingStats(gymId: string, startDate: Date, endDate: Date) {
    const stats = await prisma.booking.groupBy({
      by: ['status'],
      where: {
        session: {
          gymId,
          startAt: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      _count: {
        id: true
      }
    })

    return stats
  }
}
