import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/auth'
import { SessionService } from '@/services/session.service'
import { AuthError } from '@/lib/auth'

// Obtener sesiones con filtros
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const filters = {
      gymId: searchParams.get('gymId') || undefined,
      profId: searchParams.get('profId') || undefined,
      classTypeId: searchParams.get('classTypeId') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      status: searchParams.get('status') || undefined,
      roomId: searchParams.get('roomId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    }
    
    console.log('API Sessions - Filtros recibidos:', filters)
    console.log('API Sessions - Usuario:', { id: user.id, role: user.role })
    
    // Si es profesor, solo mostrar sus propias sesiones
    if (user.role === 'PROFESOR') {
      filters.profId = user.id
      console.log('API Sessions - Filtro profId agregado:', user.id)
    }
    
    const sessions = await SessionService.getSessions(filters)
    console.log('API Sessions - Sesiones encontradas:', sessions.length)
    
    return NextResponse.json({
      success: true,
      data: sessions,
      message: 'Sesiones obtenidas exitosamente'
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    console.error('Error al obtener sesiones:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Crear una sesión individual (solo ADMIN y PROFESOR)
export const POST = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const session = await SessionService.createSession(body, user.id)
    
    return NextResponse.json({
      success: true,
      data: { session },
      message: 'Sesión creada exitosamente'
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    console.error('Error al crear sesión:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
