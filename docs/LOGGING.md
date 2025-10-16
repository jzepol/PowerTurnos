# Sistema de Logging - PowerTurnos

## 🎯 Objetivo

Este sistema de logging profesional reemplaza los `console.log` dispersos en el código con un sistema centralizado que:

- ✅ **Desactiva automáticamente los logs en producción**
- ✅ **Mejora el rendimiento en producción**
- ✅ **Proporciona logs estructurados y útiles**
- ✅ **Facilita el debugging en desarrollo**

## 🚀 Uso Rápido

### Importar el Logger

```typescript
import { logger } from '@/lib/logger';

// O para casos específicos
import { log, logError, logInfo, logWarn } from '@/lib/logger';
```

### Ejemplos de Uso

```typescript
// En lugar de console.log('Debug info', data)
logger.debug('Información de debug', data);

// Para llamadas API
logger.apiCall('/api/users', 'GET', { userId: 123 });

// Para acciones de usuario
logger.userAction('Usuario inició sesión', userId, { email: 'user@example.com' });

// Para eventos del sistema
logger.systemEvent('Cache limpiado', { size: '10MB' });

// Para errores
logger.error('Error crítico', error);

// Para advertencias
logger.warn('Datos faltantes', { field: 'email' });
```

## 📊 Niveles de Log

| Nivel | Cuándo usar | Visible en |
|-------|-------------|------------|
| `DEBUG` | Información detallada para debugging | Solo desarrollo |
| `INFO` | Información general del flujo | Desarrollo y producción |
| `WARN` | Advertencias que no rompen la funcionalidad | Desarrollo y producción |
| `ERROR` | Errores que requieren atención | Desarrollo y producción |

## 🔧 Configuración

### Variables de Entorno

```env
# .env.local
LOG_LEVEL="debug"          # debug, info, warn, error
ENABLE_LOGGING="true"      # true para desarrollo, false para producción
```

### Configuración Automática

El sistema se configura automáticamente según `NODE_ENV`:

- **Desarrollo**: Todos los logs visibles
- **Producción**: Solo WARN y ERROR, console.log desactivado

## 🧹 Limpieza Automática

### Script de Limpieza

```bash
# Limpiar console.log automáticamente
npm run logs:clean

# Verificar cuántos console.log quedan
npm run logs:check
```

### Reemplazos Automáticos

El script reemplaza automáticamente:

- `console.log('Debug info')` → `logger.debug('Debug info')`
- `console.log('API call')` → `logger.apiCall('API call')`
- `console.log('Usuario...')` → `logger.userAction('Usuario...')`
- `console.error('Error')` → `logger.error('Error')`

## 📝 Migración Manual

### Antes (Problemático)
```typescript
console.log('🔄 Navegando a semana anterior...')
console.log('Semana actual:', currentWeek.toISOString())
console.log('Usuario autenticado:', userId)
console.error('Error al cargar datos:', error)
```

### Después (Profesional)
```typescript
import { logger } from '@/lib/logger';

logger.systemEvent('Navegación a semana anterior', { currentWeek: currentWeek.toISOString() })
logger.userAction('Usuario autenticado', userId)
logger.error('Error al cargar datos', error)
```

## 🎨 Mejores Prácticas

### ✅ Hacer
```typescript
// Logs estructurados con contexto
logger.userAction('Reserva cancelada', userId, { 
  bookingId: booking.id, 
  sessionId: booking.sessionId 
});

// Logs de performance
const startTime = Date.now();
// ... operación ...
logger.performance('Carga de datos', Date.now() - startTime);

// Logs de API con detalles relevantes
logger.apiCall('/api/bookings', 'POST', { 
  sessionId, 
  userId: user.id 
});
```

### ❌ Evitar
```typescript
// Logs excesivos en loops
sessions.forEach(session => {
  logger.debug('Session:', session); // ❌ Muy verboso
});

// Logs con información sensible
logger.debug('Password:', password); // ❌ Información sensible

// Logs sin contexto
logger.debug('Data loaded'); // ❌ Sin información útil
```

## 🔍 Debugging

### En Desarrollo
```typescript
// Todos los logs son visibles
logger.debug('Estado actual:', { sessions, bookings });
logger.info('Proceso completado');
```

### En Producción
```typescript
// Solo logs importantes
logger.warn('Límite de usuarios alcanzado', { count: userCount });
logger.error('Error crítico', error);
```

## 📈 Beneficios

1. **Performance**: Los logs se desactivan completamente en producción
2. **Seguridad**: No hay información sensible en logs de producción
3. **Debugging**: Logs estructurados y contextualizados
4. **Mantenimiento**: Sistema centralizado y consistente
5. **Profesionalismo**: Logs apropiados para cada entorno

## 🚨 Importante

- **Siempre importa el logger** en archivos que lo usen
- **Revisa los cambios** después de usar el script de limpieza
- **Prueba la aplicación** para asegurar que todo funciona
- **No commitees** cambios sin revisar primero
