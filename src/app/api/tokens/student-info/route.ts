import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Obtener información de tokens de un alumno (PROFESOR y ADMIN)
export const GET = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const gymId = searchParams.get('gymId')

    if (!userId || !gymId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere userId y gymId' },
        { status: 400 }
      )
    }

    // Verificar que el profesor tenga acceso al gimnasio
    if (user.role === 'PROFESOR') {
      const membership = await prisma.gymMember.findFirst({
        where: {
          userId: user.id,
          gymId,
          roleInGym: 'PROFESOR'
        }
      })

      if (!membership) {
        return NextResponse.json(
          { success: false, error: 'No tienes permisos para ver información de este gimnasio' },
          { status: 403 }
        )
      }
    }

    // Obtener wallet de tokens
    const wallet = await prisma.tokenWallet.findUnique({
      where: {
        userId_gymId: {
          userId,
          gymId
        }
      },
      include: {
        grants: {
          where: {
            expiresAt: {
              gte: new Date()
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet de tokens no encontrado' },
        { status: 404 }
      )
    }

    // Obtener historial de reservas
    const bookings = await prisma.booking.findMany({
      where: {
        alumnoId: userId,
        session: {
          gymId
        }
      },
      include: {
        session: {
          include: {
            classType: true,
            room: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    return NextResponse.json({
      success: true,
      data: {
        wallet,
        recentBookings: bookings
      },
      message: 'Información de tokens obtenida exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener información de tokens:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
