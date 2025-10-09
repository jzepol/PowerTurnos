import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'

// Obtener ubicaciones
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gymId')

    const where: any = {}
    if (gymId) {
      where.gymId = gymId
    }

    const locations = await prisma.location.findMany({
      where,
      include: {
        gym: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: locations,
      message: 'Ubicaciones obtenidas exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener ubicaciones:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Crear ubicación (solo ADMIN y PROFESOR)
export const POST = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { name, address, gymId } = body

    if (!name || !gymId) {
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
        { success: false, error: 'No tienes permisos para crear ubicaciones en este gimnasio' },
        { status: 403 }
      )
    }

    const location = await prisma.location.create({
      data: {
        name,
        address,
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

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        gymId,
        entity: 'Location',
        entityId: location.id,
        action: 'CREATE',
        diff: {
          name,
          address,
          gymId
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: location,
      message: 'Ubicación creada exitosamente'
    })
  } catch (error) {
    console.error('Error al crear ubicación:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
