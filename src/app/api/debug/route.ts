import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Obtener información del usuario
    const userInfo = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true
      }
    })

    // Obtener membresías del usuario
    const memberships = await prisma.gymMember.findMany({
      where: { userId: user.id },
      include: {
        gym: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Obtener todos los gimnasios
    const gyms = await prisma.gym.findMany({
      select: {
        id: true,
        name: true,
        timezone: true
      }
    })

    // Obtener wallets del usuario
    const wallets = await prisma.tokenWallet.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        gymId: true,
        balance: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        user: userInfo,
        memberships,
        gyms,
        wallets
      }
    })
  } catch (error) {
    console.error('Error en debug:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
