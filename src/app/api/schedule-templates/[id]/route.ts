import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'

// Obtener una plantilla específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (request: NextRequest, user: any) => {
    try {
      // Validar rol
      if (!['ADMIN', 'PROFESOR'].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: 'No tienes permisos para acceder a esta funcionalidad' },
          { status: 403 }
        )
      }

      const templateId = (await params).id

      const template = await prisma.scheduleTemplate.findUnique({
      where: { id: templateId },
      include: {
        gym: {
          select: {
            id: true,
            name: true
          }
        },
        room: {
          include: {
            location: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        classType: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    // Verificar permisos
    if (user.role === 'PROFESOR' && template.profId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para acceder a esta plantilla' },
        { status: 403 }
      )
    }

      return NextResponse.json({
        success: true,
        data: template,
        message: 'Plantilla obtenida exitosamente'
      })
    } catch (error) {
      console.error('Error al obtener plantilla:', error)
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })(request)
}

// Actualizar una plantilla
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (request: NextRequest, user: any) => {
    try {
      // Validar rol
      if (!['ADMIN', 'PROFESOR'].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: 'No tienes permisos para acceder a esta funcionalidad' },
          { status: 403 }
        )
      }

      const templateId = (await params).id
      const body = await request.json()

    const { 
      roomId, 
      classTypeId, 
      daysOfWeek, 
      startTime, 
      durationMin, 
      capacity,
      active 
    } = body

    // Obtener la plantilla actual
    const existingTemplate = await prisma.scheduleTemplate.findUnique({
      where: { id: templateId },
      include: {
        gym: true
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    // Verificar permisos
    if (user.role === 'PROFESOR' && existingTemplate.profId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para editar esta plantilla' },
        { status: 403 }
      )
    }

    // Verificar que el usuario tenga acceso al gimnasio
    const membership = await prisma.gymMember.findFirst({
      where: {
        userId: user.id,
        gymId: existingTemplate.gymId,
        roleInGym: {
          in: ['ADMIN', 'PROFESOR']
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para editar plantillas en este gimnasio' },
        { status: 403 }
      )
    }

    // Actualizar la plantilla
    const updatedTemplate = await prisma.scheduleTemplate.update({
      where: { id: templateId },
      data: {
        roomId,
        classTypeId,
        daysOfWeek,
        startTime,
        durationMin,
        capacity,
        active: active !== undefined ? active : true
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true
          }
        },
        room: {
          include: {
            location: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        classType: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        gymId: existingTemplate.gymId,
        entity: 'ScheduleTemplate',
        entityId: templateId,
        action: 'UPDATE',
        diff: {
          roomId,
          classTypeId,
          daysOfWeek,
          startTime,
          durationMin,
          capacity,
          active
        }
      }
    })

      return NextResponse.json({
        success: true,
        data: updatedTemplate,
        message: 'Plantilla actualizada exitosamente'
      })
    } catch (error) {
      console.error('Error al actualizar plantilla:', error)
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })(request)
}

// Eliminar una plantilla
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (request: NextRequest, user: any) => {
    try {
      // Validar rol
      if (!['ADMIN', 'PROFESOR'].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: 'No tienes permisos para acceder a esta funcionalidad' },
          { status: 403 }
        )
      }

      const templateId = (await params).id

      // Obtener la plantilla actual
    const existingTemplate = await prisma.scheduleTemplate.findUnique({
      where: { id: templateId },
      include: {
        gym: true
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    // Verificar permisos
    if (user.role === 'PROFESOR' && existingTemplate.profId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para eliminar esta plantilla' },
        { status: 403 }
      )
    }

    // Verificar que el usuario tenga acceso al gimnasio
    const membership = await prisma.gymMember.findFirst({
      where: {
        userId: user.id,
        gymId: existingTemplate.gymId,
        roleInGym: {
          in: ['ADMIN', 'PROFESOR']
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para eliminar plantillas en este gimnasio' },
        { status: 403 }
      )
    }

    // Eliminar la plantilla
    await prisma.scheduleTemplate.delete({
      where: { id: templateId }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        gymId: existingTemplate.gymId,
        entity: 'ScheduleTemplate',
        entityId: templateId,
        action: 'DELETE',
        diff: {
          deletedTemplate: existingTemplate
        }
      }
    })

      return NextResponse.json({
        success: true,
        message: 'Plantilla eliminada exitosamente'
      })
    } catch (error) {
      console.error('Error al eliminar plantilla:', error)
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })(request)
}
