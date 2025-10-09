import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Obtener notificaciones del usuario autenticado
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    console.log('🚀 API Mis Notificaciones - INICIANDO GET')
    console.log('👤 API Mis Notificaciones - Usuario:', user.id, user.role)

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Construir filtros
    const whereClause: any = {
      userId: user.id
    }

    if (unreadOnly) {
      whereClause.isRead = false
    }

    // Obtener notificaciones del usuario
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    console.log('✅ API Mis Notificaciones - Notificaciones encontradas:', notifications.length)

    return NextResponse.json({
      success: true,
      data: notifications,
      message: `${notifications.length} notificaciones obtenidas exitosamente`
    })

  } catch (error: any) {
    console.error('💥 API Mis Notificaciones - Error durante el proceso:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// Marcar notificación como leída
export const PATCH = withAuth(async (request: NextRequest, user: any) => {
  try {
    console.log('🚀 API Marcar Notificación - INICIANDO PATCH')
    
    const body = await request.json()
    const { notificationId, markAsRead } = body

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere notificationId' },
        { status: 400 }
      )
    }

    // Verificar que la notificación pertenece al usuario
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: user.id
      }
    })

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notificación no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar el estado de lectura
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: markAsRead !== undefined ? markAsRead : true
      }
    })

    console.log('✅ API Marcar Notificación - Notificación actualizada:', updatedNotification.id)

    return NextResponse.json({
      success: true,
      data: updatedNotification,
      message: 'Notificación actualizada exitosamente'
    })

  } catch (error: any) {
    console.error('💥 API Marcar Notificación - Error durante el proceso:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
