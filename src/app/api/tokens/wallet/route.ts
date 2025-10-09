import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { TokenService } from '@/services/token.service'
import { AuthError } from '@/lib/auth'

export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gymId')
    
    if (!gymId) {
      return NextResponse.json(
        { success: false, error: 'gymId es requerido' },
        { status: 400 }
      )
    }
    
    console.log('🔍 Buscando wallet para:', { userId: user.id, gymId, userRole: user.role })
    
    const wallet = await TokenService.getWallet(user.id, gymId)
    
    return NextResponse.json({
      success: true,
      data: { wallet },
      message: 'Wallet obtenido exitosamente'
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    console.error('Error al obtener wallet:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
