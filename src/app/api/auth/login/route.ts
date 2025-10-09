import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/auth.service'
import { AuthError } from '@/lib/auth'
import { setAuthCookies } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await AuthService.login(body)
    
    const response = NextResponse.json({
      success: true,
      data: { user: result.user },
      message: 'Login exitoso'
    })
    
    // Configurar cookies de autenticación
    setAuthCookies(response, result.accessToken, result.refreshToken)
    
    return response
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    console.error('Error en login:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
