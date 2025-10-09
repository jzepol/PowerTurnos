import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Obtener usuario específico
export const GET = withRole(['ADMIN'])(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const userData = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        gymMemberships: {
          include: {
            gym: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            gymMemberships: true,
            bookings: true
          }
        }
      }
    })

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: userData,
      message: 'Usuario obtenido exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Actualizar usuario (solo ADMIN)
export const PUT = withRole(['ADMIN'])(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const body = await request.json()
    const { name, email, role, status, password } = body

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el email no exista en otro usuario
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: params.id }
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'El email ya está registrado por otro usuario' },
        { status: 400 }
      )
    }

    const updateData: any = {
      name,
      email,
      role,
      status: status || 'ACTIVE'
    }

    // Solo actualizar password si se proporciona
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Usuario actualizado exitosamente'
    })
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Eliminar usuario (solo ADMIN)
export const DELETE = withRole(['ADMIN'])(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    // Verificar que no se elimine a sí mismo
    if (params.id === user.id) {
      return NextResponse.json(
        { success: false, error: 'No puedes eliminar tu propia cuenta' },
        { status: 400 }
      )
    }

    // Verificar que no haya reservas activas
    const activeBookings = await prisma.booking.findFirst({
      where: {
        alumnoId: params.id,
        status: {
          in: ['RESERVADA', 'ASISTIO']
        }
      }
    })

    if (activeBookings) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar un usuario con reservas activas' },
        { status: 400 }
      )
    }

    // Verificar que no sea el único admin del sistema
    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'No se puede eliminar el último administrador del sistema' },
          { status: 400 }
        )
      }
    }

    // Eliminar usuario (Prisma se encarga de las relaciones)
    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
