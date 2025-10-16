import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const POST = async (request: NextRequest) => {
  try {
    logger.debug('🚀 API Logout - INICIANDO POST', );
    
    const response = NextResponse.json({
      success: true,
      message: 'Logout exitoso'
    })
    
    // Limpiar cookies de autenticación
    clearAuthCookies(response)
    
    logger.debug('✅ API Logout - Cookies limpiadas exitosamente', );
    
    return response
  } catch (error) {
    logger.error('💥 API Logout - Error durante el proceso:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
