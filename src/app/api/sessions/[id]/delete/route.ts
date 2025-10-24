import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Eliminar clase permanentemente (solo si no tiene reservas)
export const DELETE = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Verificar que sea profesor o admin
    if (!['PROFESOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Solo los profesores y administradores pueden eliminar clases' },
        { status: 403 }
      )
    }

    // Extraer el ID de la sesión de la ruta dinámica
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const sessionId = pathParts[pathParts.length - 2] // [id] está antes de 'delete'

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere ID de sesión' },
        { status: 400 }
      )
    }

    logger.debug('🗑️ API Eliminar Clase - INICIANDO DELETE')
    logger.debug('🆔 API Eliminar Clase - Session ID:', { sessionId })
    logger.debug('👤 API Eliminar Clase - Usuario:', { userId: user.id, role: user.role })

    // Verificar que la sesión existe
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        bookings: true,
        gym: true
      }
    })

    if (!session) {
      logger.debug('❌ API Eliminar Clase - Sesión no encontrada')
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 404 }
      )
    }

    // Verificar permisos: si es profesor, solo puede eliminar sus propias clases
    if (user.role === 'PROFESOR' && session.profId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Solo puedes eliminar tus propias clases' },
        { status: 403 }
      )
    }

    // Verificar que no tenga reservas activas
    const activeBookings = session.bookings.filter(booking => 
      ['RESERVADA', 'ASISTIO'].includes(booking.status)
    )

    if (activeBookings.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede eliminar la clase porque tiene ${activeBookings.length} reserva(s) activa(s). Cancela las reservas primero.` 
        },
        { status: 400 }
      )
    }

    // Eliminar la sesión
    await prisma.classSession.delete({
      where: { id: sessionId }
    })

    logger.debug('✅ API Eliminar Clase - Sesión eliminada exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Clase eliminada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al eliminar clase:', error)
    logger.debug('❌ API Eliminar Clase - Error:', error.message)
    
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
