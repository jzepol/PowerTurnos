import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/auth.service'
import { AuthError } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await AuthService.register(body)
    
    return NextResponse.json({
      success: true,
      data: { user },
      message: 'Usuario registrado exitosamente'
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    console.error('Error en registro:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
