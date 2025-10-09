import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'

// Obtener plantillas de horario
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gymId')
    const profId = searchParams.get('profId')

    const where: any = {}
    if (gymId) {
      where.gymId = gymId
    }
    
    // Si es profesor, solo mostrar sus propias plantillas
    if (user.role === 'PROFESOR') {
      where.profId = user.id
    } else if (profId) {
      where.profId = profId
    }

    const templates = await prisma.scheduleTemplate.findMany({
      where,
      include: {
        gym: {
          select: {
            id: true,
            name: true
          }
        },
        room: {
          include: {
            location: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        classType: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: templates,
      message: 'Plantillas de horario obtenidas exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener plantillas de horario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Crear plantilla de horario (solo ADMIN y PROFESOR)
export const POST = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { 
      gymId, 
      profId, 
      roomId, 
      classTypeId, 
      daysOfWeek, 
      startTime, 
      durationMin, 
      capacity 
    } = body

    if (!gymId || !profId || !roomId || !classTypeId || !daysOfWeek || !startTime || !durationMin || !capacity) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga acceso al gimnasio
    let membership = await prisma.gymMember.findFirst({
      where: {
        userId: user.id,
        gymId,
        roleInGym: {
          in: ['ADMIN', 'PROFESOR']
        }
      }
    })

    // Si no tiene membresía, crearla automáticamente para profesores
    if (!membership && user.role === 'PROFESOR') {
      membership = await prisma.gymMember.create({
        data: {
          userId: user.id,
          gymId,
          roleInGym: 'PROFESOR',
          isActive: true
        }
      })
    }

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para crear plantillas en este gimnasio' },
        { status: 403 }
      )
    }

    // Si es profesor, verificar que solo pueda crear plantillas para sí mismo
    if (user.role === 'PROFESOR' && profId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Solo puedes crear plantillas para ti mismo' },
        { status: 403 }
      )
    }

    const template = await prisma.scheduleTemplate.create({
      data: {
        gymId,
        profId,
        roomId,
        classTypeId,
        daysOfWeek,
        startTime,
        durationMin,
        capacity,
        active: true
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true
          }
        },
        room: {
          include: {
            location: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        classType: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        gymId,
        entity: 'ScheduleTemplate',
        entityId: template.id,
        action: 'CREATE',
        diff: {
          gymId,
          profId,
          roomId,
          classTypeId,
          daysOfWeek,
          startTime,
          durationMin,
          capacity
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Plantilla de horario creada exitosamente'
    })
  } catch (error) {
    console.error('Error al crear plantilla de horario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
