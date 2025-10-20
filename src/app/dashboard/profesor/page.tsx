'use client'

import { useState, useEffect } from 'react'
import { getWeekDaysWithNames, getNextWeek, getPreviousWeek, formatDate, formatTime } from '@/lib/date-utils'
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
  bookings: Array<{
    id: string
    status: string
    alumno: {
      name: string
      email: string
    }
  }>
}

interface Template {
  id: string
  daysOfWeek: number[]
  startTime: string
  durationMin: number
  capacity: number
  active: boolean
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
}

interface ClassType {
  id: string
  name: string
  color: string
  durationMin: number
}

interface Room {
  id: string
  name: string
  capacity: number
  location: {
    name: string
  }
}

interface Location {
  id: string
  name: string
  address: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
  updatedAt: string
  gymMemberships?: Array<{
    roleInGym: string
    isActive: boolean
    gym: {
      id: string
      name: string
    }
  }>
}

export default function ProfesorDashboard() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [sessions, setSessions] = useState<Session[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeTab, setActiveTab] = useState('calendar')
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [showCreateClass, setShowCreateClass] = useState(false)
  const [showGenerateFromTemplate, setShowGenerateFromTemplate] = useState(false)
  const [showAssignTokens, setShowAssignTokens] = useState(false)
  const [showRegisterStudent, setShowRegisterStudent] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [selectedGymId, setSelectedGymId] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isCreatingClass, setIsCreatingClass] = useState(false)
  
  // Estados para el modal de detalles de clase
  const [showClassDetailsModal, setShowClassDetailsModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [classBookings, setClassBookings] = useState<any[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)

  const weekDays = getWeekDaysWithNames(currentWeek)

  useEffect(() => {
    fetchDashboardData()
  }, [currentWeek])

  // Efecto para actualización automática cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      logger.systemEvent('Actualización automática del dashboard del profesor')
      if (selectedGymId) {
        fetchSessions(selectedGymId)
      }
    }, 30000) // 30 segundos

    return () => clearInterval(interval)
  }, [selectedGymId])

  // Efecto para cerrar el menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreOptions && !(event.target as Element).closest('.relative')) {
        setShowMoreOptions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreOptions])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Obtener datos del usuario autenticado
      const meResponse = await fetch('/api/auth/me')
      if (meResponse.ok) {
        const meData = await meResponse.json()
        if (meData.success) {
          // Almacenar el ID del usuario autenticado
          const userId = meData.data.user.id
          setCurrentUserId(userId)
          console.log('Usuario autenticado:', userId) // Debug
          
          // Obtener el gimnasio del profesor
          const gymsResponse = await fetch('/api/gyms')
          if (gymsResponse.ok) {
            const gymsData = await gymsResponse.json()
            if (gymsData.success && gymsData.data.length > 0) {
              const gymId = gymsData.data[0].id
              setSelectedGymId(gymId)
              console.log('Gimnasio seleccionado:', gymId) // Debug
              
              // Cargar datos del gimnasio
              await Promise.all([
                fetchSessions(gymId),
                fetchTemplates(gymId),
                fetchClassTypes(gymId),
                fetchRooms(gymId),
                fetchLocations(gymId),
                fetchUsers(gymId)
              ])
            }
          }
        } else {
          console.error('Error en respuesta de /api/auth/me:', meData)
        }
      } else {
        console.error('Error al obtener usuario:', meResponse.status)
      }
    } catch (error) {
      setError('Error al cargar los datos del dashboard')
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSessions = async (gymId: string) => {
    try {
      const startDate = new Date(weekDays[0].date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(weekDays[6].date)
      endDate.setHours(23, 59, 59, 999)
      
      console.log('Buscando sesiones para:', {
        gymId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        weekDays: weekDays.map(d => d.date.toDateString())
      })
      
      // Para profesores, no necesitamos enviar profId porque la API ya filtra por el usuario autenticado
      const sessionsResponse = await fetch(`/api/sessions?gymId=${gymId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        if (sessionsData.success) {
          console.log('Sesiones obtenidas:', sessionsData.data) // Debug
          console.log('Número de sesiones:', sessionsData.data.length)
          setSessions(sessionsData.data)
        }
        } else {
        console.error('Error al obtener sesiones:', sessionsResponse.status)
        }
      } catch (error) {
        console.error('Error al obtener sesiones:', error)
    }
  }

  const fetchTemplates = async (gymId: string) => {
    try {
      const templatesResponse = await fetch(`/api/schedule-templates?gymId=${gymId}`)
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        if (templatesData.success) {
          setTemplates(templatesData.data)
        }
      }
    } catch (error) {
      console.error('Error al obtener plantillas:', error)
    }
  }

  const fetchClassTypes = async (gymId: string) => {
    try {
      const classTypesResponse = await fetch(`/api/classtypes?gymId=${gymId}`)
      if (classTypesResponse.ok) {
        const classTypesData = await classTypesResponse.json()
        if (classTypesData.success) {
          setClassTypes(classTypesData.data)
        }
      }
    } catch (error) {
      console.error('Error al obtener tipos de clase:', error)
    }
  }

  const fetchRooms = async (gymId: string) => {
    try {
      const roomsResponse = await fetch(`/api/rooms?gymId=${gymId}`)
      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json()
        if (roomsData.success) {
          setRooms(roomsData.data)
        }
      }
    } catch (error) {
      console.error('Error al obtener salas:', error)
    }
  }

  const fetchLocations = async (gymId: string) => {
    try {
      const locationsResponse = await fetch(`/api/locations?gymId=${gymId}`)
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json()
        if (locationsData.success) {
          setLocations(locationsData.data)
        }
      }
    } catch (error) {
      console.error('Error al obtener ubicaciones:', error)
    }
  }

  const fetchUsers = async (gymId: string) => {
    try {
      const usersResponse = await fetch(`/api/users?gymId=${gymId}`)
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        if (usersData.success) {
          // Filtrar solo alumnos
          const alumnos = usersData.data.filter((user: User) => user.role === 'ALUMNO')
          setUsers(alumnos)
        }
      }
    } catch (error) {
      console.error('Error al obtener usuarios:', error)
    }
  }

  const goToNextWeek = () => {
    setCurrentWeek(getNextWeek(currentWeek))
  }

  const goToPreviousWeek = () => {
    setCurrentWeek(getPreviousWeek(currentWeek))
  }

  const getSessionsForDay = (date: Date) => {
    const daySessions = sessions.filter(session => {
      const sessionDate = new Date(session.startAt)
      const isSameDay = sessionDate.toDateString() === date.toDateString()
      return isSameDay
    })
    
    console.log(`Sesiones para ${date.toDateString()}:`, daySessions.length, daySessions)
    return daySessions
  }

  const getSessionsForTimeSlot = (date: Date, timeSlot: string) => {
    const daySessions = getSessionsForDay(date)
    const timeSlotSessions = daySessions.filter(session => {
      const sessionTime = formatTime(session.startAt, 'HH:mm')
      return sessionTime === timeSlot
    })
    return timeSlotSessions
  }

  const getSessionStatus = (session: Session) => {
    const bookedCount = session.bookings.filter(b => ['RESERVADA', 'ASISTIO'].includes(b.status)).length
    const availableSpots = session.capacity - bookedCount
    
    if (availableSpots <= 0) {
      return { status: 'full', text: 'Lleno', color: 'bg-red-100 text-red-800' }
    }
    
    return { status: 'available', text: `${bookedCount}/${session.capacity}`, color: 'bg-blue-100 text-blue-800' }
  }

  const handleCreateTemplate = async (templateData: any) => {
    try {
      // Validar que tengamos el ID del usuario
      if (!currentUserId) {
        setError('Error: Usuario no autenticado. Recargando...')
        setTimeout(() => window.location.reload(), 2000)
        return
      }

      console.log('Creando plantilla con datos:', { ...templateData, gymId: selectedGymId, profId: currentUserId })

      const response = await fetch('/api/schedule-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateData,
          gymId: selectedGymId,
          profId: currentUserId
        })
      })

      if (response.ok) {
        setShowCreateTemplate(false)
        fetchTemplates(selectedGymId)
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al crear plantilla')
      }
    } catch (error) {
      console.error('Error al crear plantilla:', error)
      setError('Error al crear plantilla')
    }
  }

  const handleGenerateFromTemplate = async (templateId: string, weeks: number, startDate: string) => {
    try {
      setError('')
      logger.systemEvent('Generando clases desde plantilla', { templateId, weeks, startDate })
      
      const response = await fetch('/api/schedule-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          weeks: parseInt(weeks.toString()),
          startDate: new Date(startDate)
        })
      })

      if (response.ok) {
        const result = await response.json()
        logger.systemEvent('Clases generadas exitosamente', { generated: result.data.generated })
        setShowGenerateFromTemplate(false)
        setSuccessMessage(`¡${result.data.generated} clases generadas exitosamente!`)
        // Recargar sesiones para mostrar las nuevas clases
        if (selectedGymId) {
          await fetchSessions(selectedGymId)
        }
        setError('')
      } else {
        const errorData = await response.json()
        logger.error('Error al generar clases desde plantilla', { error: errorData.error, templateId })
        setError(errorData.error || 'Error al generar clases')
      }
    } catch (error) {
      logger.error('Error al generar clases desde plantilla', error)
      setError('Error al generar clases')
    }
  }

  const handleCreateClass = async (classData: any) => {
    try {
      setIsCreatingClass(true)
      setError('')
      
      // Validar que tengamos el ID del usuario
      if (!currentUserId) {
        setError('Error: Usuario no autenticado. Recargando...')
        setTimeout(() => window.location.reload(), 2000)
        return
      }

      // Validar que tengamos un gimnasio seleccionado
      if (!selectedGymId) {
        setError('Error: No hay gimnasio seleccionado')
        return
      }

      const requestData = {
        ...classData,
        gymId: selectedGymId,
        profId: currentUserId
      }

      console.log('Creando clase con datos:', requestData)
      console.log('Fechas de la clase:', {
        startAt: new Date(classData.startAt).toISOString(),
        endAt: new Date(classData.endAt).toISOString(),
        startAtLocal: new Date(classData.startAt).toLocaleString(),
        endAtLocal: new Date(classData.endAt).toLocaleString()
      })

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const responseData = await response.json()
        console.log('Clase creada exitosamente:', responseData)
        setShowCreateClass(false)
        // Recargar sesiones después de crear la clase
        await fetchSessions(selectedGymId)
        setError('')
        setSuccessMessage('Clase creada exitosamente')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const errorData = await response.json()
        console.error('Error al crear clase:', errorData)
        setError(errorData.error || 'Error al crear clase')
      }
    } catch (error) {
      console.error('Error al crear clase:', error)
      setError('Error al crear clase')
    } finally {
      setIsCreatingClass(false)
    }
  }

  const handleAssignTokens = async (tokenData: any) => {
    try {
      const response = await fetch('/api/tokens/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tokenData,
          gymId: selectedGymId
        })
      })

      if (response.ok) {
        setShowAssignTokens(false)
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al asignar tokens')
      }
    } catch (error) {
      setError('Error al asignar tokens')
    }
  }


  const handleRegisterStudent = async (studentData: any) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studentData,
          role: 'ALUMNO',
          gymId: selectedGymId
        })
      })

      if (response.ok) {
        setShowRegisterStudent(false)
        fetchUsers(selectedGymId)
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al registrar alumno')
      }
    } catch (error) {
      setError('Error al registrar alumno')
    }
  }


  const handleSessionClick = async (session: any) => {
    try {
      console.log('Sesión clickeada:', session)
      setSelectedClass(session)
      setShowClassDetailsModal(true)
      setIsLoadingBookings(true)
      
      // Cargar las reservas de esta clase
      const bookingsResponse = await fetch(`/api/bookings?sessionId=${session.id}`)
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        if (bookingsData.success) {
          setClassBookings(bookingsData.data)
          console.log('Reservas cargadas:', bookingsData.data)
        } else {
          console.error('Error al cargar reservas:', bookingsData.error)
          setClassBookings([])
        }
      } else {
        console.error('Error HTTP al cargar reservas:', bookingsResponse.status)
        setClassBookings([])
      }
    } catch (error) {
      console.error('Error al cargar reservas:', error)
      setClassBookings([])
    } finally {
      setIsLoadingBookings(false)
    }
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
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
           <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                           <div className="text-center lg:text-left">
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Dashboard del Profesor</h1>
                <p className="text-blue-100 text-lg">Gestiona tus clases, plantillas y alumnos</p>
                {currentUserId && (
                  <p className="text-blue-200 text-sm">Usuario ID: {currentUserId.substring(0, 8)}...</p>
                )}
            </div>
             
             {/* Botones Principales - Interfaz Simplificada */}
             <div className="flex flex-wrap justify-center lg:justify-end gap-3">
               {/* Botón Principal: Generar desde Plantilla */}
               <button
                 onClick={() => setShowGenerateFromTemplate(true)}
                 className="inline-flex items-center px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
               >
                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
                 Generar Clases
               </button>
               
               {/* Botón Secundario: Nueva Clase */}
               <button
                 onClick={() => setShowCreateClass(true)}
                 className="inline-flex items-center px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
               >
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                 </svg>
                 Nueva Clase
               </button>
               
               {/* Botón Secundario: Asignar Tokens */}
               <button
                 onClick={() => setShowAssignTokens(true)}
                 className="inline-flex items-center px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
               >
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                 </svg>
                 Tokens
               </button>
               
               {/* Menú Desplegable: Más Opciones */}
               <div className="relative">
                 <button
                   onClick={() => setShowMoreOptions(!showMoreOptions)}
                   className="inline-flex items-center px-4 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                 >
                   <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                   </svg>
                   Más opciones
                   <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${showMoreOptions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                   </svg>
                 </button>
                 
                 {/* Menú Desplegable */}
                 {showMoreOptions && (
                   <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                     <div className="py-2">
                       <button
                         onClick={() => {
                           setShowCreateTemplate(true)
                           setShowMoreOptions(false)
                         }}
                         className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                       >
                         <svg className="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                         </svg>
                         Crear Plantilla
                       </button>
                       
                       <button
                         onClick={() => {
                           setShowRegisterStudent(true)
                           setShowMoreOptions(false)
                         }}
                         className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                       >
                         <svg className="w-4 h-4 mr-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                         </svg>
                         Registrar Alumno
                       </button>
                     </div>
                   </div>
                 )}
               </div>
               
              <button
                onClick={async () => {
                  try {
                    console.log('🚀 Dashboard - Iniciando logout...')
                    
                    const response = await fetch('/api/auth/logout', { 
                      method: 'POST',
                      credentials: 'include' // Importante: incluir cookies
                    })
                    
                    const result = await response.json()
                    
                    if (result.success) {
                      console.log('✅ Dashboard - Logout exitoso, redirigiendo...')
                      // Redirigir a la página de login
                      window.location.href = '/'
                    } else {
                      console.error('❌ Dashboard - Error en logout:', result.error)
                      setError('Error al cerrar sesión')
                    }
                  } catch (error) {
                    console.error('💥 Dashboard - Error interno en logout:', error)
                    setError('Error interno al cerrar sesión')
                  }
                }}
                 className="inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                 {/* Tabs de Navegación */}
         <div className="bg-white rounded-xl shadow-lg p-2 mb-8">
           <nav className="flex flex-wrap justify-center lg:justify-start space-x-1 lg:space-x-2">
             <button
               onClick={() => setActiveTab('calendar')}
               className={`flex items-center px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                 activeTab === 'calendar'
                   ? 'bg-blue-600 text-white shadow-md transform scale-105'
                   : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
               }`}
             >
               <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
               Calendario
             </button>
             <button
               onClick={() => setActiveTab('templates')}
               className={`flex items-center px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                 activeTab === 'templates'
                   ? 'bg-blue-600 text-white shadow-md transform scale-105'
                   : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
               }`}
             >
               <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               Plantillas
             </button>
                           <button
                onClick={() => setActiveTab('alumnos')}
                className={`flex items-center px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'alumnos'
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Alumnos
              </button>
              
              <button
                onClick={() => setActiveTab('management')}
                className={`flex items-center px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'management'
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Gestión
              </button>
           </nav>
         </div>

        {/* Contenido de las Tabs */}
        {activeTab === 'calendar' && (
          <>
        {/* Navegación de Semana */}
             <div className="flex flex-col sm:flex-row items-center justify-between mb-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <button
              onClick={goToPreviousWeek}
                   className="flex items-center px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
                   <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                   </svg>
                   Semana Anterior
            </button>
            <button
              onClick={() => fetchSessions(selectedGymId)}
              className="flex items-center px-4 py-3 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all duration-200 transform hover:scale-105"
              title="Actualizar calendario"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
               <h2 className="text-2xl font-bold text-gray-900 text-center mb-4 sm:mb-0">
            {formatDate(weekDays[0].date)} - {formatDate(weekDays[6].date)}
          </h2>
          
          <button
            onClick={goToNextWeek}
                 className="flex items-center px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
                 Siguiente Semana
                 <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
          </button>
        </div>

        {/* Vista de Calendario - Desktop vs Móvil */}
        {/* Vista de Tabla para Desktop */}
        <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-8 border-b-2 border-gray-200">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 font-bold text-gray-800 text-center text-lg">Hora</div>
            {weekDays.map(day => (
              <div key={day.date.toISOString()} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 font-bold text-gray-800 text-center">
                <div className="text-lg font-semibold">{day.shortName}</div>
                <div className="text-sm text-gray-600 font-medium">{formatDate(day.date, 'dd/MM')}</div>
              </div>
            ))}
          </div>

          {/* Solo horarios donde hay clases */}
          {(() => {
            // Obtener todos los horarios únicos donde hay clases en la semana
            const allSessions = weekDays.flatMap(day => getSessionsForDay(day.date))
            const uniqueTimes = [...new Set(allSessions.map(session => {
              const sessionDate = new Date(session.startAt)
              return `${sessionDate.getHours().toString().padStart(2, '0')}:${sessionDate.getMinutes().toString().padStart(2, '0')}`
            }))].sort()
            
            return uniqueTimes.map(time => (
              <div key={time} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors duration-200">
                <div className="p-4 bg-gray-50 text-lg text-gray-700 font-bold text-center border-r border-gray-200">
                  {time}
                </div>
                {weekDays.map(day => {
                  const timeSlotSessions = getSessionsForTimeSlot(day.date, time)
                  
                  return (
                    <div key={day.date.toISOString()} className="p-2 border-r border-gray-100 last:border-r-0 min-h-[80px] bg-white relative">
                      {timeSlotSessions.map(session => {
                        const sessionStatus = getSessionStatus(session)
                        const isToday = new Date().toDateString() === day.date.toDateString()
                        
                        return (
                          <div
                            key={session.id}
                            className={`p-2 rounded-lg text-xs mb-1 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105 ${
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
                            <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${sessionStatus.color}`}>
                              {sessionStatus.text}
                            </div>
                            {session.bookings && session.bookings.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                {session.bookings.length}/{session.capacity} alumnos
                              </div>
                            )}
                          </div>
                        )
                      })}
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
            
            if (daySessions.length === 0) {
              return null
            }
            
            return (
              <div key={day.date.toISOString()} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Header del día */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800">
                    {day.name.charAt(0).toUpperCase() + day.name.slice(1)} {formatDate(day.date, 'dd/MM/yyyy')}
                  </h3>
                </div>
                
                {/* Lista de clases del día */}
                <div className="divide-y divide-gray-100">
                  {daySessions.map((session, index) => {
                    const sessionStatus = getSessionStatus(session)
                    const isToday = new Date().toDateString() === day.date.toDateString()
                    
                    return (
                      <div
                        key={`${day.date.toISOString()}-${index}`}
                        className={`p-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer ${
                          isToday ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                        }`}
                        onClick={() => handleSessionClick(session)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Nombre de la clase */}
                            <div className="flex items-center space-x-3 mb-2">
                              <div
                                className="w-4 h-4 rounded-full shadow-sm"
                                style={{ backgroundColor: session.classType.color }}
                              ></div>
                              <h4 className="font-bold text-lg text-gray-900">
                                {session.classType.name}
                              </h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sessionStatus.color}`}>
                                {sessionStatus.text}
                              </span>
                            </div>
                            
                            {/* Detalles de la clase */}
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                <span>{session.room.name} - {session.room.location.name}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{formatTime(session.startAt)} a {formatTime(session.endAt)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Estado de la clase */}
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${sessionStatus.color.replace('bg-', 'text-').replace('-100', '-600')}`}>
                              {session.bookings && session.bookings.length > 0 ? (
                                <div>
                                  <div>{session.bookings.length}/{session.capacity} alumnos</div>
                                  <div className="text-xs">{sessionStatus.text}</div>
                                </div>
                              ) : (
                                <div>
                                  <div>0/{session.capacity} alumnos</div>
                                  <div className="text-xs">{sessionStatus.text}</div>
                                </div>
                              )}
                            </div>
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
            return daySessions.length === 0
          }) && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">No hay clases programadas para esta semana</p>
              <p className="text-sm">Crea nuevas clases o plantillas de horario</p>
            </div>
          )}
        </div>
        
          </>
        )}

                 {activeTab === 'templates' && (
           <div className="bg-white rounded-xl shadow-lg p-8">
             <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
               <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               Mis Plantillas de Horario
             </h2>
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
               {templates.map(template => (
                 <div key={template.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200">
                   <div className="p-6">
                     <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center space-x-3">
                         <div
                           className="w-6 h-6 rounded-full shadow-md"
                           style={{ backgroundColor: template.classType.color }}
                         ></div>
                         <h3 className="font-bold text-lg text-gray-900">
                           {template.classType.name}
                         </h3>
                       </div>
                       <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                         template.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                       }`}>
                         {template.active ? 'Activa' : 'Inactiva'}
                       </span>
                     </div>
                     
                     <div className="text-sm text-gray-600 mb-4 flex items-center">
                       <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                       </svg>
                       {template.room.name} - {template.room.location.name}
                     </div>

                     <div className="grid grid-cols-2 gap-4 text-sm bg-white rounded-lg p-4 border border-gray-200">
                       <div className="flex items-center">
                         <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                         </svg>
                         <span className="font-semibold">Días:</span>
                         <span className="ml-2">{template.daysOfWeek.map((day: number) => 
                           ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][day - 1]
                         ).join(', ')}</span>
                       </div>
                       <div className="flex items-center">
                         <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <span className="font-semibold">Hora:</span>
                         <span className="ml-2">{template.startTime}</span>
                       </div>
                       <div className="flex items-center">
                         <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l4 4m0-4l-4 4" />
                         </svg>
                         <span className="font-semibold">Duración:</span>
                         <span className="ml-2">{template.durationMin} min</span>
                       </div>
                       <div className="flex items-center">
                         <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                         </svg>
                         <span className="font-semibold">Capacidad:</span>
                         <span className="ml-2">{template.capacity}</span>
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
                   )}

                  {activeTab === 'alumnos' && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Lista de Alumnos
              </h2>
              
              <div className="mb-6 flex justify-between items-center">
                <p className="text-gray-600">Total de alumnos: {users.length}</p>
                <button
                  onClick={() => setShowRegisterStudent(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Registrar Nuevo Alumno
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Alumno
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Tokens
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Fecha de Registro
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/tokens/student-info?userId=${user.id}&gymId=${selectedGymId}`)
                                if (response.ok) {
                                  const data = await response.json()
                                  if (data.success) {
                                    alert(`Tokens disponibles: ${data.data.wallet.balance}`)
                                  }
                                }
                              } catch (error) {
                                console.error('Error al obtener tokens:', error)
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Ver Tokens
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => {
                                setShowAssignTokens(true)
                                // Aquí podrías pre-seleccionar el usuario
                              }}
                              className="inline-flex items-center px-3 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all duration-200 transform hover:scale-105"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              Asignar Tokens
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {users.length === 0 && (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay alumnos registrados</h3>
                  <p className="text-gray-600 mb-4">Comienza registrando tu primer alumno</p>
                  <button
                    onClick={() => setShowRegisterStudent(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Registrar Primer Alumno
                  </button>
                </div>
              )}
            </div>
          )}

                  {activeTab === 'management' && (
           <div className="space-y-8">
             {/* Estadísticas */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                 <div className="flex items-center justify-between">
                   <div>
                     <div className="text-3xl font-bold">{sessions.length}</div>
                     <div className="text-blue-100 text-sm font-medium">Clases esta semana</div>
                   </div>
                   <svg className="w-12 h-12 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                 </div>
               </div>
               
               <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                 <div className="flex items-center justify-between">
                   <div>
                     <div className="text-3xl font-bold">{templates.length}</div>
                     <div className="text-green-100 text-sm font-medium">Plantillas activas</div>
                   </div>
                   <svg className="w-12 h-12 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                 </div>
               </div>
               
               <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                 <div className="flex items-center justify-between">
                   <div>
                     <div className="text-3xl font-bold">{users.length}</div>
                     <div className="text-purple-100 text-sm font-medium">Alumnos</div>
                   </div>
                   <svg className="w-12 h-12 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                   </svg>
                 </div>
               </div>
               
               <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                 <div className="flex items-center justify-between">
                   <div>
                     <div className="text-3xl font-bold">{rooms.length}</div>
                     <div className="text-orange-100 text-sm font-medium">Salas disponibles</div>
                   </div>
                   <svg className="w-12 h-12 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                   </svg>
                 </div>
               </div>
             </div>

             {/* Alumnos Recientes */}
             <div className="bg-white rounded-xl shadow-lg p-8">
               <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                 <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                 </svg>
                 Alumnos Recientes
               </h2>
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                   <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                     <tr>
                       <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                         Alumno
                       </th>
                       <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                         Email
                       </th>
                       <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                         Acciones
                       </th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {users.slice(0, 10).map(user => (
                       <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center">
                             <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                               {user.name.charAt(0).toUpperCase()}
                             </div>
                             <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                           {user.email}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                           <button 
                             onClick={() => {
                               setShowAssignTokens(true)
                               // Aquí podrías pre-seleccionar el usuario
                             }}
                             className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all duration-200 transform hover:scale-105"
                           >
                             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                             </svg>
                             Asignar Tokens
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
         )}

                 {successMessage && (
           <div className="mt-6 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 text-green-700 p-6 rounded-lg shadow-md">
             <div className="flex items-center">
               <svg className="w-6 h-6 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
               </svg>
               <div>
                 <h3 className="font-bold text-lg">Éxito</h3>
                 <p className="text-sm">{successMessage}</p>
                 <button 
                   onClick={() => setSuccessMessage('')}
                   className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
                 >
                   Cerrar
                 </button>
               </div>
             </div>
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

      {/* Modales */}
      {showCreateTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Nueva Plantilla</h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                if (!currentUserId) {
                  setError('Error: Usuario no autenticado. Por favor, recarga la página.')
                  return
                }
                
                handleCreateTemplate({
                  profId: currentUserId,
                  roomId: formData.get('roomId'),
                  classTypeId: formData.get('classTypeId'),
                  daysOfWeek: [1, 3, 5], // Por defecto Lunes, Miércoles, Viernes
                  startTime: formData.get('startTime'),
                  durationMin: parseInt(formData.get('durationMin') as string),
                  capacity: parseInt(formData.get('capacity') as string)
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Clase</label>
                    <select name="classTypeId" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option value="">Seleccionar tipo</option>
                      {classTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sala</label>
                    <select name="roomId" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option value="">Seleccionar sala</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>{room.name} - {room.location.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hora de Inicio</label>
                    <input type="time" name="startTime" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duración (minutos)</label>
                    <input type="number" name="durationMin" min="15" max="180" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacidad</label>
                    <input type="number" name="capacity" min="1" max="50" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateTemplate(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Crear Plantilla
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Generar Clases desde Plantilla */}
      {showGenerateFromTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Generar Clases desde Plantilla</h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const templateId = formData.get('templateId') as string
                const weeks = parseInt(formData.get('weeks') as string)
                const startDate = formData.get('startDate') as string
                
                if (templateId && weeks && startDate) {
                  handleGenerateFromTemplate(templateId, weeks, startDate)
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seleccionar Plantilla
                    </label>
                    <select 
                      name="templateId" 
                      required 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="">Seleccionar plantilla...</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.classType.name} - {template.room.name} - {template.startTime} -                           {template.daysOfWeek.map((day: number) => {
                            const days = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
                            return days[day]
                          }).join(', ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Inicio
                    </label>
                    <input 
                      type="date" 
                      name="startDate" 
                      required 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Semanas
                    </label>
                    <input 
                      type="number" 
                      name="weeks" 
                      min="1" 
                      max="12" 
                      required 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="Ej: 4"
                      defaultValue="4"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Se generarán clases para las próximas {templates.find((t: any) => t.id === (document.querySelector('select[name="templateId"]') as HTMLSelectElement)?.value)?.daysOfWeek?.length || 0} sesiones por semana
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowGenerateFromTemplate(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                  >
                    Generar Clases
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showCreateClass && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Nueva Clase</h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const startDate = new Date(formData.get('startDate') as string)
                const startTime = formData.get('startTime') as string
                const [hours, minutes] = startTime.split(':').map(Number)
                startDate.setHours(hours, minutes, 0, 0)
                
                const endDate = new Date(startDate.getTime() + parseInt(formData.get('durationMin') as string) * 60 * 1000)
                
                if (!currentUserId) {
                  setError('Error: Usuario no autenticado. Por favor, recarga la página.')
                  return
                }
                
                handleCreateClass({
                  profId: currentUserId,
                  roomId: formData.get('roomId'),
                  classTypeId: formData.get('classTypeId'),
                  startAt: startDate,
                  endAt: endDate,
                  capacity: parseInt(formData.get('capacity') as string)
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Clase</label>
                    <select name="classTypeId" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option value="">Seleccionar tipo</option>
                      {classTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sala</label>
                    <select name="roomId" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option value="">Seleccionar sala</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>{room.name} - {room.location.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha</label>
                    <input type="date" name="startDate" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hora de Inicio</label>
                    <input type="time" name="startTime" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duración (minutos)</label>
                    <input type="number" name="durationMin" min="15" max="180" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacidad</label>
                    <input type="number" name="capacity" min="1" max="50" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateClass(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingClass}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all duration-200 ${
                      isCreatingClass 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isCreatingClass ? 'Creando...' : 'Crear Clase'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showAssignTokens && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Asignar Tokens a Alumno</h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleAssignTokens({
                  userId: formData.get('userId'),
                  tokens: parseInt(formData.get('tokens') as string),
                  reason: formData.get('reason')
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Alumno</label>
                    <select name="userId" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option value="">Seleccionar alumno</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cantidad de Tokens</label>
                    <input type="number" name="tokens" min="1" max="100" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Razón (opcional)</label>
                    <input type="text" name="reason" placeholder="Ej: Bono por buen comportamiento" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAssignTokens(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                  >
                    Asignar Tokens
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* Modal para Registrar Alumno */}
      {showRegisterStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Registrar Nuevo Alumno</h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleRegisterStudent({
                  name: formData.get('name'),
                  email: formData.get('email'),
                  password: formData.get('password')
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                    <input type="text" name="name" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-900 bg-white" placeholder="Nombre y Apellido" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" name="email" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-900 bg-white" placeholder="alumno@ejemplo.com" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                    <input type="password" name="password" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-900 bg-white" placeholder="Mínimo 6 caracteres" />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowRegisterStudent(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  >
                    Registrar Alumno
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* Modal para Detalles de Clase */}
      {showClassDetailsModal && selectedClass && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Header del modal */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div
                    className="w-12 h-12 rounded-lg shadow-md flex items-center justify-center"
                    style={{ backgroundColor: selectedClass.classType.color }}
                  >
                    <span className="text-white font-bold text-lg">
                      {selectedClass.classType.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedClass.classType.name}</h3>
                    <p className="text-gray-600">{selectedClass.room.name} - {selectedClass.room.location.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClassDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Información de la clase */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-blue-900">Fecha y Hora</span>
                  </div>
                  <p className="text-blue-800 mt-2">
                    {formatDate(selectedClass.startAt)} a las {formatTime(selectedClass.startAt)}
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-semibold text-green-900">Capacidad</span>
                  </div>
                  <p className="text-green-800 mt-2">
                    {classBookings.filter(b => b.status === 'RESERVADA').length} / {selectedClass.capacity} cupos ocupados
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-purple-900">Duración</span>
                  </div>
                  <p className="text-purple-800 mt-2">
                    {Math.round((new Date(selectedClass.endAt).getTime() - new Date(selectedClass.startAt).getTime()) / (1000 * 60))} minutos
                  </p>
                </div>
              </div>

              {/* Lista de alumnos reservados */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Alumnos Reservados ({classBookings.filter(b => b.status === 'RESERVADA').length})
                </h4>

                {isLoadingBookings ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Cargando reservas...</p>
                  </div>
                ) : classBookings.filter(b => b.status === 'RESERVADA').length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500 text-lg">No hay reservas para esta clase</p>
                    <p className="text-gray-400 text-sm">Los alumnos aún no han reservado cupos</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {classBookings
                      .filter(booking => booking.status === 'RESERVADA')
                      .map((booking, index) => (
                        <div key={booking.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{booking.alumno.name}</p>
                              <p className="text-sm text-gray-600">{booking.alumno.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                              Reservado
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(booking.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Botón de enviar notificaciones */}
              {classBookings.filter(b => b.status === 'RESERVADA').length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Enviar Notificación a Alumnos
                  </h5>
                  <div className="space-y-3">
                    <select
                      id="notificationType"
                      className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="INFO">Información General</option>
                      <option value="REMINDER">Recordatorio</option>
                      <option value="WARNING">Advertencia</option>
                      <option value="CANCELLATION">Cancelación</option>
                    </select>
                    <textarea
                      id="notificationMessage"
                      placeholder="Escribe tu mensaje para los alumnos..."
                      rows={3}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={async () => {
                        const type = (document.getElementById('notificationType') as HTMLSelectElement).value
                        const message = (document.getElementById('notificationMessage') as HTMLTextAreaElement).value
                        
                        if (!message.trim()) {
                          setError('Por favor, escribe un mensaje')
                          return
                        }
                        
                        try {
                          const response = await fetch('/api/notifications/send', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              sessionId: selectedClass.id,
                              message: message.trim(),
                              type
                            })
                          })
                          
                          const result = await response.json()
                          
                          if (result.success) {
                            setSuccessMessage(result.message || 'Notificaciones enviadas exitosamente')
                            // Limpiar campos
                            const messageElement = document.getElementById('notificationMessage') as HTMLTextAreaElement
                            if (messageElement) messageElement.value = ''
                          } else {
                            setError(result.error || 'Error al enviar notificaciones')
                          }
                        } catch (error) {
                          console.error('Error al enviar notificaciones:', error)
                          setError('Error interno al enviar notificaciones')
                        }
                      }}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      📨 Enviar Notificación
                    </button>
                  </div>
                </div>
              )}

              {/* Footer del modal */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowClassDetailsModal(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={async () => {
                    if (confirm('¿Estás seguro de que quieres cancelar esta clase? Esta acción no se puede deshacer y se reembolsarán los tokens a todos los alumnos reservados.')) {
                      try {
                        const response = await fetch(`/api/sessions/${selectedClass.id}/cancel`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          }
                        })
                        
                        const result = await response.json()
                        
                        if (result.success) {
                          setSuccessMessage(result.message)
                          setShowClassDetailsModal(false)
                          // Recargar datos del dashboard
                          fetchDashboardData()
                        } else {
                          setError(result.error || 'Error al cancelar la clase')
                        }
                      } catch (error) {
                        console.error('Error al cancelar clase:', error)
                        setError('Error interno al cancelar la clase')
                      }
                    }
                  }}
                  className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Cancelar Clase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
