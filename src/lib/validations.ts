import { z } from 'zod'

// Esquemas de usuario
export const userSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['ADMIN', 'PROFESOR', 'ALUMNO'])
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida')
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
})

// Esquemas de gimnasio
export const gymSchema = z.object({
  name: z.string().min(2, 'El nombre del gimnasio debe tener al menos 2 caracteres'),
  timezone: z.string().default('America/Argentina/San_Luis'),
  holidays: z.array(z.string()).optional()
})

// Esquemas de ubicación y salas
export const locationSchema = z.object({
  name: z.string().min(2, 'El nombre de la ubicación debe tener al menos 2 caracteres'),
  address: z.string().optional(),
  gymId: z.string().cuid('ID de gimnasio inválido')
})

export const roomSchema = z.object({
  name: z.string().min(2, 'El nombre de la sala debe tener al menos 2 caracteres'),
  capacity: z.number().int().positive('La capacidad debe ser un número positivo'),
  locationId: z.string().cuid('ID de ubicación inválido')
})

// Esquemas de tipos de clase
export const classTypeSchema = z.object({
  name: z.string().min(2, 'El nombre del tipo de clase debe tener al menos 2 caracteres'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'El color debe ser un código hexadecimal válido'),
  durationMin: z.number().int().positive('La duración debe ser un número positivo'),
  gymId: z.string().cuid('ID de gimnasio inválido')
})

// Esquemas de plantillas de horario
export const scheduleTemplateSchema = z.object({
  gymId: z.string().cuid('ID de gimnasio inválido'),
  profId: z.string().cuid('ID de profesor inválido'),
  roomId: z.string().cuid('ID de sala inválido'),
  classTypeId: z.string().cuid('ID de tipo de clase inválido'),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).refine(
    (days) => days.every(day => day >= 1 && day <= 7),
    'Los días de la semana deben ser números del 1 al 7'
  ),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'El formato de hora debe ser HH:MM'),
  durationMin: z.number().int().positive('La duración debe ser un número positivo'),
  capacity: z.number().int().positive('La capacidad debe ser un número positivo'),
  active: z.boolean().default(true)
})

// Esquemas de sesiones
export const sessionSchema = z.object({
  gymId: z.string().cuid('ID de gimnasio inválido'),
  profId: z.string().cuid('ID de profesor inválido'),
  roomId: z.string().cuid('ID de sala inválido'),
  classTypeId: z.string().cuid('ID de tipo de clase inválido'),
  startAt: z.string().datetime('Fecha de inicio inválida'),
  endAt: z.string().datetime('Fecha de fin inválida'),
  capacity: z.number().int().positive('La capacidad debe ser un número positivo')
})

// Esquemas de planes de paquetes
export const packagePlanSchema = z.object({
  gymId: z.string().cuid('ID de gimnasio inválido'),
  name: z.string().min(2, 'El nombre del plan debe tener al menos 2 caracteres'),
  tokens: z.number().int().positive('El número de tokens debe ser positivo'),
  validityDays: z.number().int().positive('Los días de validez deben ser positivos'),
  price: z.number().positive('El precio debe ser positivo'),
  rules: z.object({
    cancelBeforeHours: z.number().int().min(0, 'Las horas de cancelación no pueden ser negativas'),
    noShowPenalty: z.boolean(),
    transferable: z.boolean()
  }),
  isActive: z.boolean().default(true)
})

// Esquemas de tokens
export const tokenGrantSchema = z.object({
  userId: z.string().cuid('ID de usuario inválido'),
  gymId: z.string().cuid('ID de gimnasio inválido'),
  planId: z.string().cuid('ID de plan inválido').optional(),
  tokens: z.number().int().positive('El número de tokens debe ser positivo'),
  source: z.enum(['COMPRA', 'ASIGNACION', 'BONO'])
})

export const transferTokensSchema = z.object({
  fromUserId: z.string().cuid('ID de usuario origen inválido'),
  toUserId: z.string().cuid('ID de usuario destino inválido'),
  gymId: z.string().cuid('ID de gimnasio inválido'),
  tokens: z.number().int().positive('El número de tokens debe ser positivo'),
  reason: z.string().optional()
})

