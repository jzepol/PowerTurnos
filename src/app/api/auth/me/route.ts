import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { AuthService } from '@/services/auth.service'
import { AuthError } from '@/lib/auth'

export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const profile = await AuthService.getProfile(user.id)
    
    return NextResponse.json({
      success: true,
      data: { user: profile },
      message: 'Perfil obtenido exitosamente'
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    console.error('Error al obtener perfil:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
