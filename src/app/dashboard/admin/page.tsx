'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/date-utils'
import GymModal from './components/GymModal'
import UserModal from './components/UserModal'

interface Gym {
  id: string
  name: string
  timezone: string
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}

interface Session {
  id: string
  startAt: string
  endAt: string
  capacity: number
  classType: {
    name: string
  }
  room: {
    name: string
  }
  professor: {
    name: string
  }
  bookings: Array<{
    id: string
    status: string
  }>
}

export default function AdminDashboard() {
  const [gyms, setGyms] = useState<Gym[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [unassignedUsers, setUnassignedUsers] = useState<User[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateGym, setShowCreateGym] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showAssignTokens, setShowAssignTokens] = useState(false)
  const [showAssignUserToGym, setShowAssignUserToGym] = useState(false)
  const [editingGym, setEditingGym] = useState<Gym | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Obtener gimnasios
      try {
        const gymsResponse = await fetch('/api/gyms')
        if (gymsResponse.ok) {
          const gymsData = await gymsResponse.json()
          if (gymsData.success) {
            setGyms(gymsData.data)
          }
        }
      } catch (error) {
        console.error('Error al obtener gimnasios:', error)
      }

      // Obtener usuarios
      try {
        const usersResponse = await fetch('/api/users')
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          if (usersData.success) {
            setUsers(usersData.data)
          }
        }
      } catch (error) {
        console.error('Error al obtener usuarios:', error)
      }

      // Obtener usuarios sin asignar
      try {
        const unassignedResponse = await fetch('/api/users?unassigned=true')
        if (unassignedResponse.ok) {
          const unassignedData = await unassignedResponse.json()
          if (unassignedData.success) {
            setUnassignedUsers(unassignedData.data)
          }
        }
      } catch (error) {
        console.error('Error al obtener usuarios sin asignar:', error)
      }

      // Obtener sesiones recientes
      try {
        const sessionsResponse = await fetch('/api/sessions?limit=10')
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json()
          if (sessionsData.success) {
            setSessions(sessionsData.data)
          }
        }
      } catch (error) {
        console.error('Error al obtener sesiones:', error)
      }
    } catch (error) {
      setError('Error al cargar los datos del dashboard')
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateGym = async (gymData: { name: string; timezone: string; ownerId?: string }) => {
    try {
      const response = await fetch('/api/gyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gymData)
      })

      if (response.ok) {
        setShowCreateGym(false)
        fetchDashboardData() // Recargar datos
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al crear gimnasio')
      }
    } catch (error) {
      setError('Error al crear gimnasio')
    }
  }

  const handleUpdateGym = async (gymId: string, gymData: { name: string; timezone: string }) => {
    try {
      const response = await fetch(`/api/gyms/${gymId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gymData)
      })

      if (response.ok) {
        setEditingGym(null)
        fetchDashboardData() // Recargar datos
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al actualizar gimnasio')
      }
    } catch (error) {
      setError('Error al actualizar gimnasio')
    }
  }

  const handleDeleteGym = async (gymId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este gimnasio?')) return

    try {
      const response = await fetch(`/api/gyms/${gymId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchDashboardData() // Recargar datos
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al eliminar gimnasio')
      }
    } catch (error) {
      setError('Error al eliminar gimnasio')
    }
  }

  const handleCreateUser = async (userData: { name: string; email: string; password?: string; role: string; gymId?: string }) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      if (response.ok) {
        setShowCreateUser(false)
        fetchDashboardData() // Recargar datos
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al crear usuario')
      }
    } catch (error) {
      setError('Error al crear usuario')
    }
  }

  const handleUpdateUser = async (userId: string, userData: { name: string; email: string; role: string; status: string; password?: string }) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      if (response.ok) {
        setEditingUser(null)
        fetchDashboardData() // Recargar datos
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al actualizar usuario')
      }
    } catch (error) {
      setError('Error al actualizar usuario')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchDashboardData() // Recargar datos
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al eliminar usuario')
      }
    } catch (error) {
      setError('Error al eliminar usuario')
    }
  }

  const handleAssignTokens = async (tokenData: any) => {
    try {
      const response = await fetch('/api/tokens/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenData)
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

  const handleAssignUserToGym = async (assignmentData: { userId: string; gymId: string; roleInGym: string }) => {
    try {
      const response = await fetch('/api/users/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData)
      })

      if (response.ok) {
        setShowAssignUserToGym(false)
        fetchDashboardData() // Recargar datos
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al asignar usuario')
      }
    } catch (error) {
      setError('Error al asignar usuario')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard del Administrador</h1>
              <p className="text-gray-600">Gestiona gimnasios, usuarios y sistema</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={async () => {
                  try {
                    console.log('🚀 Dashboard Admin - Iniciando logout...')
                    
                    const response = await fetch('/api/auth/logout', { 
                      method: 'POST',
                      credentials: 'include' // Importante: incluir cookies
                    })
                    
                    const result = await response.json()
                    
                    if (result.success) {
                      console.log('✅ Dashboard Admin - Logout exitoso, redirigiendo...')
                      // Redirigir a la página de login
                      window.location.href = '/'
                    } else {
                      console.error('❌ Dashboard Admin - Error en logout:', result.error)
                      alert('Error al cerrar sesión')
                    }
                  } catch (error) {
                    console.error('💥 Dashboard Admin - Error interno en logout:', error)
                    alert('Error interno al cerrar sesión')
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{gyms.length}</div>
              <div className="text-sm text-gray-600">Gimnasios</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{users.length}</div>
              <div className="text-sm text-gray-600">Usuarios</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{sessions.length}</div>
              <div className="text-sm text-gray-600">Sesiones</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {users.filter(u => u.role === 'ALUMNO').length}
              </div>
              <div className="text-sm text-gray-600">Alumnos</div>
            </div>
          </div>
        </div>

        {/* Gimnasios */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Gimnasios</h2>
            <button
              onClick={() => setShowCreateGym(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              + Nuevo Gimnasio
            </button>
          </div>
          <div className="space-y-4">
            {gyms.map(gym => (
              <div key={gym.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{gym.name}</h3>
                  <p className="text-sm text-gray-600">Timezone: {gym.timezone}</p>
                  <p className="text-sm text-gray-500">Creado: {formatDate(gym.createdAt)}</p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setEditingGym(gym)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDeleteGym(gym.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usuarios Recientes */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Usuarios Recientes</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowCreateUser(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                + Nuevo Usuario
              </button>
              <button
                onClick={() => setShowAssignTokens(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                Asignar Tokens
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.slice(0, 10).map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                        user.role === 'PROFESOR' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        user.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => setEditingUser(user)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Usuarios Sin Asignar */}
        {unassignedUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Usuarios Sin Asignar a Gimnasio</h2>
              <button
                onClick={() => setShowAssignUserToGym(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
              >
                Asignar a Gimnasio
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Registro
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unassignedUsers.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                          user.role === 'PROFESOR' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          user.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sesiones Recientes */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sesiones Recientes</h2>
          <div className="space-y-4">
            {sessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div>
                    <h3 className="font-medium text-gray-900">{session.classType.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(session.startAt)} - {session.room.name}
                    </p>
                    <p className="text-sm text-gray-500">Prof: {session.professor.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-900">
                    {session.bookings.filter(b => ['RESERVADA', 'ASISTIO'].includes(b.status)).length}/{session.capacity}
                  </div>
                  <div className="text-xs text-gray-500">cupos ocupados</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Modales */}
      <GymModal
        isOpen={showCreateGym || !!editingGym}
        onClose={() => {
          setShowCreateGym(false)
          setEditingGym(null)
        }}
        onSubmit={(data) => {
          if (editingGym) {
            handleUpdateGym(editingGym.id, data)
          } else {
            handleCreateGym(data)
          }
        }}
        gym={editingGym}
        users={users}
      />

      <UserModal
        isOpen={showCreateUser || !!editingUser}
        onClose={() => {
          setShowCreateUser(false)
          setEditingUser(null)
        }}
        onSubmit={(data) => {
          if (editingUser) {
            handleUpdateUser(editingUser.id, data)
          } else {
            handleCreateUser(data)
          }
        }}
        user={editingUser}
        gyms={gyms}
      />

      {/* Modal para Asignar Tokens */}
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
                  gymId: formData.get('gymId'),
                  tokens: parseInt(formData.get('tokens') as string),
                  reason: formData.get('reason')
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gimnasio</label>
                    <select name="gymId" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option value="">Seleccionar gimnasio</option>
                      {gyms.map(gym => (
                        <option key={gym.id} value={gym.id}>{gym.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Alumno</label>
                    <select name="userId" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option value="">Seleccionar alumno</option>
                      {users.filter(u => u.role === 'ALUMNO').map(user => (
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

      {/* Modal para Asignar Usuario a Gimnasio */}
      {showAssignUserToGym && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Asignar Usuario a Gimnasio</h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleAssignUserToGym({
                  userId: formData.get('userId') as string,
                  gymId: formData.get('gymId') as string,
                  roleInGym: formData.get('roleInGym') as string
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Usuario</label>
                    <select name="userId" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option value="">Seleccionar usuario</option>
                      {unassignedUsers.map(user => (
                        <option key={user.id} value={user.id}>{user.name} ({user.email}) - {user.role}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gimnasio</label>
                    <select name="gymId" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option value="">Seleccionar gimnasio</option>
                      {gyms.map(gym => (
                        <option key={gym.id} value={gym.id}>{gym.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rol en el Gimnasio</label>
                    <select name="roleInGym" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option value="">Seleccionar rol</option>
                      <option value="ADMIN">Administrador</option>
                      <option value="PROFESOR">Profesor</option>
                      <option value="ALUMNO">Alumno</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAssignUserToGym(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
                  >
                    Asignar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
