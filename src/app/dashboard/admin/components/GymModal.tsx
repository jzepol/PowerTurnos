'use client'

import { useState, useEffect } from 'react'

interface Gym {
  id: string
  name: string
  timezone: string
}

interface GymModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; timezone: string; ownerId?: string }) => void
  gym?: Gym | null
  users: Array<{ id: string; name: string; email: string; role: string }>
}

export default function GymModal({ isOpen, onClose, onSubmit, gym, users }: GymModalProps) {
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('America/Argentina/San_Luis')
  const [ownerId, setOwnerId] = useState('')

  useEffect(() => {
    if (gym) {
      setName(gym.name)
      setTimezone(gym.timezone)
    } else {
      setName('')
      setTimezone('America/Argentina/San_Luis')
      setOwnerId('')
    }
  }, [gym])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !timezone.trim()) {
      alert('Por favor completa todos los campos')
      return
    }

    if (!gym && !ownerId) {
      alert('Por favor selecciona un dueño para el gimnasio')
      return
    }

    onSubmit({
      name: name.trim(),
      timezone,
      ownerId: gym ? undefined : ownerId
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {gym ? 'Editar Gimnasio' : 'Crear Nuevo Gimnasio'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Gimnasio
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del gimnasio"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zona Horaria
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="America/Argentina/San_Luis">America/Argentina/San_Luis</option>
              <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</option>
              <option value="America/Argentina/Cordoba">America/Argentina/Cordoba</option>
              <option value="America/Argentina/Mendoza">America/Argentina/Mendoza</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {!gym && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dueño del Gimnasio
              </label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecciona un usuario</option>
                {users
                  .filter(user => user.role === 'ADMIN')
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {gym ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
