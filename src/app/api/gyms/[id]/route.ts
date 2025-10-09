import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Obtener gimnasio específico
export const GET = withAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const gym = await prisma.gym.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        locations: {
          include: {
            rooms: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            locations: true,
            sessions: true
          }
        }
      }
    })

    if (!gym) {
      return NextResponse.json(
        { success: false, error: 'Gimnasio no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: gym,
      message: 'Gimnasio obtenido exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener gimnasio:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Actualizar gimnasio (solo ADMIN del gym)
export const PUT = withRole(['ADMIN'])(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const body = await request.json()
    const { name, timezone, holidays } = body

    // Verificar que el usuario sea admin del gimnasio
    const membership = await prisma.gymMember.findFirst({
      where: {
        userId: user.id,
        gymId: params.id,
        roleInGym: 'ADMIN'
      }
    })

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para editar este gimnasio' },
        { status: 403 }
      )
    }

    const updatedGym = await prisma.gym.update({
      where: { id: params.id },
      data: {
        name,
        timezone,
        holidays: holidays || []
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

    return NextResponse.json({
      success: true,
      data: updatedGym,
      message: 'Gimnasio actualizado exitosamente'
    })
  } catch (error) {
    console.error('Error al actualizar gimnasio:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Eliminar gimnasio (solo ADMIN del gym)
export const DELETE = withRole(['ADMIN'])(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    // Verificar que el usuario sea admin del gimnasio
    const membership = await prisma.gymMember.findFirst({
      where: {
        userId: user.id,
        gymId: params.id,
        roleInGym: 'ADMIN'
      }
    })

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para eliminar este gimnasio' },
        { status: 403 }
      )
    }

    // Verificar que no haya sesiones activas
    const activeSessions = await prisma.classSession.findFirst({
      where: {
        gymId: params.id,
        status: {
          in: ['PROGRAMADA', 'EN_CURSO']
        }
      }
    })

    if (activeSessions) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar un gimnasio con sesiones activas' },
        { status: 400 }
      )
    }

    // Eliminar en cascada (Prisma se encarga de las relaciones)
    await prisma.gym.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Gimnasio eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error al eliminar gimnasio:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
