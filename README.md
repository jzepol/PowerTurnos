# Sistema de Turnos para Gimnasios

Un sistema completo de gestión de turnos, clases y tokens para gimnasios, desarrollado con Next.js, Prisma y PostgreSQL.

## 🚀 Funcionalidades Principales

### 👨‍💼 Administradores
- **Gestión de Gimnasios**: Crear, editar y eliminar gimnasios
- **Gestión de Usuarios**: Crear, editar y eliminar usuarios (alumnos, profesores, administradores)
- **Asignación de Tokens**: Asignar créditos directamente a los alumnos
- **Vista General**: Dashboard con estadísticas del sistema
- **Auditoría**: Registro de todas las acciones realizadas

### 👨‍🏫 Profesores
- **Dashboard Personalizado**: Vista de sus clases de la semana
- **Gestión de Plantillas**: Crear y gestionar plantillas de horario recurrentes
- **Creación de Clases**: Crear clases individuales fuera del horario regular
- **Gestión de Alumnos**: Ver lista de alumnos y asignar tokens
- **Calendario Semanal**: Vista semanal de todas sus clases
- **Gestión de Recursos**: Crear tipos de clase, salas y ubicaciones

### 👨‍🎓 Alumnos
- **Reserva de Clases**: Reservar clases usando tokens
- **Historial**: Ver clases reservadas y asistidas
- **Gestión de Tokens**: Ver saldo y historial de transacciones

## 🏗️ Arquitectura del Sistema

### Base de Datos (PostgreSQL)
- **Usuarios**: Sistema de roles (ADMIN, PROFESOR, ALUMNO)
- **Gimnasios**: Múltiples gimnasios con sus configuraciones
- **Ubicaciones y Salas**: Gestión de espacios físicos
- **Tipos de Clase**: Configuración de actividades
- **Plantillas de Horario**: Horarios recurrentes
- **Sesiones**: Clases individuales programadas
- **Reservas**: Sistema de booking con tokens
- **Tokens**: Sistema de créditos para reservas
- **Auditoría**: Log de todas las acciones del sistema

### APIs Implementadas
- **Autenticación**: Login, registro y gestión de sesiones
- **Usuarios**: CRUD completo de usuarios
- **Gimnasios**: Gestión de gimnasios
- **Ubicaciones**: CRUD de ubicaciones
- **Salas**: CRUD de salas con capacidades
- **Tipos de Clase**: Gestión de actividades
- **Plantillas de Horario**: Creación y gestión de horarios recurrentes
- **Sesiones**: Gestión de clases individuales
- **Tokens**: Asignación, compra y gestión de créditos
- **Reservas**: Sistema de booking
- **Auditoría**: Log de acciones del sistema

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT con cookies seguras
- **Validación**: Zod schemas
- **UI Components**: Tailwind CSS con componentes personalizados

## 📋 Requisitos del Sistema

- Node.js 18+
- PostgreSQL 12+
- npm o yarn

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd Turnos
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp env.example .env.local
```

Editar `.env.local` con:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/turnos_db"
JWT_SECRET="tu-secret-jwt-super-seguro"
```

### 4. Configurar la base de datos
```bash
# Crear base de datos PostgreSQL
createdb turnos_db

# Ejecutar migraciones
npx prisma migrate dev

# Poblar con datos de ejemplo
npx prisma db seed
```

### 5. Ejecutar el proyecto
```bash
npm run dev
```

## 👥 Usuarios de Prueba

Después de ejecutar el seed, tendrás acceso a:

- **Administrador**: `admin@turnos.com` / `admin123`
- **Profesor**: `maria@turnos.com` / `prof123`
- **Alumno**: `ana@turnos.com` / `alumno123`

## 🔐 Sistema de Permisos

### Administradores
- Acceso completo al sistema
- Pueden gestionar todos los gimnasios
- Pueden crear usuarios de cualquier rol
- Pueden asignar tokens a cualquier usuario

### Profesores
- Acceso a su gimnasio asignado
- Pueden crear plantillas de horario para sí mismos
- Pueden crear clases individuales
- Pueden asignar tokens a alumnos de su gimnasio
- Pueden gestionar tipos de clase, salas y ubicaciones

### Alumnos
- Acceso limitado a reservas y su perfil
- Pueden reservar clases usando tokens
- Pueden ver su historial de clases

## 📊 Funcionalidades Clave

### Sistema de Tokens
- **Asignación Manual**: Profesores y administradores pueden asignar tokens
- **Compra de Planes**: Sistema de paquetes con diferentes reglas
- **Transferencias**: Los alumnos pueden transferir tokens entre sí
- **Expiración**: Los tokens tienen fechas de vencimiento
- **Auditoría**: Todas las transacciones quedan registradas

### Gestión de Clases
- **Plantillas Recurrentes**: Horarios que se repiten semanalmente
- **Generación Automática**: Crear múltiples sesiones desde plantillas
- **Verificación de Conflictos**: Evita solapamientos de horarios
- **Gestión de Capacidad**: Control de cupos disponibles

### Sistema de Reservas
- **Booking con Tokens**: Cada clase consume 1 token
- **Lista de Espera**: Para clases llenas
- **Cancelaciones**: Con reembolso de tokens según reglas
- **Asistencia**: Control de presencia en las clases

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Construcción
npm run build

# Producción
npm start

# Base de datos
npx prisma studio
npx prisma migrate dev
npx prisma db seed

# Linting
npm run lint
```

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/              # APIs del sistema
│   │   ├── auth/         # Autenticación
│   │   ├── users/        # Gestión de usuarios
│   │   ├── gyms/         # Gestión de gimnasios
│   │   ├── sessions/     # Gestión de clases
│   │   ├── tokens/       # Sistema de tokens
│   │   └── ...
│   ├── dashboard/        # Dashboards por rol
│   │   ├── admin/        # Dashboard de administrador
│   │   ├── profesor/     # Dashboard de profesor
│   │   └── alumno/       # Dashboard de alumno
│   └── ...
├── lib/                   # Utilidades y configuración
├── services/              # Lógica de negocio
├── types/                 # Tipos TypeScript
└── ...
```

## 🚀 Próximas Funcionalidades

- [ ] Sistema de pagos integrado
- [ ] Notificaciones push
- [ ] App móvil nativa
- [ ] Reportes avanzados
- [ ] Integración con calendarios externos
- [ ] Sistema de bonificaciones automáticas

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o consultas, contacta al equipo de desarrollo o abre un issue en el repositorio.
