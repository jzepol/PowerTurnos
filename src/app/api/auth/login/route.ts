import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/auth.service'
import { AuthError } from '@/lib/auth'
import { setAuthCookies } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  let body: any = null
  
  try {
    body = await request.json()
    logger.apiCall('/api/auth/login', 'POST', { email: body.email })
    
    const result = await AuthService.login(body)
    
    logger.userAction('Login exitoso', result.user.id, { email: body.email })
    
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
      logger.warn('Error de autenticación', { error: error.message, email: body?.email })
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    logger.error('Error interno en login', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
