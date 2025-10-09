import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth'

export const POST = async (request: NextRequest) => {
  try {
    console.log('🚀 API Logout - INICIANDO POST')
    
    const response = NextResponse.json({
      success: true,
      message: 'Logout exitoso'
    })
    
    // Limpiar cookies de autenticación
    clearAuthCookies(response)
    
    console.log('✅ API Logout - Cookies limpiadas exitosamente')
    
    return response
  } catch (error) {
    console.error('💥 API Logout - Error durante el proceso:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
