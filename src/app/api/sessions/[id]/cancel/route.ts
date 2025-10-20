import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Cancelar clase (solo PROFESOR)
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Verificar que sea profesor
    if (user.role !== 'PROFESOR') {
      return NextResponse.json(
        { success: false, error: 'Solo los profesores pueden cancelar clases' },
        { status: 403 }
      )
    }

    // Extraer el ID de la sesión de la ruta dinámica
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const sessionId = pathParts[pathParts.length - 2] // [id] está antes de 'cancel'

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere ID de sesión' },
        { status: 400 }
      )
    }

    logger.debug('🚀 API Cancelar Clase - INICIANDO POST')
    logger.debug('🆔 API Cancelar Clase - Session ID:', { sessionId })
    logger.debug('👤 API Cancelar Clase - Usuario:', { userId: user.id, role: user.role })

    // Verificar que la sesión existe y pertenece al profesor
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
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
      logger.debug('❌ API Cancelar Clase - Sesión no encontrada', );
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 404 }
      )
    }

    if (session.profId !== user.id) {
      logger.debug('❌ API Cancelar Clase - No tiene permisos para cancelar esta clase', );
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para cancelar esta clase' },
        { status: 403 }
      )
    }

    if (session.status !== 'PROGRAMADA') {
      logger.debug('❌ API Cancelar Clase - Solo se pueden cancelar clases programadas', );
      return NextResponse.json(
        { success: false, error: 'Solo se pueden cancelar clases programadas' },
        { status: 400 }
      )
    }

    logger.debug('✅ API Cancelar Clase - Permisos verificados, procediendo con cancelación')
    logger.debug('📊 API Cancelar Clase - Reservas activas encontradas:', { count: session.bookings.length })

    // Iniciar transacción para cancelar la clase y reembolsar tokens
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cancelar la sesión
      const updatedSession = await tx.classSession.update({
        where: { id: sessionId },
        data: { status: 'CANCELADA' }
      })

      logger.debug('✅ API Cancelar Clase - Sesión cancelada:', updatedSession.id);

      // 2. Cancelar todas las reservas activas
      const updatedBookings = await tx.booking.updateMany({
        where: { 
          sessionId,
          status: 'RESERVADA'
        },
        data: { status: 'CANCELADA' }
      })

      logger.debug('✅ API Cancelar Clase - Reservas canceladas:', updatedBookings.count);

      // 3. Reembolsar tokens a todos los alumnos
      const refundPromises = session.bookings.map(async (booking) => {
        const wallet = await tx.tokenWallet.findFirst({
          where: {
            userId: booking.alumno.id,
            gymId: session.gymId
          }
        })

        if (wallet) {
          await tx.tokenWallet.update({
            where: { id: wallet.id },
            data: {
              balance: {
                increment: 1
              }
            }
          })
          logger.debug('💰 API Cancelar Clase - Token reembolsado a:', booking.alumno.name);
        } else {
          logger.debug('⚠️ API Cancelar Clase - No se encontró wallet para:', booking.alumno.name);
        }
      })

      await Promise.all(refundPromises)

      return {
        session: updatedSession,
        bookingsCancelled: updatedBookings.count,
        studentsNotified: session.bookings.length
      }
    })

    logger.debug('🎉 API Cancelar Clase - Proceso completado exitosamente', );
    logger.debug('📊 API Cancelar Clase - Resumen:', result);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Clase cancelada exitosamente. ${result.bookingsCancelled} reservas canceladas y tokens reembolsados.`
    })

  } catch (error: any) {
    console.error('💥 API Cancelar Clase - Error durante el proceso:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
