import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Obtener tipos de clases
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gymId')

    const where: any = {}
    if (gymId) {
      where.gymId = gymId
    }

    const classTypes = await prisma.classType.findMany({
      where,
      include: {
        gym: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            sessions: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: classTypes,
      message: 'Tipos de clase obtenidos exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener tipos de clase:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Crear tipo de clase (solo ADMIN y PROFESOR)
export const POST = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { name, color, durationMin, gymId } = body

    if (!name || !color || !durationMin || !gymId) {
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
        { success: false, error: 'No tienes permisos para crear tipos de clase en este gimnasio' },
        { status: 403 }
      )
    }

    const classType = await prisma.classType.create({
      data: {
        name,
        color,
        durationMin,
        gymId
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: classType,
      message: 'Tipo de clase creado exitosamente'
    })
  } catch (error) {
    console.error('Error al crear tipo de clase:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