// Esquemas de reservas
export const bookingSchema = z.object({
  sessionId: z.string().cuid('ID de sesión inválido'),
  alumnoId: z.string().cuid('ID de alumno inválido'),
  tokenGrantId: z.string().cuid('ID de concesión de tokens inválido').optional()
})

export const cancelBookingSchema = z.object({
  bookingId: z.string().cuid('ID de reserva inválido'),
  reason: z.string().optional()
})

// Esquemas de lista de espera
export const waitlistSchema = z.object({
  sessionId: z.string().cuid('ID de sesión inválido'),
  alumnoId: z.string().cuid('ID de alumno inválido')
})

// Esquemas de pagos
export const paymentSchema = z.object({
  userId: z.string().cuid('ID de usuario inválido'),
  gymId: z.string().cuid('ID de gimnasio inválido'),
  planId: z.string().cuid('ID de plan inválido'),
  amount: z.number().positive('El monto debe ser positivo'),
  currency: z.string().default('ARS'),
  provider: z.string().default('mercadopago')
})

// Esquemas de filtros
export const sessionFiltersSchema = z.object({
  gymId: z.string().cuid('ID de gimnasio inválido').optional(),
  profId: z.string().cuid('ID de profesor inválido').optional(),
  classTypeId: z.string().cuid('ID de tipo de clase inválido').optional(),
  startDate: z.string().datetime('Fecha de inicio inválida').optional(),
  endDate: z.string().datetime('Fecha de fin inválida').optional(),
  status: z.enum(['PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA']).optional()
})

export const bookingFiltersSchema = z.object({
  userId: z.string().cuid('ID de usuario inválido').optional(),
  sessionId: z.string().cuid('ID de sesión inválido').optional(),
  status: z.enum(['RESERVADA', 'CANCELADA', 'ASISTIO', 'NO_SHOW']).optional(),
  startDate: z.string().datetime('Fecha de inicio inválida').optional(),
  endDate: z.string().datetime('Fecha de fin inválida').optional()
})

// Esquemas de reportes
export const reportFiltersSchema = z.object({
  gymId: z.string().cuid('ID de gimnasio inválido'),
  startDate: z.string().datetime('Fecha de inicio inválida'),
  endDate: z.string().datetime('Fecha de fin inválida'),
  classTypeId: z.string().cuid('ID de tipo de clase inválido').optional(),
  profId: z.string().cuid('ID de profesor inválido').optional()
})

// Esquemas de auditoría
export const auditLogFiltersSchema = z.object({
  entity: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().cuid('ID de actor inválido').optional(),
  action: z.string().optional(),
  startDate: z.string().datetime('Fecha de inicio inválida').optional(),
  endDate: z.string().datetime('Fecha de fin inválida').optional()
})

// Esquemas de generación de sesiones
export const generateSessionsSchema = z.object({
  templateId: z.string().cuid('ID de plantilla inválido'),
  weeks: z.number().int().min(1).max(52, 'El número de semanas debe estar entre 1 y 52'),
  startDate: z.string().datetime('Fecha de inicio inválida')
})

// Esquemas de check-in
export const checkInSchema = z.object({
  sessionId: z.string().cuid('ID de sesión inválido'),
  alumnoId: z.string().cuid('ID de alumno inválido'),
  method: z.enum(['manual', 'qr'])
})

// Esquemas de webhook de Mercado Pago
export const mercadopagoWebhookSchema = z.object({
  data: z.object({
    id: z.string()
  }),
  type: z.string()
})

// Esquemas de notificaciones
export const notificationSchema = z.object({
  userId: z.string().cuid('ID de usuario inválido'),
  type: z.enum(['email', 'whatsapp', 'push']),
  subject: z.string().min(1, 'El asunto es requerido'),
  message: z.string().min(1, 'El mensaje es requerido'),
  data: z.any().optional()
})
