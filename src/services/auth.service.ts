import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export class AuthService {
  // Registrar nuevo usuario
  static async register(data: {
    name: string
    email: string
    password: string
    role: 'ADMIN' | 'PROFESOR' | 'ALUMNO'
  }) {
    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      throw new AuthError('El email ya está registrado', 400)
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(data.password, 12)

    // Crear el usuario
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return user
  }

  // Iniciar sesión
  static async login(data: { email: string; password: string }) {
    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (!user) {
      throw new AuthError('Credenciales inválidas', 401)
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(data.password, user.password)
    if (!isValidPassword) {
      throw new AuthError('Credenciales inválidas', 401)
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'ACTIVE') {
      throw new AuthError('Usuario inactivo', 401)
    }

    // Generar tokens
    const { generateAccessToken, generateRefreshToken } = await import('@/lib/auth')
    const accessToken = generateAccessToken(user.id, user.role)
    const refreshToken = generateRefreshToken(user.id)

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      },
      accessToken,
      refreshToken
    }
  }

  // Refrescar token
  static async refreshToken(refreshToken: string) {
    const { verifyRefreshToken, generateAccessToken, generateRefreshToken: generateNewRefreshToken } = await import('@/lib/auth')
    
    try {
      const { userId } = verifyRefreshToken(refreshToken)
      
      // Verificar que el usuario existe y esté activo
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          status: true
        }
      })

      if (!user || user.status !== 'ACTIVE') {
        throw new AuthError('Usuario no encontrado o inactivo', 401)
      }

      // Generar nuevos tokens
      const newAccessToken = generateAccessToken(user.id, user.role)
      const newRefreshToken = generateNewRefreshToken(user.id)

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    } catch (error) {
      throw new AuthError('Token de refresh inválido', 401)
    }
  }

  // Cerrar sesión
  static async logout(userId: string) {
    // Por ahora solo retornamos éxito
    // En el futuro podríamos invalidar tokens en una blacklist
    return { success: true }
  }

  // Cambiar contraseña
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    // Obtener usuario con contraseña
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new AuthError('Usuario no encontrado', 404)
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      throw new AuthError('Contraseña actual incorrecta', 400)
    }

    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    })

    return { success: true }
  }

  // Verificar contraseña
  static async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return false
    }

    return bcrypt.compare(password, user.password)
  }

  // Obtener perfil del usuario
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        gymMemberships: {
          where: { isActive: true },
          select: {
            id: true,
            roleInGym: true,
            isActive: true,
            gym: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      throw new AuthError('Usuario no encontrado', 404)
    }

    return user
  }

  // Actualizar perfil del usuario
  static async updateProfile(
    userId: string,
    data: { name?: string; email?: string }
  ) {
    // Si se está cambiando el email, verificar que no exista
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          id: { not: userId }
        }
      })

      if (existingUser) {
        throw new AuthError('El email ya está en uso', 400)
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return user
  }
}
