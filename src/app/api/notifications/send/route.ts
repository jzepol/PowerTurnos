import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Enviar notificaciones (solo PROFESOR)
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Verificar que sea profesor
    if (user.role !== 'PROFESOR') {
      return NextResponse.json(
        { success: false, error: 'Solo los profesores pueden enviar notificaciones' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { sessionId, message, type } = body

    if (!sessionId || !message || !type) {
      return NextResponse.json(
        { success: false, error: 'Se requiere sessionId, message y type' },
        { status: 400 }
      )
    }

    logger.debug('🚀 API Notificaciones - INICIANDO POST')
    logger.debug('🆔 API Notificaciones - Session ID:', { sessionId })
    logger.debug('💬 API Notificaciones - Mensaje:', { message })
    logger.debug('📝 API Notificaciones - Tipo:', { type })
    logger.debug('👤 API Notificaciones - Usuario:', { userId: user.id, role: user.role })

    // Verificar que la sesión existe y pertenece al profesor
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        classType: true,
        room: {
          include: {
            location: true
          }
        },
        bookings: {
          where: { status: 'RESERVADA' },
          include: {
            alumno: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!session) {
      logger.debug('❌ API Notificaciones - Sesión no encontrada', );
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 404 }
      )
    }

    if (session.profId !== user.id) {
      logger.debug('❌ API Notificaciones - No tiene permisos para esta sesión', );
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para esta sesión' },
        { status: 403 }
      )
    }

    logger.debug('✅ API Notificaciones - Permisos verificados', );
    logger.debug('📊 API Notificaciones - Alumnos a notificar:', session.bookings.length);

    // Crear notificaciones para todos los alumnos reservados
    const notificationPromises = session.bookings.map(async (booking) => {
      const notification = await prisma.notification.create({
        data: {
          userId: booking.alumno.id,
          title: `Notificación de ${session.classType.name}`,
          message: message,
          type: type,
          metadata: {
            sessionId: session.id,
            className: session.classType.name,
            roomName: session.room.name,
            locationName: session.room.location.name,
            startAt: session.startAt,
            endAt: session.endAt
          },
          isRead: false
        }
      })

      logger.debug('📨 API Notificaciones - Notificación creada para:', booking.alumno.name);
      return notification
    })

    const notifications = await Promise.all(notificationPromises)

    logger.debug('🎉 API Notificaciones - Proceso completado exitosamente', );
    logger.debug('📊 API Notificaciones - Notificaciones enviadas:', notifications.length);

    return NextResponse.json({
      success: true,
      data: {
        notificationsSent: notifications.length,
        studentsNotified: session.bookings.length,
        sessionInfo: {
          className: session.classType.name,
          room: session.room.name,
          location: session.room.location.name,
          startAt: session.startAt
        }
      },
      message: `${notifications.length} notificaciones enviadas exitosamente a los alumnos reservados.`
    })

  } catch (error: any) {
    console.error('💥 API Notificaciones - Error durante el proceso:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
