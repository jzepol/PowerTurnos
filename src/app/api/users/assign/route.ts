import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Asignar usuario a gimnasio (solo ADMIN)
export const POST = withRole(['ADMIN'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { userId, gymId, roleInGym } = body

    if (!userId || !gymId || !roleInGym) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el gimnasio existe
    const existingGym = await prisma.gym.findUnique({
      where: { id: gymId }
    })

    if (!existingGym) {
      return NextResponse.json(
        { success: false, error: 'Gimnasio no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que no existe ya una membresía
    const existingMembership = await prisma.gymMember.findUnique({
      where: {
        userId_gymId: {
          userId,
          gymId
        }
      }
    })

    if (existingMembership) {
      return NextResponse.json(
        { success: false, error: 'El usuario ya está asignado a este gimnasio' },
        { status: 400 }
      )
    }

    // Crear membresía
    const membership = await prisma.gymMember.create({
      data: {
        userId,
        gymId,
        roleInGym,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        gym: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Crear wallet de tokens si es alumno
    if (roleInGym === 'ALUMNO') {
      await prisma.tokenWallet.create({
        data: {
          userId,
          gymId,
          balance: 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: { membership },
      message: 'Usuario asignado al gimnasio exitosamente'
    })
  } catch (error) {
    console.error('Error al asignar usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
