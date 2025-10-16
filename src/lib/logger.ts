/**
 * Sistema de logging profesional para PowerTurnos
 * 
 * Características:
 * - Desactiva logs automáticamente en producción
 * - Soporte para diferentes niveles de log
 * - Formato consistente y legible
 * - Performance optimizado para producción
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableColors: boolean;
  prefix: string;
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Configuración basada en el entorno
    this.config = {
      level: isDevelopment ? LogLevel.DEBUG : LogLevel.WARN,
      enableConsole: !isProduction, // Desactivar console en producción
      enableColors: isDevelopment,
      prefix: '[PowerTurnos]'
    };

    // En producción, reemplazar console.log con función vacía para mejor performance
    if (isProduction) {
      this.disableConsoleInProduction();
    }
  }

  private disableConsoleInProduction() {
    // Reemplazar métodos de console con funciones vacías en producción
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `${this.config.prefix} [${timestamp}] [${level}] ${message}`;
    
    if (data !== undefined) {
      return `${baseMessage} ${JSON.stringify(data, null, 2)}`;
    }
    
    return baseMessage;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.enableConsole && level >= this.config.level;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage('DEBUG', message, data);
      console.log(formattedMessage);
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage('INFO', message, data);
      console.info(formattedMessage);
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage('WARN', message, data);
      console.warn(formattedMessage);
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formattedMessage = this.formatMessage('ERROR', message, error);
      console.error(formattedMessage);
    }
  }

  // Métodos de conveniencia para casos comunes
  apiCall(endpoint: string, method: string, data?: any): void {
    this.debug(`API ${method} ${endpoint}`, data);
  }

  userAction(action: string, userId?: string, data?: any): void {
    this.info(`Usuario ${userId || 'desconocido'} - ${action}`, data);
  }

  systemEvent(event: string, data?: any): void {
    this.info(`Sistema - ${event}`, data);
  }

  performance(operation: string, duration: number): void {
    this.debug(`Performance - ${operation} tomó ${duration}ms`);
  }
}

// Exportar instancia singleton
export const logger = new Logger();

// Exportar función helper para reemplazar console.log fácilmente
export const log = logger.debug.bind(logger);

// Función para limpiar logs de desarrollo (usar solo en casos críticos)
export const logError = logger.error.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
