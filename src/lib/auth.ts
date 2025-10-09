import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

// Errores de autenticación
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// Generar tokens JWT
export function generateAccessToken(userId: string, role: UserRole): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET no configurado')
  
  return require('jsonwebtoken').sign(
    { userId, role, type: 'access' },
    secret,
    { expiresIn: '15m' }
  )
}

export function generateRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('JWT_REFRESH_SECRET no configurado')
  
  return require('jsonwebtoken').sign(
    { userId, type: 'refresh' },
    secret,
    { expiresIn: '7d' }
  )
}

// Verificar tokens
export function verifyAccessToken(token: string): { userId: string; role: UserRole } {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET no configurado')
  
  try {
    const decoded = verify(token, secret) as any
    if (decoded.type !== 'access') {
      throw new AuthError('Token inválido', 401)
    }
    return { userId: decoded.userId, role: decoded.role }
  } catch (error) {
    throw new AuthError('Token inválido', 401)
  }
}

export function verifyRefreshToken(token: string): { userId: string } {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('JWT_REFRESH_SECRET no configurado')
  
  try {
    const decoded = verify(token, secret) as any
    if (decoded.type !== 'refresh') {
      throw new AuthError('Token de refresh inválido', 401)
    }
    return { userId: decoded.userId }
  } catch (error) {
    throw new AuthError('Token de refresh inválido', 401)
  }
}

// Manejo de cookies
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  response.cookies.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 // 15 minutos
  })
  
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 // 7 días
  })
  
  return response
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete('accessToken')
  response.cookies.delete('refreshToken')
  return response
}

export function getAccessTokenFromCookies(request: NextRequest): string | null {
  return request.cookies.get('accessToken')?.value || null
}

export function getRefreshTokenFromCookies(request: NextRequest): string | null {
  return request.cookies.get('refreshToken')?.value || null
}

// Obtener usuario actual
export async function getCurrentUser(request: NextRequest) {
  const token = getAccessTokenFromCookies(request)
  if (!token) {
    throw new AuthError('No autenticado', 401)
  }
  
  const { userId } = verifyAccessToken(token)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true
    }
  })
  
  if (!user || user.status !== 'ACTIVE') {
    throw new AuthError('Usuario no encontrado o inactivo', 401)
  }
  
  return user
}

// Verificar roles
export function hasRole(user: any, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(user.role)
}

export function requireRole(requiredRoles: UserRole[]) {
  return function(user: any) {
    if (!hasRole(user, requiredRoles)) {
      throw new AuthError('Acceso denegado', 403)
    }
  }
}

// Middleware de autenticación
export function withAuth(handler: Function) {
  return async function(request: NextRequest) {
    try {
      const user = await getCurrentUser(request)
      return handler(request, user)
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.statusCode }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Error de autenticación' },
        { status: 500 }
      )
    }
  }
}

// Middleware de autorización por rol
export function withRole(requiredRoles: UserRole[]) {
  return function(handler: Function) {
    return withAuth(async function(request: NextRequest, user: any) {
      try {
        requireRole(requiredRoles)(user)
        return handler(request, user)
      } catch (error) {
        if (error instanceof AuthError) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: error.statusCode }
          )
        }
        return NextResponse.json(
          { success: false, error: 'Error de autorización' },
          { status: 500 }
        )
      }
    })
  }
}
