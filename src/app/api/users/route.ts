import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Obtener usuarios sin gimnasio asignado (solo ADMIN)
export const GET = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gymId')
    const unassigned = searchParams.get('unassigned') === 'true'
    
    // Si es profesor, solo puede ver usuarios de su gimnasio
    if (user.role === 'PROFESOR' && !gymId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere gymId para profesores' },
        { status: 400 }
      )
    }

    // Construir filtros según el rol
    let whereClause: any = {}
    
    if (user.role === 'PROFESOR') {
      // Profesor solo ve usuarios de su gimnasio
      if (!gymId) {
        return NextResponse.json(
          { success: false, error: 'Se requiere gymId para profesores' },
          { status: 400 }
        )
      }
      
      whereClause = {
        gymMemberships: {
          some: {
            gymId: gymId,
            roleInGym: 'ALUMNO' // Solo ve alumnos
          }
        }
      }
    } else if (user.role === 'ADMIN' && unassigned) {
      // Admin busca usuarios sin gimnasio asignado
      whereClause = {
        gymMemberships: {
          none: {} // No tiene membresías
        }
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        gymMemberships: {
          where: gymId ? { gymId } : {},
          select: {
            roleInGym: true,
            isActive: true,
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
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: users,
      message: 'Usuarios obtenidos exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Crear usuario (ADMIN y PROFESOR)
export const POST = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { name, email, password, role, gymId } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Si es profesor, solo puede crear alumnos
    if (user.role === 'PROFESOR' && role !== 'ALUMNO') {
      return NextResponse.json(
        { success: false, error: 'Los profesores solo pueden crear alumnos' },
        { status: 403 }
      )
    }

    // Verificar que el email no exista
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 12),
        role,
        status: 'ACTIVE'
      }
    })

    // Si se especifica un gimnasio, crear membresía
    if (gymId) {
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
            { success: false, error: 'No tienes permisos para crear usuarios en este gimnasio' },
            { status: 403 }
          )
        }
      }

      await prisma.gymMember.create({
        data: {
          userId: newUser.id,
          gymId,
          roleInGym: role === 'ADMIN' ? 'ADMIN' : role === 'PROFESOR' ? 'PROFESOR' : 'ALUMNO'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: { user: newUser },
      message: 'Usuario creado exitosamente'
    })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
