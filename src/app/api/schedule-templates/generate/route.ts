import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/auth'
import { SessionService } from '@/services/session.service'
import { AuthError } from '@/lib/auth'

export const POST = withRole(['ADMIN', 'PROFESOR'])(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const result = await SessionService.generateSessionsFromTemplate(body, user.id)
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `${result.generated} sesiones generadas exitosamente`
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    console.error('Error al generar sesiones:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
