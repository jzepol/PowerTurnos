import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Obtener mis reservas (ALUMNO)
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        alumnoId: user.id
      },
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
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: bookings,
      message: 'Reservas obtenidas exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener reservas:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Crear reserva (ALUMNO)
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere sessionId' },
        { status: 400 }
      )
    }

    // Verificar que la sesión existe y está disponible
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
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 404 }
      )
    }

    if (session.status !== 'PROGRAMADA') {
      return NextResponse.json(
        { success: false, error: 'La sesión no está disponible para reservas' },
        { status: 400 }
      )
    }

    // Verificar disponibilidad
    const availableSpots = session.capacity - session.bookings.length
    if (availableSpots <= 0) {
      return NextResponse.json(
        { success: false, error: 'No hay cupos disponibles' },
        { status: 400 }
      )
    }

    // Verificar que el usuario no tenga ya una reserva para esta sesión
    const existingBooking = await prisma.booking.findUnique({
      where: {
        sessionId_alumnoId: {
          sessionId,
          alumnoId: user.id
        }
      }
    })

    if (existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Ya tienes una reserva para esta sesión' },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga tokens disponibles
    const wallet = await prisma.tokenWallet.findFirst({
      where: {
        userId: user.id,
        gymId: session.gymId
      }
    })

    if (!wallet || wallet.balance < 1) {
      return NextResponse.json(
        { success: false, error: 'No tienes tokens suficientes para reservar esta clase' },
        { status: 400 }
      )
    }

    // Crear la reserva
    const booking = await prisma.booking.create({
      data: {
        sessionId,
        alumnoId: user.id,
        status: 'RESERVADA'
      },
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
      }
    })

    // Descontar token del wallet
    await prisma.tokenWallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: 1
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: { booking },
      message: 'Reserva creada exitosamente'
    })
  } catch (error) {
    console.error('Error al crear reserva:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
