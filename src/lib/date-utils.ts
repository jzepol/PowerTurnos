import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isValid, differenceInDays, isSameDay, isToday, isThisWeek, isThisMonth } from 'date-fns'
import { es } from 'date-fns/locale'

// Configuración de zona horaria por defecto
const DEFAULT_TIMEZONE = 'America/Argentina/San_Luis'

// Formateo de fechas
export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return 'Fecha inválida'
  return format(dateObj, formatStr, { locale: es })
}

export function formatTime(date: Date | string, formatStr: string = 'HH:mm'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return 'Hora inválida'
  return format(dateObj, formatStr)
}

export function formatDateTime(date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return 'Fecha y hora inválidas'
  return format(dateObj, formatStr, { locale: es })
}

// Utilidades de semana
export function getWeekDays(startDate: Date = new Date()): Date[] {
  const start = startOfWeek(startDate, { weekStartsOn: 1 }) // Lunes
  const end = endOfWeek(startDate, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function getWeekDaysWithNames(startDate: Date = new Date()): Array<{ date: Date; name: string; shortName: string }> {
  const days = getWeekDays(startDate)
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const shortDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  
  return days.map((date, index) => ({
    date,
    name: dayNames[index],
    shortName: shortDayNames[index]
  }))
}

export function getNextWeek(currentDate: Date = new Date()): Date {
  return addWeeks(currentDate, 1)
}

export function getPreviousWeek(currentDate: Date = new Date()): Date {
  return addWeeks(currentDate, -1)
}

// Utilidades de mes
export function getMonthDays(year: number, month: number): Date[] {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  return eachDayOfInterval({ start: startDate, end: endDate })
}

export function getMonthDaysWithNames(year: number, month: number): Array<{ date: Date; dayOfMonth: number; isCurrentMonth: boolean }> {
  const currentMonthDays = getMonthDays(year, month)
  const firstDay = startOfWeek(currentMonthDays[0], { weekStartsOn: 1 })
  const lastDay = endOfWeek(currentMonthDays[currentMonthDays.length - 1], { weekStartsOn: 1 })
  
  const allDays = eachDayOfInterval({ start: firstDay, end: lastDay })
  
  return allDays.map(date => ({
    date,
    dayOfMonth: date.getDate(),
    isCurrentMonth: date.getMonth() === month - 1
  }))
}

// Utilidades de tiempo
export function parseTime(timeString: string): Date | null {
  const [hours, minutes] = timeString.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }
  
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

export function formatTimeFromString(timeString: string, formatStr: string = 'HH:mm'): string {
  const time = parseTime(timeString)
  if (!time) return 'Hora inválida'
  return format(time, formatStr)
}

export function addMinutesToTime(timeString: string, minutes: number): string {
  const time = parseTime(timeString)
  if (!time) return timeString
  
  const newTime = addDays(time, Math.floor(minutes / 1440)) // Maneja cambios de día
  newTime.setMinutes(newTime.getMinutes() + (minutes % 1440))
  
  return format(newTime, 'HH:mm')
}

// Generación de sesiones
export function generateSessionDates(
  startDate: Date,
  daysOfWeek: number[],
  weeks: number
): Date[] {
  const dates: Date[] = []
  let currentDate = new Date(startDate)
  
  for (let week = 0; week < weeks; week++) {
    for (const dayOfWeek of daysOfWeek) {
      const targetDate = new Date(currentDate)
      const currentDayOfWeek = targetDate.getDay()
      const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7
      
      if (daysToAdd > 0) {
        targetDate.setDate(targetDate.getDate() + daysToAdd)
      }
      
      dates.push(new Date(targetDate))
    }
    
    currentDate = addWeeks(currentDate, 1)
  }
  
  return dates.sort((a, b) => a.getTime() - b.getTime())
}

// Verificaciones de fechas
export function isDateInFuture(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return dateObj > new Date()
}

export function isDateInPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return dateObj < new Date()
}

export function isDateToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return isToday(dateObj)
}

export function isDateThisWeek(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return isThisWeek(dateObj, { weekStartsOn: 1 })
}

// Utilidades de zona horaria
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function isDefaultTimezone(): boolean {
  return getCurrentTimezone() === DEFAULT_TIMEZONE
}

// Utilidades de etiquetas
export function getTimeSlotLabel(startTime: string, durationMin: number): string {
  const start = parseTime(startTime)
  if (!start) return 'Horario inválido'
  
  const end = new Date(start.getTime() + durationMin * 60000)
  return `${formatTime(start)} - ${formatTime(end)}`
}

export function getDateRangeLabel(startDate: Date, endDate: Date): string {
  if (isSameDay(startDate, endDate)) {
    return formatDate(startDate)
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

export function getRelativeDateLabel(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (isToday(dateObj)) return 'Hoy'
  if (isThisWeek(dateObj, { weekStartsOn: 1 })) return formatDate(dateObj, 'EEEE')
  
  const daysDiff = differenceInDays(dateObj, new Date())
  if (daysDiff === 1) return 'Mañana'
  if (daysDiff === -1) return 'Ayer'
  if (daysDiff > 0) return `En ${daysDiff} días`
  if (daysDiff < 0) return `Hace ${Math.abs(daysDiff)} días`
  
  return formatDate(dateObj)
}

// Utilidades de calendario
export function getCalendarGrid(year: number, month: number): Array<Array<{ date: Date; dayOfMonth: number; isCurrentMonth: boolean }>> {
  const days = getMonthDaysWithNames(year, month)
  const grid: Array<Array<{ date: Date; dayOfMonth: number; isCurrentMonth: boolean }>> = []
  let week: Array<{ date: Date; dayOfMonth: number; isCurrentMonth: boolean }> = []
  
  days.forEach(day => {
    week.push(day)
    
    if (week.length === 7) {
      grid.push(week)
      week = []
    }
  })
  
  if (week.length > 0) {
    grid.push(week)
  }
  
  return grid
}
