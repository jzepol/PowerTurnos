import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'

// Obtener salas
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const gymId = searchParams.get('gymId')

    const where: any = {}
    if (locationId) {
      where.locationId = locationId
    }
    if (gymId) {
      where.location = { gymId }
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            gym: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: rooms,
      message: 'Salas obtenidas exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener salas:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Crear sala (solo ADMIN y PROFESOR)
export const POST = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { name, capacity, locationId } = body

    if (!name || !capacity || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga acceso al gimnasio
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        gym: {
          select: {
            id: true
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Ubicación no encontrada' },
        { status: 404 }
      )
    }

    let membership = await prisma.gymMember.findFirst({
      where: {
        userId: user.id,
        gymId: location.gym.id,
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
          gymId: location.gym.id,
          roleInGym: 'PROFESOR',
          isActive: true
        }
      })
    }

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para crear salas en este gimnasio' },
        { status: 403 }
      )
    }

    const room = await prisma.room.create({
      data: {
        name,
        capacity,
        locationId
      },
      include: {
        location: {
          include: {
            gym: {
              select: {
                id: true,
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
        actorId: user.id,
        gymId: location.gym.id,
        entity: 'Room',
        entityId: room.id,
        action: 'CREATE',
        diff: {
          name,
          capacity,
          locationId
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: room,
      message: 'Sala creada exitosamente'
    })
  } catch (error) {
    console.error('Error al crear sala:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
