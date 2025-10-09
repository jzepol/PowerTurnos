import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/auth'
import { TokenService } from '@/services/token.service'
import { AuthError } from '@/lib/auth'

export const POST = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const tokenGrant = await TokenService.assignTokens(body, user.id, user.role)
    
    return NextResponse.json({
      success: true,
      data: { tokenGrant },
      message: 'Tokens asignados exitosamente'
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
