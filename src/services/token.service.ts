import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'

export class TokenService {
  // Obtener wallet de un usuario para un gimnasio específico
  static async getWallet(userId: string, gymId: string) {
    // Verificar que el usuario tenga membresía en el gimnasio
    const membership = await prisma.gymMember.findFirst({
      where: {
        userId,
        gymId,
        isActive: true
      }
    })

    if (!membership) {
      throw new AuthError('El usuario no tiene membresía activa en este gimnasio', 403)
    }

    const wallet = await prisma.tokenWallet.findUnique({
      where: {
        userId_gymId: {
          userId,
          gymId
        }
      },
      include: {
        grants: {
          where: {
            expiresAt: {
              gt: new Date()
            }
          },
          include: {
            plan: true
          },
          orderBy: {
            expiresAt: 'asc'
          }
        }
      }
    })

    if (!wallet) {
      // Crear wallet si no existe
      return await prisma.tokenWallet.create({
        data: {
          userId,
          gymId,
          balance: 0
        },
        include: {
          grants: {
            where: {
              expiresAt: {
                gt: new Date()
              }
            },
            include: {
              plan: true
            },
            orderBy: {
              expiresAt: 'asc'
            }
          }
        }
      })
    }

    return wallet
  }

  // Asignar tokens a un usuario
  static async assignTokens(
    data: {
      userId: string
      gymId: string
      tokens: number
      source: 'ASIGNACION' | 'BONO'
      expiresAt?: Date
      reason?: string
    },
    assignedBy: string,
    assignedByRole: string
  ) {
    // Verificar que el usuario asignador tenga permisos
    if (!['ADMIN', 'PROFESOR'].includes(assignedByRole)) {
      throw new AuthError('No tienes permisos para asignar tokens', 403)
    }

    // Verificar que el usuario tenga membresía en el gimnasio
    const membership = await prisma.gymMember.findFirst({
      where: {
        userId: data.userId,
        gymId: data.gymId,
        isActive: true
      }
    })

    if (!membership) {
      throw new AuthError('El usuario no tiene membresía activa en este gimnasio', 403)
    }

    // Obtener o crear wallet
    let wallet = await prisma.tokenWallet.findUnique({
      where: {
        userId_gymId: {
          userId: data.userId,
          gymId: data.gymId
        }
      }
    })

    if (!wallet) {
      wallet = await prisma.tokenWallet.create({
        data: {
          userId: data.userId,
          gymId: data.gymId,
          balance: 0
        }
      })
    }

    // Crear concesión de tokens
    const tokenGrant = await prisma.tokenGrant.create({
      data: {
        walletId: wallet.id,
        tokens: data.tokens,
        source: data.source,
        expiresAt: data.expiresAt
      }
    })

    // Actualizar balance del wallet
    await prisma.tokenWallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: data.tokens
        }
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: assignedBy,
        entity: 'TokenGrant',
        entityId: tokenGrant.id,
        action: 'CREATE',
        diff: {
          userId: data.userId,
          gymId: data.gymId,
          tokens: data.tokens,
          source: data.source,
          reason: data.reason
        }
      }
    })

    return tokenGrant
  }

  // Comprar tokens (crea un pago pendiente)
  static async purchaseTokens(
    data: {
      userId: string
      gymId: string
      planId: string
      amount: number
      currency?: string
    }
  ) {
    // Verificar que el plan existe y esté activo
    const plan = await prisma.packagePlan.findFirst({
      where: {
        id: data.planId,
        gymId: data.gymId,
        isActive: true
      }
    })

    if (!plan) {
      throw new AuthError('Plan no encontrado o inactivo', 404)
    }

    // Crear pago pendiente
    const payment = await prisma.payment.create({
      data: {
        userId: data.userId,
        gymId: data.gymId,
        planId: data.planId,
        amount: data.amount,
        currency: data.currency || 'ARS',
        status: 'PENDIENTE',
        provider: 'mercadopago'
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: data.userId,
        entity: 'Payment',
        entityId: payment.id,
        action: 'CREATE',
        diff: {
          planId: data.planId,
          amount: data.amount,
          currency: data.currency || 'ARS'
        }
      }
    })

    return payment
  }

  // Confirmar compra de tokens (después del pago exitoso)
  static async confirmTokenPurchase(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { plan: true }
    })

    if (!payment) {
      throw new AuthError('Pago no encontrado', 404)
    }

    if (!payment.plan) {
      throw new AuthError('Plan no encontrado para el pago', 404)
    }

    if (payment.status !== 'PENDIENTE') {
      throw new AuthError('El pago ya fue procesado', 400)
    }

    // Obtener o crear wallet
    let wallet = await prisma.tokenWallet.findUnique({
      where: {
        userId_gymId: {
          userId: payment.userId,
          gymId: payment.gymId
        }
      }
    })

    if (!wallet) {
      wallet = await prisma.tokenWallet.create({
        data: {
          userId: payment.userId,
          gymId: payment.gymId,
          balance: 0
        }
      })
    }

    // Calcular fecha de expiración
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + payment.plan.validityDays)

    // Crear concesión de tokens
    const tokenGrant = await prisma.tokenGrant.create({
      data: {
        walletId: wallet.id,
        planId: payment.planId,
        tokens: payment.plan.tokens,
        source: 'COMPRA',
        expiresAt
      }
    })

    // Actualizar balance del wallet
    await prisma.tokenWallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: payment.plan.tokens
        }
      }
    })

    // Marcar pago como completado
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETADO' }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: payment.userId,
        entity: 'TokenGrant',
        entityId: tokenGrant.id,
        action: 'CREATE',
        diff: {
          source: 'COMPRA',
          planId: payment.planId,
          tokens: payment.plan.tokens
        }
      }
    })

    return {
      tokenGrant,
      payment
    }
  }

  // Transferir tokens entre usuarios
  static async transferTokens(
    data: {
      fromUserId: string
      toUserId: string
      gymId: string
      tokens: number
      reason?: string
    }
  ) {
    // Verificar que ambos usuarios pertenezcan al gimnasio
    const fromWallet = await prisma.tokenWallet.findUnique({
      where: {
        userId_gymId: {
          userId: data.fromUserId,
          gymId: data.gymId
        }
      }
    })

    const toWallet = await prisma.tokenWallet.findUnique({
      where: {
        userId_gymId: {
          userId: data.toUserId,
          gymId: data.gymId
        }
      }
    })

    if (!fromWallet) {
      throw new AuthError('Usuario origen no encontrado en el gimnasio', 404)
    }

    if (!toWallet) {
      throw new AuthError('Usuario destino no encontrado en el gimnasio', 404)
    }

    // Verificar que tenga suficientes tokens
    if (fromWallet.balance < data.tokens) {
      throw new AuthError('Saldo insuficiente para la transferencia', 400)
    }

    // Crear concesión de tokens para el destinatario
    const tokenGrant = await prisma.tokenGrant.create({
      data: {
        walletId: toWallet.id,
        tokens: data.tokens,
        source: 'BONO',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
      }
    })

    // Actualizar balances
    await prisma.tokenWallet.update({
      where: { id: fromWallet.id },
      data: {
        balance: {
          decrement: data.tokens
        }
      }
    })

    await prisma.tokenWallet.update({
      where: { id: toWallet.id },
      data: {
        balance: {
          increment: data.tokens
        }
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: data.fromUserId,
        entity: 'TokenGrant',
        entityId: tokenGrant.id,
        action: 'CREATE',
        diff: {
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          tokens: data.tokens,
          reason: data.reason
        }
      }
    })

    return tokenGrant
  }

  // Consumir tokens (para reservas)
  static async consumeTokens(
    walletId: string,
    tokens: number,
    reason: string
  ) {
    const wallet = await prisma.tokenWallet.findUnique({
      where: { id: walletId }
    })

    if (!wallet) {
      throw new AuthError('Wallet no encontrado', 404)
    }

    if (wallet.balance < tokens) {
      throw new AuthError('Saldo insuficiente', 400)
    }

    // Actualizar balance
    await prisma.tokenWallet.update({
      where: { id: walletId },
      data: {
        balance: {
          decrement: tokens
        }
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: wallet.userId,
        entity: 'TokenWallet',
        entityId: walletId,
        action: 'UPDATE',
        diff: {
          tokensConsumed: tokens,
          reason,
          previousBalance: wallet.balance,
          newBalance: wallet.balance - tokens
        }
      }
    })

    return { success: true, newBalance: wallet.balance - tokens }
  }

  // Reembolsar tokens (para cancelaciones)
  static async refundTokens(
    walletId: string,
    tokens: number,
    reason: string
  ) {
    const wallet = await prisma.tokenWallet.findUnique({
      where: { id: walletId }
    })

    if (!wallet) {
      throw new AuthError('Wallet no encontrado', 404)
    }

    // Actualizar balance
    await prisma.tokenWallet.update({
      where: { id: walletId },
      data: {
        balance: {
          increment: tokens
        }
      }
    })

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: wallet.userId,
        entity: 'TokenWallet',
        entityId: walletId,
        action: 'UPDATE',
        diff: {
          tokensRefunded: tokens,
          reason,
          previousBalance: wallet.balance,
          newBalance: wallet.balance + tokens
        }
      }
    })

    return { success: true, newBalance: wallet.balance + tokens }
  }

  // Obtener historial de tokens
  static async getTokenHistory(walletId: string) {
    const grants = await prisma.tokenGrant.findMany({
      where: { walletId },
      include: {
        plan: true,
        bookings: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return grants
  }

  // Limpiar tokens expirados
  static async cleanupExpiredTokens() {
    const expiredGrants = await prisma.tokenGrant.findMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })

    for (const grant of expiredGrants) {
      // Obtener wallet
      const wallet = await prisma.tokenWallet.findUnique({
        where: { id: grant.walletId }
      })

      if (wallet) {
        // Actualizar balance
        await prisma.tokenWallet.update({
          where: { id: grant.walletId },
          data: {
            balance: {
              decrement: grant.tokens
            }
          }
        })

        // Registrar en auditoría
        await prisma.auditLog.create({
          data: {
            actorId: wallet.userId,
            entity: 'TokenGrant',
            entityId: grant.id,
            action: 'EXPIRE',
            diff: {
              tokensExpired: grant.tokens,
              expiresAt: grant.expiresAt
            }
          }
        })
      }
    }

    return { expiredCount: expiredGrants.length }
  }
}
