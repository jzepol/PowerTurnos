import { PrismaClient, UserRole, UserStatus, SessionStatus, BookingStatus, PaymentStatus, TokenSource } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Limpiar datos existentes
  console.log('🧹 Limpiando datos existentes...')
  await prisma.auditLog.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.waitlist.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.tokenGrant.deleteMany()
  await prisma.tokenWallet.deleteMany()
  await prisma.classSession.deleteMany()
  await prisma.scheduleTemplate.deleteMany()
  await prisma.packagePlan.deleteMany()
  await prisma.room.deleteMany()
  await prisma.location.deleteMany()
  await prisma.classType.deleteMany()
  await prisma.gymMember.deleteMany()
  await prisma.gym.deleteMany()
  await prisma.user.deleteMany()

  // Crear usuarios demo
  console.log('👥 Creando usuarios demo...')
  
  const adminPassword = await bcrypt.hash('admin123', 12)
  const profPassword = await bcrypt.hash('prof123', 12)
  const alumnoPassword = await bcrypt.hash('alumno123', 12)

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Principal',
      email: 'admin@turnos.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    }
  })

  const profesor1 = await prisma.user.create({
    data: {
      name: 'María González',
      email: 'maria@turnos.com',
      password: profPassword,
      role: UserRole.PROFESOR,
      status: UserStatus.ACTIVE
    }
  })

  const profesor2 = await prisma.user.create({
    data: {
      name: 'Carlos Rodríguez',
      email: 'carlos@turnos.com',
      password: profPassword,
      role: UserRole.PROFESOR,
      status: UserStatus.ACTIVE
    }
  })

  const alumno1 = await prisma.user.create({
    data: {
      name: 'Ana Martínez',
      email: 'ana@turnos.com',
      password: alumnoPassword,
      role: UserRole.ALUMNO,
      status: UserStatus.ACTIVE
    }
  })

  const alumno2 = await prisma.user.create({
    data: {
      name: 'Luis Fernández',
      email: 'luis@turnos.com',
      password: alumnoPassword,
      role: UserRole.ALUMNO,
      status: UserStatus.ACTIVE
    }
  })

  const alumno3 = await prisma.user.create({
    data: {
      name: 'Sofia López',
      email: 'sofia@turnos.com',
      password: alumnoPassword,
      role: UserRole.ALUMNO,
      status: UserStatus.ACTIVE
    }
  })

  // Crear gimnasio
  console.log('🏋️ Creando gimnasio demo...')
  const gym = await prisma.gym.create({
    data: {
      name: 'Fitness Center San Luis',
      timezone: 'America/Argentina/San_Luis',
      holidays: ['2024-01-01', '2024-05-01', '2024-07-09', '2024-12-25'],
      ownerId: admin.id
    }
  })

  // Crear miembros del gimnasio
  console.log('👥 Asignando miembros al gimnasio...')
  await prisma.gymMember.createMany({
    data: [
      { userId: admin.id, gymId: gym.id, roleInGym: UserRole.ADMIN },
      { userId: profesor1.id, gymId: gym.id, roleInGym: UserRole.PROFESOR },
      { userId: profesor2.id, gymId: gym.id, roleInGym: UserRole.PROFESOR },
      { userId: alumno1.id, gymId: gym.id, roleInGym: UserRole.ALUMNO },
      { userId: alumno2.id, gymId: gym.id, roleInGym: UserRole.ALUMNO },
      { userId: alumno3.id, gymId: gym.id, roleInGym: UserRole.ALUMNO }
    ]
  })

  // Crear ubicaciones
  console.log('📍 Creando ubicaciones...')
  const sede1 = await prisma.location.create({
    data: {
      name: 'Sede Centro',
      address: 'Av. San Martín 1234, San Luis',
      gymId: gym.id
    }
  })

  const sede2 = await prisma.location.create({
    data: {
      name: 'Sede Norte',
      address: 'Ruta 20 Km 15, San Luis',
      gymId: gym.id
    }
  })

  // Crear salas
  console.log('🚪 Creando salas...')
  const sala1 = await prisma.room.create({
    data: {
      name: 'Sala Principal',
      capacity: 20,
      locationId: sede1.id
    }
  })

  const sala2 = await prisma.room.create({
    data: {
      name: 'Sala de Pole',
      capacity: 15,
      locationId: sede1.id
    }
  })

  const sala3 = await prisma.room.create({
    data: {
      name: 'Sala de Flexibilidad',
      capacity: 12,
      locationId: sede2.id
    }
  })

  // Crear tipos de clase
  console.log('🏃 Creando tipos de clase...')
  const poleSport = await prisma.classType.create({
    data: {
      name: 'Pole Sport',
      color: '#FF6B6B',
      durationMin: 60,
      gymId: gym.id
    }
  })

  const flexibilidad = await prisma.classType.create({
    data: {
      name: 'Flexibilidad',
      color: '#4ECDC4',
      durationMin: 45,
      gymId: gym.id
    }
  })

  const funcional = await prisma.classType.create({
    data: {
      name: 'Funcional',
      color: '#45B7D1',
      durationMin: 50,
      gymId: gym.id
    }
  })

  const yoga = await prisma.classType.create({
    data: {
      name: 'Yoga',
      color: '#96CEB4',
      durationMin: 75,
      gymId: gym.id
    }
  })

  // Crear plantillas de horario
  console.log('📅 Creando plantillas de horario...')
  const templatePole = await prisma.scheduleTemplate.create({
    data: {
      gymId: gym.id,
      profId: profesor1.id,
      roomId: sala2.id,
      classTypeId: poleSport.id,
      daysOfWeek: [1, 3, 5], // Lunes, Miércoles, Viernes
      startTime: '18:00',
      durationMin: 60,
      capacity: 15,
      active: true
    }
  })

  const templateFlex = await prisma.scheduleTemplate.create({
    data: {
      gymId: gym.id,
      profId: profesor2.id,
      roomId: sala3.id,
      classTypeId: flexibilidad.id,
      daysOfWeek: [2, 4], // Martes, Jueves
      startTime: '19:00',
      durationMin: 45,
      capacity: 12,
      active: true
    }
  })

  const templateFuncional = await prisma.scheduleTemplate.create({
    data: {
      gymId: gym.id,
      profId: profesor1.id,
      roomId: sala1.id,
      classTypeId: funcional.id,
      daysOfWeek: [1, 2, 3, 4, 5], // Lunes a Viernes
      startTime: '07:00',
      durationMin: 50,
      capacity: 20,
      active: true
    }
  })

  const templateYoga = await prisma.scheduleTemplate.create({
    data: {
      gymId: gym.id,
      profId: profesor2.id,
      roomId: sala1.id,
      classTypeId: yoga.id,
      daysOfWeek: [6], // Sábado
      startTime: '09:00',
      durationMin: 75,
      capacity: 20,
      active: true
    }
  })

  // Crear planes de paquetes
  console.log('💳 Creando planes de paquetes...')
  const planBasico = await prisma.packagePlan.create({
    data: {
      gymId: gym.id,
      name: 'Plan Básico',
      tokens: 10,
      validityDays: 30,
      price: 5000,
      rules: {
        cancelBeforeHours: 24,
        noShowPenalty: true,
        transferable: false
      },
      isActive: true
    }
  })

  const planPremium = await prisma.packagePlan.create({
    data: {
      gymId: gym.id,
      name: 'Plan Premium',
      tokens: 25,
      validityDays: 60,
      price: 12000,
      rules: {
        cancelBeforeHours: 12,
        noShowPenalty: false,
        transferable: true
      },
      isActive: true
    }
  })

  const planPole = await prisma.packagePlan.create({
    data: {
      gymId: gym.id,
      name: 'Plan Pole Sport',
      tokens: 8,
      validityDays: 30,
      price: 8000,
      rules: {
        cancelBeforeHours: 6,
        noShowPenalty: true,
        transferable: false
      },
      isActive: true
    }
  })

  // Crear wallets de tokens
  console.log('💰 Creando wallets de tokens...')
  const walletAna = await prisma.tokenWallet.create({
    data: {
      userId: alumno1.id,
      gymId: gym.id,
      balance: 0
    }
  })

  const walletLuis = await prisma.tokenWallet.create({
    data: {
      userId: alumno2.id,
      gymId: gym.id,
      balance: 0
    }
  })

  const walletSofia = await prisma.tokenWallet.create({
    data: {
      userId: alumno3.id,
      gymId: gym.id,
      balance: 0
    }
  })

  // Asignar tokens a los alumnos
  console.log('🎁 Asignando tokens a los alumnos...')
  await prisma.tokenGrant.createMany({
    data: [
      {
        walletId: walletAna.id,
        planId: planBasico.id,
        tokens: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        source: TokenSource.ASIGNACION
      },
      {
        walletId: walletLuis.id,
        planId: planPremium.id,
        tokens: 25,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        source: TokenSource.ASIGNACION
      },
      {
        walletId: walletSofia.id,
        planId: planPole.id,
        tokens: 8,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        source: TokenSource.ASIGNACION
      }
    ]
  })

  // Actualizar balances de los wallets
  await prisma.tokenWallet.update({
    where: { id: walletAna.id },
    data: { balance: 10 }
  })

  await prisma.tokenWallet.update({
    where: { id: walletLuis.id },
    data: { balance: 25 }
  })

  await prisma.tokenWallet.update({
    where: { id: walletSofia.id },
    data: { balance: 8 }
  })

  // Generar algunas sesiones para la próxima semana
  console.log('📅 Generando sesiones para la próxima semana...')
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const sessionDates = [
    new Date(nextWeek.getTime() + 1 * 24 * 60 * 60 * 1000), // Lunes
    new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000), // Martes
    new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000), // Miércoles
    new Date(nextWeek.getTime() + 4 * 24 * 60 * 60 * 1000), // Jueves
    new Date(nextWeek.getTime() + 5 * 24 * 60 * 60 * 1000), // Viernes
    new Date(nextWeek.getTime() + 6 * 24 * 60 * 60 * 1000)  // Sábado
  ]

  // Crear sesiones de Pole Sport (Lunes, Miércoles, Viernes)
  for (let i = 0; i < 3; i++) {
    const sessionDate = sessionDates[i * 2] // 0, 2, 4 (Lunes, Miércoles, Viernes)
    const startAt = new Date(sessionDate)
    startAt.setHours(18, 0, 0, 0)
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000)

    await prisma.classSession.create({
      data: {
        gymId: gym.id,
        profId: profesor1.id,
        roomId: sala2.id,
        classTypeId: poleSport.id,
        startAt,
        endAt,
        capacity: 15,
        status: SessionStatus.PROGRAMADA
      }
    })
  }

  // Crear sesiones de Flexibilidad (Martes, Jueves)
  for (let i = 0; i < 2; i++) {
    const sessionDate = sessionDates[i * 2 + 1] // 1, 3 (Martes, Jueves)
    const startAt = new Date(sessionDate)
    startAt.setHours(19, 0, 0, 0)
    const endAt = new Date(startAt.getTime() + 45 * 60 * 1000)

    await prisma.classSession.create({
      data: {
        gymId: gym.id,
        profId: profesor2.id,
        roomId: sala3.id,
        classTypeId: flexibilidad.id,
        startAt,
        endAt,
        capacity: 12,
        status: SessionStatus.PROGRAMADA
      }
    })
  }

  // Crear sesiones de Funcional (Lunes a Viernes)
  for (let i = 0; i < 5; i++) {
    const sessionDate = sessionDates[i]
    const startAt = new Date(sessionDate)
    startAt.setHours(7, 0, 0, 0)
    const endAt = new Date(startAt.getTime() + 50 * 60 * 1000)

    await prisma.classSession.create({
      data: {
        gymId: gym.id,
        profId: profesor1.id,
        roomId: sala1.id,
        classTypeId: funcional.id,
        startAt,
        endAt,
        capacity: 20,
        status: SessionStatus.PROGRAMADA
      }
    })
  }

  // Crear sesión de Yoga (Sábado)
  const yogaDate = sessionDates[5]
  const yogaStartAt = new Date(yogaDate)
  yogaStartAt.setHours(9, 0, 0, 0)
  const yogaEndAt = new Date(yogaStartAt.getTime() + 75 * 60 * 1000)

  await prisma.classSession.create({
    data: {
      gymId: gym.id,
      profId: profesor2.id,
      roomId: sala1.id,
      classTypeId: yoga.id,
      startAt: yogaStartAt,
      endAt: yogaEndAt,
      capacity: 20,
      status: SessionStatus.PROGRAMADA
    }
  })

  console.log('✅ Seed completado exitosamente!')
  console.log('\n📋 Resumen de datos creados:')
  console.log(`- Usuarios: ${await prisma.user.count()}`)
  console.log(`- Gimnasios: ${await prisma.gym.count()}`)
  console.log(`- Ubicaciones: ${await prisma.location.count()}`)
  console.log(`- Salas: ${await prisma.room.count()}`)
  console.log(`- Tipos de clase: ${await prisma.classType.count()}`)
  console.log(`- Plantillas de horario: ${await prisma.scheduleTemplate.count()}`)
  console.log(`- Sesiones: ${await prisma.classSession.count()}`)
  console.log(`- Planes de paquetes: ${await prisma.packagePlan.count()}`)
  console.log(`- Wallets de tokens: ${await prisma.tokenWallet.count()}`)
  console.log(`- Concesiones de tokens: ${await prisma.tokenGrant.count()}`)
  
  console.log('\n🔑 Usuarios de prueba:')
  console.log('Admin: admin@turnos.com / admin123')
  console.log('Profesor: maria@turnos.com / prof123')
  console.log('Alumno: ana@turnos.com / alumno123')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
