import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'

// Obtener planes de paquetes
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gymId')
    const active = searchParams.get('active')

    const where: any = {}
    if (gymId) {
      where.gymId = gymId
    }
    if (active !== null) {
      where.isActive = active === 'true'
    }

    const plans = await prisma.packagePlan.findMany({
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
      data: plans,
      message: 'Planes de paquetes obtenidos exitosamente'
    })
  } catch (error) {
    console.error('Error al obtener planes de paquetes:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Crear plan de paquete (solo ADMIN y PROFESOR)
export const POST = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { 
      gymId, 
      name, 
      tokens, 
      validityDays, 
      price, 
      rules 
    } = body

    if (!gymId || !name || !tokens || !validityDays || !price) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga acceso al gimnasio
    const membership = await prisma.gymMember.findFirst({
      where: {
        userId: user.id,
        gymId,
        roleInGym: {
          in: ['ADMIN', 'PROFESOR']
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para crear planes en este gimnasio' },
        { status: 403 }
      )
    }

    // Validar reglas por defecto si no se proporcionan
    const defaultRules = {
      cancelBeforeHours: 24,
      noShowPenalty: true,
      transferable: false,
      ...rules
    }

    const plan = await prisma.packagePlan.create({
      data: {
        gymId,
        name,
        tokens,
        validityDays,
        price,
        rules: defaultRules,
        isActive: true
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
        entity: 'PackagePlan',
        entityId: plan.id,
        action: 'CREATE',
        diff: {
          name,
          tokens,
          validityDays,
          price,
          rules: defaultRules
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: plan,
      message: 'Plan de paquete creado exitosamente'
    })
  } catch (error) {
    console.error('Error al crear plan de paquete:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
