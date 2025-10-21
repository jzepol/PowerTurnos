'use client'

import { useState, useEffect } from 'react'
import { formatDate, formatTime } from '@/lib/date-utils'
import { logger } from '@/lib/logger'

interface Session {
  id: string
  startAt: string
  endAt: string
  capacity: number
  classType: {
    name: string
    color: string
  }
  room: {
    name: string
    location: {
      name: string
    }
  }
  professor: {
    name: string
  }
  bookings: Array<{
    id: string
    status: string
    alumno: {
      name: string
      email: string
    }
  }>
}

interface Booking {
  id: string
  status: string
  session: {
    id: string
    startAt: string
    endAt: string
    classType: {
      name: string
      color: string
    }
    room: {
      name: string
      location: {
        name: string
      }
    }
    professor: {
      name: string
    }
  }
}

interface TokenWallet {
  id: string
  balance: number
  gym: {
    name: string
  }
  grants: Array<{
    id: string
    tokens: number
    expiresAt: string
    source: string
    createdAt: string
  }>
}

export default function AlumnoDashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [tokenWallets, setTokenWallets] = useState<TokenWallet[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('available')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  // Estados para los diálogos interactivos
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [showCancellationDialog, setShowCancellationDialog] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isManualNavigation, setIsManualNavigation] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  
  // Estados para el usuario y gym
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentGymId, setCurrentGymId] = useState<string | null>(null)

  // Estados para el calendario semanal
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Inicializar con la semana actual, pero si no hay clases, buscar la semana más cercana con clases
    const today = new Date()
    // Ir a la semana que comienza el lunes
    const dayOfWeek = today.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysToMonday)
    monday.setHours(0, 0, 0, 0)
    return monday
  })
  
  // Generar días de la semana
  const generateWeekDays = (startDate: Date) => {
    const days = []
    logger.debug('Generando semana desde:', startDate.toISOString())
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push({
        date,
        shortName: date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
        fullName: date.toLocaleDateString('es-ES', { weekday: 'long' })
      })
      
      logger.debug(`Día ${i}:`, { date: date.toISOString() })
    }
    return days
  }
  
  const weekDays = generateWeekDays(currentWeek)
  
  const goToPreviousWeek = () => {
    logger.debug('🔄 Navegando a semana anterior...')
    setIsManualNavigation(true)
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(newWeek)
  }
  
  const goToNextWeek = () => {
    logger.debug('🔄 Navegando a semana siguiente...')
    setIsManualNavigation(true)
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(newWeek)
  }
  
  // Función para obtener sesiones de un día específico
  const getSessionsForDay = (date: Date) => {
    return sessions.filter(session => {
      // Crear fecha local para la sesión (sin zona horaria)
      const sessionDate = new Date(session.startAt)
      const sessionLocalDate = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())
      
      // Crear fecha local para el día objetivo (sin zona horaria)
      const targetLocalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      
      // Verificar si la sesión es del día correcto
      
      return sessionLocalDate.getTime() === targetLocalDate.getTime()
    })
  }
  
  // Función para obtener sesiones de un horario específico
  const getSessionsForTimeSlot = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    
    return sessions.filter(session => {
      const sessionStart = new Date(session.startAt)
      
      // Crear fechas locales sin zona horaria para comparar días
      const sessionLocalDate = new Date(sessionStart.getFullYear(), sessionStart.getMonth(), sessionStart.getDate())
      const targetLocalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      
      // Comparar días (sin zona horaria)
      const sameDay = sessionLocalDate.getTime() === targetLocalDate.getTime()
      
      // Comparar hora (usar hora local)
      const sameHour = sessionStart.getHours() === hours
      
      // Verificar si la sesión es del horario correcto
      
      return sameDay && sameHour
    })
  }

  useEffect(() => {
    fetchUserProfile()
  }, [])

  // Efecto para ajustar la semana cuando se cargan las sesiones (solo si no es navegación manual)
  useEffect(() => {
    if (sessions.length > 0 && currentGymId && !isManualNavigation) {
      // Encontrar la semana con más clases
      const findWeekWithClasses = () => {
        const today = new Date()
        let bestWeek = new Date(today)
        let maxClasses = 0
        
        // Revisar las próximas 4 semanas
        for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
          const testWeek = new Date(today)
          testWeek.setDate(today.getDate() + (weekOffset * 7))
          
          // Ir al lunes de esa semana
          const dayOfWeek = testWeek.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          const monday = new Date(testWeek)
          monday.setDate(testWeek.getDate() - daysToMonday)
          monday.setHours(0, 0, 0, 0)
          
          // Contar clases en esa semana
          const weekClasses = sessions.filter(session => {
            const sessionDate = new Date(session.startAt)
            const sessionWeek = new Date(sessionDate)
            sessionWeek.setDate(sessionDate.getDate() - (sessionDate.getDay() === 0 ? 6 : sessionDate.getDay() - 1))
            sessionWeek.setHours(0, 0, 0, 0)
            
            return sessionWeek.getTime() === monday.getTime()
          }).length
          
          if (weekClasses > maxClasses) {
            maxClasses = weekClasses
            bestWeek = monday
          }
        }
        
        return bestWeek
      }
      
      const optimalWeek = findWeekWithClasses()
      if (optimalWeek.getTime() !== currentWeek.getTime()) {
        console.log('Ajustando semana automáticamente a:', optimalWeek)
        setCurrentWeek(optimalWeek)
      }
    }
  }, [sessions, currentGymId, isManualNavigation])

  // Efecto para actualización automática cada 5 minutos (menos agresivo)
  useEffect(() => {
    if (currentGymId && autoRefreshEnabled && !isInitialLoad && !isRefreshing) {
      const interval = setInterval(() => {
        logger.debug('🔄 Actualización automática del dashboard...')
        fetchDashboardData(currentGymId, false) // No mostrar loading en actualizaciones automáticas
      }, 300000) // 5 minutos (300 segundos)

      return () => clearInterval(interval)
    }
  }, [currentGymId, autoRefreshEnabled, isInitialLoad]) // Removido isRefreshing de las dependencias

  // Efecto para actualizar datos cuando cambia la semana (con debounce)
  useEffect(() => {
    if (currentGymId && !isInitialLoad && !isRefreshing) {
      const timeoutId = setTimeout(() => {
        logger.debug('Semana cambiada, actualizando datos...')
        fetchDashboardData(currentGymId, false) // No mostrar loading en cambio de semana
      }, 300) // Debounce de 300ms para evitar actualizaciones muy frecuentes

      return () => clearTimeout(timeoutId)
    }
  }, [currentWeek, currentGymId, isInitialLoad]) // Removido isRefreshing de las dependencias

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCurrentUser(data.data.user)
          // Obtener el gymId del primer gym membership activo
          if (data.data.user.gymMemberships && data.data.user.gymMemberships.length > 0) {
            setCurrentGymId(data.data.user.gymMemberships[0].gym.id)
            // Una vez que tenemos el gymId, cargar los datos del dashboard
            await fetchDashboardData(data.data.user.gymMemberships[0].gym.id)
            setIsInitialLoad(false)
          } else {
            setError('No tienes un gimnasio asignado')
            setIsLoading(false)
            setIsInitialLoad(false)
          }
            }
          }
        } catch (error) {
      setError('Error al cargar el perfil del usuario')
      setIsLoading(false)
    }
  }

  const fetchDashboardData = async (gymId: string, showLoading = true) => {
    try {
      // Solo mostrar loading en la carga inicial o cuando se solicite explícitamente
      if (showLoading && isInitialLoad && !isRefreshing) {
        setIsLoading(true)
      }
      
      // Evitar múltiples llamadas simultáneas
      if (isRefreshing) {
        logger.debug('Ya hay una actualización en curso, saltando...')
        return
      }
      
      setIsRefreshing(true)
      setError('')

      // Obtener sesiones disponibles del gym específico
      const sessionsResponse = await fetch(`/api/sessions?status=PROGRAMADA&gymId=${gymId}`)
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        if (sessionsData.success) {
          logger.debug('Sesiones cargadas:', { count: sessionsData.data.length })
          setSessions(sessionsData.data)
        } else {
          logger.error('Error en respuesta de sesiones:', sessionsData)
        }
      } else {
        logger.error('Error HTTP al obtener sesiones:', { status: sessionsResponse.status })
      }

      // Obtener mis reservas
      const bookingsResponse = await fetch('/api/bookings/my-bookings')
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        if (bookingsData.success) {
          logger.debug('Reservas cargadas:', { count: bookingsData.data.length })
          setMyBookings(bookingsData.data)
        } else {
          logger.error('Error en respuesta de reservas:', bookingsData)
        }
      } else {
        logger.error('Error HTTP al obtener reservas:', { status: bookingsResponse.status })
      }

      // Obtener mis wallets de tokens
      const walletsResponse = await fetch(`/api/tokens/wallet?gymId=${gymId}`)
      if (walletsResponse.ok) {
        const walletsData = await walletsResponse.json()
        if (walletsData.success) {
          // La API devuelve { data: { wallet } }, necesitamos convertir a array
          setTokenWallets([walletsData.data.wallet])
        }
      }

      // Obtener mis notificaciones (sin loading adicional)
      await fetchNotifications(false)
    } catch (error) {
      setError('Error al cargar los datos del dashboard')
      logger.error('Error al cargar dashboard:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
      setLastUpdate(new Date())
      setIsInitialLoad(false)
    }
  }

  const handleBookSession = async (sessionId: string) => {
    if (!currentUser) return
    
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId,
          alumnoId: currentUser.id 
        })
      })

      if (response.ok) {
        fetchDashboardData(currentGymId!, false) // Recargar datos sin loading
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al reservar clase')
      }
    } catch (error) {
      setError('Error al reservar clase')
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchDashboardData(currentGymId!, false) // Recargar datos sin loading
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al cancelar reserva')
      }
    } catch (error) {
      setError('Error al cancelar reserva')
    }
  }

  const fetchNotifications = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsRefreshing(true)
      }
      
      const response = await fetch('/api/notifications/my-notifications')
      if (response.ok) {
        const notificationsData = await response.json()
        if (notificationsData.success) {
          logger.debug('Notificaciones cargadas:', { count: notificationsData.data.length })
          setNotifications(notificationsData.data)
        } else {
          logger.error('Error en respuesta de notificaciones:', notificationsData)
        }
      } else {
        logger.error('Error HTTP al obtener notificaciones:', { status: response.status })
      }
    } catch (error) {
      logger.error('Error al cargar notificaciones:', error)
    } finally {
      if (showLoading) {
        setIsRefreshing(false)
      }
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/my-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, markAsRead: true })
      })

      if (response.ok) {
        // Actualizar el estado local
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
      }
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error)
    }
  }

  // Función para manejar el click en una clase disponible
  const handleSessionClick = (session: Session) => {
    const isBooked = myBookings.some(b => b.session.id === session.id && b.status === 'RESERVADA')
    
    if (isBooked) {
      // Si ya está reservada, mostrar diálogo de cancelación
      const booking = myBookings.find(b => b.session.id === session.id && b.status === 'RESERVADA')
      if (booking) {
        setSelectedBooking(booking)
        setShowCancellationDialog(true)
      }
    } else {
      // Si no está reservada, mostrar diálogo de reserva
      setSelectedSession(session)
      setShowBookingDialog(true)
    }
  }

  // Función para confirmar la reserva
  const handleConfirmBooking = async () => {
    if (!selectedSession || !currentUser) return
    
    try {
      setIsProcessing(true)
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: selectedSession.id,
          alumnoId: currentUser.id 
        })
      })

      if (response.ok) {
        setShowBookingDialog(false)
        setSelectedSession(null)
        fetchDashboardData(currentGymId!, false) // Recargar datos sin loading
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al reservar clase')
      }
    } catch (error) {
      setError('Error al reservar clase')
    } finally {
      setIsProcessing(false)
    }
  }

  // Función para confirmar la cancelación
  const handleConfirmCancellation = async () => {
    if (!selectedBooking) return
    
    try {
      setIsProcessing(true)
      console.log('Cancelando reserva:', selectedBooking.id)
      
      const response = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'CANCELADA',
          reason: 'Cancelación por el alumno'
        })
      })

      console.log('Respuesta de cancelación:', response.status, response.statusText)

      if (response.ok) {
        setShowCancellationDialog(false)
        setSelectedBooking(null)
        // Recargar datos inmediatamente
        await fetchDashboardData(currentGymId!, false) // No mostrar loading en cancelación
        setError('')
      } else {
        const errorData = await response.json()
        console.error('Error en cancelación:', errorData)
        setError(errorData.error || 'Error al cancelar reserva')
      }
    } catch (error) {
      console.error('Error en cancelación:', error)
      setError('Error al cancelar reserva')
    } finally {
      setIsProcessing(false)
    }
  }

  // Función para cerrar diálogos
  const closeDialogs = () => {
    setShowBookingDialog(false)
    setShowCancellationDialog(false)
    setSelectedSession(null)
    setSelectedBooking(null)
    setIsProcessing(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-purple-600 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cargando Dashboard</h2>
          <p className="text-gray-600">Preparando tu espacio de trabajo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Dashboard del Alumno</h1>
              <p className="text-blue-100 text-base sm:text-lg">Reserva tus clases y gestiona tus tokens</p>
            </div>
            
            <div className="flex flex-wrap justify-center lg:justify-end gap-2 lg:gap-3">
              <button
                onClick={async () => {
                  try {
                    logger.debug('🚀 Dashboard Alumno - Iniciando logout...')
                    
                    const response = await fetch('/api/auth/logout', { 
                      method: 'POST',
                      credentials: 'include' // Importante: incluir cookies
                    })
                    
                    const result = await response.json()
                    
                    if (result.success) {
                      logger.debug('✅ Dashboard Alumno - Logout exitoso, redirigiendo...')
                      // Redirigir a la página de login
                      window.location.href = '/'
                    } else {
                      logger.error('❌ Dashboard Alumno - Error en logout:', result.error)
                      alert('Error al cerrar sesión')
                    }
                  } catch (error) {
                    logger.error('💥 Dashboard Alumno - Error interno en logout:', error)
                    alert('Error interno al cerrar sesión')
                  }
                }}
                className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Cerrar Sesión</span>
                <span className="sm:hidden">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{myBookings.filter(b => b.status === 'RESERVADA').length}</div>
                <div className="text-blue-100 text-sm font-medium">Clases Reservadas</div>
              </div>
              <svg className="w-12 h-12 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              </div>
            </div>
            
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
                      <div>
                <div className="text-3xl font-bold">{myBookings.filter(b => b.status === 'ASISTIO').length}</div>
                <div className="text-green-100 text-sm font-medium">Clases Asistidas</div>
                      </div>
              <svg className="w-12 h-12 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
                      </div>
                    </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {Array.isArray(tokenWallets) && tokenWallets.length > 0 
                    ? tokenWallets.reduce((total, wallet) => total + (wallet?.balance || 0), 0) 
                    : 0}
                </div>
                <div className="text-purple-100 text-sm font-medium">Tokens Disponibles</div>
              </div>
              <svg className="w-12 h-12 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
                </div>
              </div>
          </div>

        {/* Tabs de Navegación */}
        <div className="bg-white rounded-xl shadow-lg p-2 mb-8">
          <nav className="flex flex-wrap justify-center lg:justify-start gap-1 lg:gap-2">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex items-center px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 ${
                activeTab === 'available'
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Clases Disponibles</span>
              <span className="sm:hidden">📅</span>
            </button>
          <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 ${
                activeTab === 'bookings'
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Mis Reservas</span>
              <span className="sm:hidden">📋</span>
          </button>
          
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'notifications'
                ? 'bg-blue-600 text-white shadow-md transform scale-105'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Notificaciones</span>
            <span className="sm:hidden">🔔</span>
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="ml-1 sm:ml-2 bg-red-500 text-white text-xs rounded-full px-1 sm:px-2 py-1">
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>
          </nav>
        </div>

        {/* Contenido de las Tabs */}
        {activeTab === 'available' && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Calendario Semanal de Clases</span>
              <span className="sm:hidden">Calendario</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Hacé click en una clase para reservarla o cancelarla</p>
            
            {/* Navegación de semanas */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => goToPreviousWeek()}
                  className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Semana Anterior</span>
                  <span className="sm:hidden">Anterior</span>
                </button>
                
                <button
                  onClick={() => {
                    console.log('🔄 Volviendo a la semana actual...')
                    setIsManualNavigation(false)
                    const today = new Date()
                    const dayOfWeek = today.getDay()
                    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                    const monday = new Date(today)
                    monday.setDate(today.getDate() - daysToMonday)
                    monday.setHours(0, 0, 0, 0)
                    setCurrentWeek(monday)
                  }}
                  className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Hoy</span>
                  <span className="sm:hidden">Hoy</span>
                </button>
                <button
                  onClick={() => {
                    logger.debug('Actualización manual del calendario...')
                    fetchDashboardData(currentGymId!, true) // Mostrar loading en actualización manual
                  }}
                  disabled={isRefreshing}
                  className={`flex items-center px-3 py-2 text-xs sm:text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all duration-200 hover:scale-105 ${
                    isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Actualizar calendario"
                >
                  <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                                    <span className="ml-1 hidden sm:inline">
                    {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                  </span>
                </button>
                
                <button
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className={`flex items-center px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                    autoRefreshEnabled 
                      ? 'text-green-700 bg-green-100 hover:bg-green-200' 
                      : 'text-red-700 bg-red-100 hover:bg-red-200'
                  }`}
                  title={autoRefreshEnabled ? 'Desactivar auto-actualización' : 'Activar auto-actualización'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="ml-1 hidden sm:inline">
                    {autoRefreshEnabled ? 'Auto ON' : 'Auto OFF'}
                  </span>
                </button>
                </div>
              <div className="text-center">
                <span className="text-base sm:text-lg font-semibold text-gray-800 block">
                  {formatDate(weekDays[0].date, 'dd/MM/yyyy')} - {formatDate(weekDays[6].date, 'dd/MM/yyyy')}
                </span>
                {isRefreshing && (
                  <div className="flex items-center justify-center mt-1 text-xs text-blue-600">
                    <svg className="w-3 h-3 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Actualizando...
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Última actualización: {lastUpdate.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
              <button
                onClick={() => goToNextWeek()}
                className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
              >
                <span className="hidden sm:inline">Siguiente Semana</span>
                <span className="sm:hidden">Siguiente</span>
                <svg className="w-4 h-4 ml-1 sm:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Vista de Calendario - Desktop vs Móvil */}
            {/* Vista de Tabla para Desktop */}
            <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="grid grid-cols-8 border-b-2 border-gray-200">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 font-bold text-gray-800 text-center text-lg">
                  Hora
                </div>
                {weekDays.map(day => (
                  <div key={day.date.toISOString()} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 font-bold text-gray-800 text-center">
                    <div className="text-lg font-semibold">{day.shortName}</div>
                    <div className="text-sm text-gray-600 font-medium">{formatDate(day.date, 'dd/MM')}</div>
                  </div>
                ))}
              </div>

              {/* Horarios de clases - siempre mostrar si hay clases */}
              {(() => {
                // Obtener sesiones y reservas para la semana actual
                
                // Obtener todos los horarios únicos donde hay clases (incluyendo reservas del alumno)
                const allSessions = weekDays.flatMap(day => getSessionsForDay(day.date))
                const allBookings = weekDays.flatMap(day => {
                  const dayBookings = myBookings.filter(booking => {
                    const bookingDate = new Date(booking.session.startAt)
                    return bookingDate.toDateString() === day.date.toDateString()
                  })
                  return dayBookings.map(booking => ({
                    ...booking.session,
                    isBooked: true,
                    bookingId: booking.id
                  }))
                })
                
                // Combinar sesiones y reservas
                
                // Combinar sesiones y reservas
                const allClasses = [...allSessions, ...allBookings]
                
                // Obtener horarios únicos
                const uniqueTimes = [...new Set(allClasses.map(session => {
                  const sessionDate = new Date(session.startAt)
                  return `${sessionDate.getHours().toString().padStart(2, '0')}:${sessionDate.getMinutes().toString().padStart(2, '0')}`
                }))].sort()
                
                // Generar filas de horarios
                
                // Si no hay clases en esta semana, mostrar un mensaje
                if (uniqueTimes.length === 0) {
                  return (
                    <div className="col-span-8 p-8 text-center text-gray-500">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-lg font-medium">No hay clases programadas para esta semana</p>
                      <p className="text-sm">Intenta con otra semana o contacta a tu profesor</p>
                      <div className="mt-4 text-xs text-gray-400">
                        <p>Debug: {sessions.length} sesiones cargadas, {myBookings.length} reservas</p>
                        <p>Semana: {formatDate(weekDays[0].date, 'dd/MM/yyyy')} - {formatDate(weekDays[6].date, 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                  )
                }
                
                return uniqueTimes.map(time => (
                  <div key={time} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors duration-200">
                    <div className="p-4 bg-gray-50 text-lg text-gray-700 font-bold text-center border-r border-gray-200">
                      {time}
                    </div>
                    {weekDays.map(day => {
                      const timeSlotSessions = getSessionsForTimeSlot(day.date, time)
                      
                      return (
                        <div key={day.date.toISOString()} className="p-2 border-r border-gray-100 last:border-r-0 min-h-[80px] bg-white relative">
                          {(() => {
                            // Obtener reservas del alumno para este horario
                            
                            // Obtener reservas del alumno para este horario
                            const dayBookings = myBookings.filter(booking => {
                              const bookingDate = new Date(booking.session.startAt)
                              return bookingDate.toDateString() === day.date.toDateString()
                            })
                            
                            const timeBookings = dayBookings.filter(booking => {
                              const bookingDate = new Date(booking.session.startAt)
                              const [hours, minutes] = time.split(':').map(Number)
                              return bookingDate.getHours() === hours
                            })
                            
                            // PRIORIDAD: Si hay reservas del alumno, mostrar SOLO esas
                            if (timeBookings.length > 0) {
                              return timeBookings.map(booking => {
                                const isToday = new Date().toDateString() === day.date.toDateString()
                                
                                return (
                                  <div
                                    key={`booking-${booking.id}`}
                                    className={`p-2 rounded-lg text-xs mb-1 cursor-pointer hover:shadow-lg transition-all duration-200 ${
                                      isToday ? 'ring-2 ring-blue-400' : ''
                                    } ring-2 ring-green-400`}
                                    style={{ 
                                      backgroundColor: booking.session.classType.color + '15', 
                                      border: `2px solid ${booking.session.classType.color}`,
                                      boxShadow: `0 2px 4px ${booking.session.classType.color}20`
                                    }}
                                    onClick={() => {
                                      // Crear un objeto Session completo para la función handleSessionClick
                                      const sessionData: Session = {
                                        id: booking.session.id,
                                        startAt: booking.session.startAt,
                                        endAt: booking.session.endAt,
                                        capacity: 0, // No disponible para reservas
                                        classType: booking.session.classType,
                                        room: booking.session.room,
                                        professor: booking.session.professor,
                                        bookings: []
                                      }
                                      handleSessionClick(sessionData)
                                    }}
                                  >
                                    <div className="font-bold text-gray-900 mb-1 truncate">{booking.session.classType.name}</div>
                                    <div className="text-gray-700 text-xs mb-1 truncate">{booking.session.room.name}</div>
                                    <div className="text-gray-600 text-xs mb-1 truncate">Prof. {booking.session.professor.name}</div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-600">Reservada</span>
                                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                        Reservada
                                      </span>
                                    </div>
                                  </div>
                                )
                              })
                            }
                            
                            // Si NO hay reservas del alumno, mostrar clases disponibles
                            const regularSessions = timeSlotSessions.filter(session => {
                              // Excluir clases que ya están reservadas por el alumno
                              return !myBookings.some(b => b.session.id === session.id && b.status === 'RESERVADA')
                            })
                            
                            if (regularSessions.length === 0) {
                              return null
                            }
                            
                            return regularSessions.map(session => {
                              const availableSpots = session.capacity - session.bookings.filter(b => ['RESERVADA', 'ASISTIO'].includes(b.status)).length
                              const isToday = new Date().toDateString() === day.date.toDateString()
                              
                              return (
                                <div
                                  key={session.id}
                                  className={`p-2 rounded-lg text-xs mb-1 cursor-pointer hover:shadow-lg transition-all duration-200 ${
                                    isToday ? 'ring-2 ring-blue-400' : ''
                                  }`}
                                  style={{ 
                                    backgroundColor: session.classType.color + '15', 
                                    border: `2px solid ${session.classType.color}`,
                                    boxShadow: `0 2px 4px ${session.classType.color}20`
                                  }}
                                  onClick={() => handleSessionClick(session)}
                                >
                                  <div className="font-bold text-gray-900 mb-1 truncate">{session.classType.name}</div>
                                  <div className="text-gray-700 text-xs mb-1 truncate">{session.room.name}</div>
                                  <div className="text-gray-600 text-xs mb-1 truncate">Prof. {session.professor.name}</div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">{availableSpots} cupos</span>
                                    {availableSpots > 0 ? (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                        Disponible
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                                        Lleno
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                            
                            // La lógica ya está manejada arriba con prioridad de reservas
                          })()}
                        </div>
                      )
                    })}
                  </div>
                ))
              })()}
            </div>

            {/* Vista de Lista para Móvil */}
            <div className="lg:hidden space-y-4">
              {weekDays.map(day => {
                const daySessions = getSessionsForDay(day.date)
                const dayBookings = myBookings.filter(booking => {
                  const bookingDate = new Date(booking.session.startAt)
                  return bookingDate.toDateString() === day.date.toDateString()
                })
                
                // Combinar sesiones y reservas del día, PRIORIZANDO las reservas del alumno
                const allDayClasses: any[] = []
                
                // Primero agregar las reservas del alumno
                dayBookings.forEach(booking => {
                  allDayClasses.push({ ...booking.session, type: 'booked', bookingId: booking.id })
                })
                
                // Luego agregar solo las clases disponibles que NO estén ya reservadas por el alumno
                daySessions.forEach(session => {
                  const isAlreadyBooked = dayBookings.some(booking => 
                    booking.session.id === session.id && 
                    new Date(booking.session.startAt).getTime() === new Date(session.startAt).getTime()
                  )
                  
                  if (!isAlreadyBooked) {
                    allDayClasses.push({ ...session, type: 'available' })
                  }
                })
                
                if (allDayClasses.length === 0) {
                  return null
                }
                
                return (
                  <div key={day.date.toISOString()} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Header del día */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-800">
                        {day.fullName.charAt(0).toUpperCase() + day.fullName.slice(1)} {formatDate(day.date, 'dd/MM/yyyy')}
                      </h3>
                    </div>
                    
                    {/* Lista de clases del día */}
                    <div className="divide-y divide-gray-100">
                      {allDayClasses.map((classItem, index) => {
                        const isToday = new Date().toDateString() === day.date.toDateString()
                        const isBooked = classItem.type === 'booked'
                        
                        return (
                          <div
                            key={`${day.date.toISOString()}-${index}`}
                            className={`p-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer ${
                              isToday ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                            }`}
                            onClick={() => {
                              if (isBooked) {
                                // Crear objeto Session para reservas
                                const sessionData: Session = {
                                  id: classItem.id,
                                  startAt: classItem.startAt,
                                  endAt: classItem.endAt,
                                  capacity: 0,
                                  classType: classItem.classType,
                                  room: classItem.room,
                                  professor: classItem.professor,
                                  bookings: []
                                }
                                handleSessionClick(sessionData)
                                                              } else {
                                  // Crear objeto Session completo para clases disponibles
                                  const sessionData: Session = {
                                    id: classItem.id,
                                    startAt: classItem.startAt,
                                    endAt: classItem.endAt,
                                    capacity: (classItem as any).capacity,
                                    classType: classItem.classType,
                                    room: classItem.room,
                                    professor: classItem.professor,
                                    bookings: (classItem as any).bookings
                                  }
                                  handleSessionClick(sessionData)
                                }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Nombre de la clase */}
                                <div className="flex items-center space-x-3 mb-2">
                                  <div
                                    className="w-4 h-4 rounded-full shadow-sm"
                                    style={{ backgroundColor: classItem.classType.color }}
                                  ></div>
                                  <h4 className="font-bold text-lg text-gray-900">
                                    {classItem.classType.name}
                                  </h4>
                                  {isBooked && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                      Reservada
                                    </span>
                                  )}
                                </div>
                                
                                {/* Detalles de la clase */}
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>Prof. {classItem.professor.name}</span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    <span>{classItem.room.name}</span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{formatTime(classItem.startAt)} a {formatTime(classItem.endAt)}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Estado de la clase */}
                                                                <div className="text-right">
                                    {isBooked ? (
                                      <div className="text-green-600 font-semibold">
                                        ✓ Reservada
                                      </div>
                                    ) : (
                                      <div className="text-blue-600 font-semibold">
                                        {(classItem as any).capacity - (classItem as any).bookings.filter((b: any) => ['RESERVADA', 'ASISTIO'].includes(b.status)).length} cupos
                                      </div>
                                    )}
                                  </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              
              {/* Mensaje si no hay clases en la semana */}
              {weekDays.every(day => {
                const daySessions = getSessionsForDay(day.date)
                const dayBookings = myBookings.filter(booking => {
                  const bookingDate = new Date(booking.session.startAt)
                  return bookingDate.toDateString() === day.date.toDateString()
                })
                return daySessions.length === 0 && dayBookings.length === 0
              }) && (
                <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium">No hay clases programadas para esta semana</p>
                  <p className="text-sm">Intenta con otra semana o contacta a tu profesor</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Mis Reservas
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myBookings.map(booking => (
                <div key={booking.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-6 h-6 rounded-full shadow-md"
                          style={{ backgroundColor: booking.session.classType.color }}
                        ></div>
                        <h3 className="font-bold text-lg text-gray-900">
                            {booking.session.classType.name}
                          </h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'RESERVADA' ? 'bg-blue-100 text-blue-800' :
                        booking.status === 'ASISTIO' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status === 'RESERVADA' ? 'Reservada' :
                         booking.status === 'ASISTIO' ? 'Asistió' : 'Cancelada'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-4 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                            {formatDate(booking.session.startAt)} a las {formatTime(booking.session.startAt)}
                    </div>

                    <div className="text-sm text-gray-600 mb-4 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                            {booking.session.room.name} - {booking.session.room.location.name}
                        </div>

                    <div className="text-sm text-gray-600 mb-4 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Prof. {booking.session.professor.name}
                      </div>

                      {booking.status === 'RESERVADA' && (
                        <button
                          onClick={() => {
                            setSelectedBooking(booking)
                            setShowCancellationDialog(true)
                          }}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                        >
                          Cancelar Reserva
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}


        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6a2 2 0 002-2V7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Mis Notificaciones
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {notifications.filter(n => !n.isRead).length} sin leer
                </span>
                <button
                  onClick={() => fetchNotifications(true)}
                  disabled={isRefreshing}
                  className={`px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium ${
                    isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </div>
            
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6a2 2 0 002-2V7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-lg">No tienes notificaciones</p>
                <p className="text-gray-400 text-sm">Las notificaciones de tus profesores aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                      notification.isRead 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-blue-50 border-blue-200 ring-2 ring-blue-100'
                    }`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                          {!notification.isRead && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                              Nuevo
                            </span>
                            )}
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            notification.type === 'INFO' ? 'bg-blue-100 text-blue-800' :
                            notification.type === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                            notification.type === 'CANCELLATION' ? 'bg-red-100 text-red-800' :
                            notification.type === 'REMINDER' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.type}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-2">{notification.message}</p>
                        {notification.metadata && (
                          <div className="text-sm text-gray-600 space-y-1">
                            {notification.metadata.className && (
                              <p><strong>Clase:</strong> {notification.metadata.className}</p>
                            )}
                            {notification.metadata.roomName && (
                              <p><strong>Sala:</strong> {notification.metadata.roomName}</p>
                            )}
                            {notification.metadata.startAt && (
                              <p><strong>Fecha:</strong> {new Date(notification.metadata.startAt).toLocaleDateString('es-ES')}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleDateString('es-ES')}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(notification.createdAt).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-bold text-lg">Error</h3>
                <p className="text-sm">{error}</p>
                <button 
                  onClick={() => setError('')}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Diálogos de Confirmación */}
      {showBookingDialog && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Reserva</h3>
            <p className="text-gray-700 mb-4">
              ¿Estás seguro de que quieres reservar la clase de "{selectedSession.classType.name}"
              el {formatDate(selectedSession.startAt)} a las {formatTime(selectedSession.startAt)}?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeDialogs}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmBooking}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                disabled={isProcessing}
              >
                {isProcessing ? 'Reservando...' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancellationDialog && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Cancelación</h3>
            <p className="text-gray-700 mb-4">
              ¿Estás seguro de que quieres cancelar la reserva de la clase de "{selectedBooking.session.classType.name}"
              el {formatDate(selectedBooking.session.startAt)} a las {formatTime(selectedBooking.session.startAt)}?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeDialogs}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCancellation}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                disabled={isProcessing}
              >
                {isProcessing ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
