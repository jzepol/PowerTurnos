import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Cancelar reserva (ALUMNO) - Método PATCH para actualizar estado
export const PATCH = withAuth(async (request: NextRequest, user: any) => {
  try {
    logger.debug('🚀 API Cancelar Reserva - INICIANDO PATCH', );
    logger.debug('🔍 API Cancelar Reserva - URL completa:', request.url);
    
    // Extraer el ID de la ruta dinámica [id]
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const bookingId = pathParts[pathParts.length - 1]
    
    logger.debug('🔗 API Cancelar Reserva - Path parts:', pathParts);
    logger.debug('🆔 API Cancelar Reserva - Booking ID extraído de la ruta:', bookingId);
    
    const body = await request.json()
    logger.debug('📦 API Cancelar Reserva - Body recibido:', body);

    if (!bookingId) {
      logger.debug('❌ API Cancelar Reserva - Error: No se encontró bookingId', );
      return NextResponse.json(
        { success: false, error: 'Se requiere bookingId' },
        { status: 400 }
      )
    }

    logger.debug('✅ API Cancelar Reserva - Datos recibidos:', { bookingId, body, userId: user.id })

    // Verificar que la reserva existe y pertenece al usuario
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: true
      }
    })

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Reserva no encontrada' },
        { status: 404 }
      )
    }

    if (booking.alumnoId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para cancelar esta reserva' },
        { status: 403 }
      )
    }

    if (booking.status !== 'RESERVADA') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden cancelar reservas activas' },
        { status: 400 }
      )
    }

    logger.debug('🔄 API Cancelar Reserva - Actualizando reserva en la base de datos...', );
    
    // Actualizar la reserva con el nuevo estado
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        status: body.status || 'CANCELADA'
      }
    })

    logger.debug('✅ API Cancelar Reserva - Reserva actualizada exitosamente:', updatedBooking);

    // Reembolsar token al wallet si se cancela
    if (body.status === 'CANCELADA') {
      logger.debug('💰 API Cancelar Reserva - Procesando reembolso de token...', );
      logger.debug('🏟️ API Cancelar Reserva - Gym ID de la sesión:', booking.session.gymId);
      
      const wallet = await prisma.tokenWallet.findFirst({
        where: {
          userId: user.id,
          gymId: booking.session.gymId
        }
      })

      logger.debug('💳 API Cancelar Reserva - Wallet encontrado:', wallet);

      if (wallet) {
        logger.debug('💸 API Cancelar Reserva - Actualizando balance del wallet...', );
        await prisma.tokenWallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: 1
            }
          }
        })
        logger.debug('✅ API Cancelar Reserva - Token reembolsado exitosamente al wallet:', wallet.id);
      } else {
        logger.debug('⚠️ API Cancelar Reserva - No se encontró wallet para reembolso', );
      }
    } else {
      logger.debug('ℹ️ API Cancelar Reserva - No es cancelación, no se procesa reembolso')
    }

    logger.debug('🎉 API Cancelar Reserva - Proceso completado exitosamente', );
    
    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Reserva cancelada exitosamente'
    })
  } catch (error: any) {
    console.error('💥 API Cancelar Reserva - Error durante el proceso:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Mantener DELETE como método alternativo
export const DELETE = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('id')

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere bookingId' },
        { status: 400 }
      )
    }

    // Verificar que la reserva existe y pertenece al usuario
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: true
      }
    })

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Reserva no encontrada' },
        { status: 404 }
      )
    }

    if (booking.alumnoId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para cancelar esta reserva' },
        { status: 403 }
      )
    }

    if (booking.status !== 'RESERVADA') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden cancelar reservas activas' },
        { status: 400 }
      )
    }

    // Cancelar la reserva
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELADA' }
    })

    // Reembolsar token al wallet
    const wallet = await prisma.tokenWallet.findFirst({
      where: {
        userId: user.id,
        gymId: booking.session.gymId
        }
      })

    if (wallet) {
      await prisma.tokenWallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: 1
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Reserva cancelada exitosamente'
    })
  } catch (error: any) {
    console.error('💥 API Cancelar Reserva - Error durante el proceso:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
