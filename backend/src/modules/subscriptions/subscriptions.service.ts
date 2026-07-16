import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";

const logger = createLogger("Subscriptions", { color: "cyan" });

export interface ProSubscription {
  userId: number;
  isPro: boolean;
  proExpiresAt: Date | null;
}

export interface SetProStatusParams {
  userId: number;
  isPro: boolean;
  expiresAt?: Date | null;
}

/**
 * Сервис управления Pro подписками пользователей
 *
 * Пока скрыт от пользователей — управление только через админку
 * В будущем будет интегрирован со Stripe/PayPal
 */
export class SubscriptionsService {
  /**
   * Получить статус подписки пользователя
   */
  async getUserSubscription(userId: number): Promise<ProSubscription | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isPro: true,
        proExpiresAt: true,
      },
    });

    if (!user) return null;

    // Проверяем, не истёк ли срок подписки
    const isExpired = user.proExpiresAt && user.proExpiresAt < new Date();

    // Если подписка истекла, обновляем статус
    if (user.isPro && isExpired) {
      await this.expireSubscription(userId);
      return {
        userId,
        isPro: false,
        proExpiresAt: null,
      };
    }

    return {
      userId,
      isPro: user.isPro && !isExpired,
      proExpiresAt: isExpired ? null : user.proExpiresAt,
    };
  }

  /**
   * Установить Pro статус пользователю
   * Используется админкой или платежной системой
   */
  async setProStatus(params: SetProStatusParams): Promise<ProSubscription> {
    const { userId, isPro, expiresAt } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError(`Пользователь ${userId} не найден`);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isPro,
        proExpiresAt: expiresAt ?? null,
      },
    });

    logger.info(`Pro статус обновлён`, {
      userId,
      username: user.username,
      isPro,
      expiresAt,
    });

    return {
      userId,
      isPro: updatedUser.isPro,
      proExpiresAt: updatedUser.proExpiresAt,
    };
  }

  /**
   * Активировать Pro подписку на указанный период
   */
  async activatePro(
    userId: number,
    durationDays: number = 30,
  ): Promise<ProSubscription> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    return this.setProStatus({
      userId,
      isPro: true,
      expiresAt,
    });
  }

  /**
   * Массовая деактивация всех просроченных подписок.
   * Вызывается раз в час из server.ts.
   * Возвращает количество деактивированных.
   */
  async expireAllOverdue(): Promise<number> {
    const result = await prisma.user.updateMany({
      where: {
        isPro: true,
        proExpiresAt: { lt: new Date() },
      },
      data: {
        isPro: false,
        proExpiresAt: null,
      },
    });

    if (result.count > 0) {
      logger.info(`Массовая деактивация: ${result.count} просроченных подписок`);
    }

    return result.count;
  }

  /**
   * Деактивировать Pro подписку
   */
  async deactivatePro(userId: number): Promise<ProSubscription> {
    return this.setProStatus({
      userId,
      isPro: false,
      expiresAt: null,
    });
  }

  /**
   * Истёкшую подписку (вызывается автоматически при проверке)
   */
  private async expireSubscription(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPro: false,
        proExpiresAt: null,
      },
    });

    logger.info(`Pro подписка истекла`, { userId });
  }

  /**
   * Проверка, является ли пользователь Pro
   * Быстрый метод для middleware
   */
  async isProUser(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPro: true,
        proExpiresAt: true,
      },
    });

    if (!user) return false;
    if (!user.isPro) return false;
    if (user.proExpiresAt && user.proExpiresAt < new Date()) {
      // Подписка истекла
      await this.expireSubscription(userId);
      return false;
    }

    return true;
  }

  /**
   * Получить всех Pro пользователей
   */
  async getAllProUsers(): Promise<ProSubscription[]> {
    const users = await prisma.user.findMany({
      where: {
        isPro: true,
        OR: [
          { proExpiresAt: null }, // Бессрочная подписка
          { proExpiresAt: { gte: new Date() } }, // Активная подписка
        ],
      },
      select: {
        id: true,
        isPro: true,
        proExpiresAt: true,
      },
    });

    return users.map((u) => ({
      userId: u.id,
      isPro: u.isPro,
      proExpiresAt: u.proExpiresAt,
    }));
  }

  /**
   * Получить статистику подписок
   */
  async getSubscriptionStats(): Promise<{
    totalProUsers: number;
    activeSubscriptions: number;
    lifetimeSubscriptions: number;
    expiringSoon: number; // Истекают в ближайшие 7 дней
  }> {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [
      totalProUsers,
      activeSubscriptions,
      lifetimeSubscriptions,
      expiringSoon,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          isPro: true,
          OR: [{ proExpiresAt: null }, { proExpiresAt: { gte: now } }],
        },
      }),
      prisma.user.count({
        where: {
          isPro: true,
          proExpiresAt: { gte: now },
        },
      }),
      prisma.user.count({
        where: {
          isPro: true,
          proExpiresAt: null,
        },
      }),
      prisma.user.count({
        where: {
          isPro: true,
          proExpiresAt: {
            gte: now,
            lte: sevenDaysFromNow,
          },
        },
      }),
    ]);

    return {
      totalProUsers,
      activeSubscriptions,
      lifetimeSubscriptions,
      expiringSoon,
    };
  }
}
