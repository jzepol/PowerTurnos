import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/auth'
import { TokenService } from '@/services/token.service'
import { AuthError } from '@/lib/auth'

// Asignar tokens directamente a un alumno (solo ADMIN y PROFESOR)
export const POST = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { 
      userId, 
      gymId, 
      tokens, 
      reason = 'Asignación manual',
      expiresAt 
    } = body

    if (!userId || !gymId || !tokens) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    if (tokens <= 0) {
      return NextResponse.json(
        { success: false, error: 'La cantidad de tokens debe ser mayor a 0' },
        { status: 400 }
      )
    }

    // Calcular fecha de expiración por defecto (30 días) si no se proporciona
    let finalExpiresAt = expiresAt
    if (!finalExpiresAt) {
      finalExpiresAt = new Date()
      finalExpiresAt.setDate(finalExpiresAt.getDate() + 30)
    }

    const tokenGrant = await TokenService.assignTokens({
      userId,
      gymId,
      tokens,
      source: 'ASIGNACION',
      expiresAt: finalExpiresAt,
      reason
    }, user.id, user.role)

    return NextResponse.json({
      success: true,
      data: { tokenGrant },
      message: `${tokens} tokens asignados exitosamente al alumno`
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    console.error('Error al asignar tokens:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
