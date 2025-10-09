import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'

export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const gyms = await prisma.gym.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            members: true,
            locations: true,
            sessions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: gyms,
      message: 'Gimnasios obtenidos exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener gimnasios:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Crear gimnasio (solo ADMIN)
export const POST = withRole(['ADMIN'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { name, timezone, ownerId } = body

    if (!name || !timezone || !ownerId) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    const gym = await prisma.gym.create({
      data: {
        name,
        timezone,
        ownerId,
        holidays: []
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Crear membresía del dueño
    await prisma.gymMember.create({
      data: {
        userId: ownerId,
        gymId: gym.id,
        roleInGym: 'ADMIN'
      }
    })

    return NextResponse.json({
      success: true,
      data: gym,
      message: 'Gimnasio creado exitosamente'
    })
  } catch (error) {
    console.error('Error al crear gimnasio:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
