import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/auth'
import { BookingService } from '@/services/booking.service'
import { AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Crear una reserva (solo ALUMNO)
export const POST = withRole(['ALUMNO'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const result = await BookingService.createBooking(body, user.id)
    
    return NextResponse.json({
      success: true,
      data: result,
      message: result.message
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    console.error('Error al crear reserva:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Obtener reservas (ALUMNO: sus propias reservas, PROFESOR: reservas de una clase específica)
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    
    // Si es profesor y quiere ver reservas de una clase específica
    if (user.role === 'PROFESOR' && searchParams.get('sessionId')) {
      const sessionId = searchParams.get('sessionId')
      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Se requiere sessionId' },
          { status: 400 }
        )
      }
      
      logger.debug('API Bookings - Profesor solicitando reservas para sesión:', sessionId);
      
      // Verificar que el profesor tenga acceso a esta clase
      const session = await prisma.classSession.findUnique({
        where: { id: sessionId },
        select: { profId: true, gymId: true }
      })
      
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Sesión no encontrada' },
          { status: 404 }
        )
      }
      
      if (session.profId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'No tienes permisos para ver las reservas de esta clase' },
          { status: 403 }
        )
      }
      
      // Obtener todas las reservas de esta clase
      const bookings = await prisma.booking.findMany({
        where: { sessionId },
        include: {
          alumno: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })
      
      return NextResponse.json({
        success: true,
        data: bookings,
        message: 'Reservas de la clase obtenidas exitosamente'
      })
    }
    
    // Si es alumno, obtener sus propias reservas
    if (user.role === 'ALUMNO') {
      const filters = {
        status: searchParams.get('status') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        gymId: searchParams.get('gymId') || undefined
      }
      
      const bookings = await BookingService.getUserBookings(user.id, filters)
      
      return NextResponse.json({
        success: true,
        data: bookings,
        message: 'Reservas obtenidas exitosamente'
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Rol no válido para esta operación' },
      { status: 403 }
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    console.error('Error al obtener reservas:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
