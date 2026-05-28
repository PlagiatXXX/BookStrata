import { PrismaClient } from "@prisma/client";
import { createLogger } from "../../lib/logger.js";
import { ErrorCodes, createApiError } from "../../lib/api-response.js";

const logger = createLogger("ModerationService", { color: "red" });

export class ModerationService {
  constructor(private prisma: PrismaClient) {}

  async getUserStatus(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        chatBannedAt: true,
        chatBannedUntil: true,
        suspendedAt: true,
        suspendedUntil: true,
        suspensionReason: true,
        role: { select: { id: true, name: true } },
        _count: {
          select: {
            warnings: true,
          },
        },
      },
    });

    if (!user) {
      throw createApiError(ErrorCodes.NOT_FOUND, "Пользователь не найден");
    }

    const now = new Date();

    return {
      id: user.id,
      username: user.username,
      role: user.role?.name ?? "user",
      chatBanned: user.chatBannedUntil ? user.chatBannedUntil > now : user.chatBannedAt !== null,
      chatBannedAt: user.chatBannedAt,
      chatBannedUntil: user.chatBannedUntil,
      suspended: user.suspendedUntil ? user.suspendedUntil > now : false,
      suspendedAt: user.suspendedAt,
      suspendedUntil: user.suspendedUntil,
      suspensionReason: user.suspensionReason,
      warningsCount: user._count.warnings,
    };
  }

  async banChat(targetUserId: number, moderatorId: number, duration?: number) {
    const now = new Date();
    const until = duration ? new Date(now.getTime() + duration * 3600000) : null;

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        chatBannedAt: now,
        chatBannedUntil: until,
      },
      select: { id: true, username: true },
    });

    logger.info("Чат забанен", {
      targetUserId,
      moderatorId,
      duration: duration ? `${duration}ч` : "навсегда",
    });

    return {
      ...user,
      chatBannedAt: now.toISOString(),
      chatBannedUntil: until?.toISOString() ?? null,
    };
  }

  async unbanChat(targetUserId: number, moderatorId: number) {
    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        chatBannedAt: null,
        chatBannedUntil: null,
      },
      select: { id: true, username: true },
    });

    logger.info("Чат разбанен", { targetUserId, moderatorId });

    return user;
  }

  async suspend(targetUserId: number, moderatorId: number, duration: number, reason?: string) {
    const now = new Date();
    const until = new Date(now.getTime() + duration * 3600000);

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        suspendedAt: now,
        suspendedUntil: until,
        suspensionReason: reason ?? null,
      },
      select: { id: true, username: true },
    });

    logger.info("Пользователь заблокирован", {
      targetUserId,
      moderatorId,
      duration: `${duration}ч`,
      reason,
    });

    return {
      ...user,
      suspendedAt: now.toISOString(),
      suspendedUntil: until.toISOString(),
      suspensionReason: reason ?? null,
    };
  }

  async unsuspend(targetUserId: number, moderatorId: number) {
    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        suspendedAt: null,
        suspendedUntil: null,
        suspensionReason: null,
      },
      select: { id: true, username: true },
    });

    logger.info("Пользователь разблокирован", { targetUserId, moderatorId });

    return user;
  }

  async warn(targetUserId: number, moderatorId: number, message: string) {
    const [warning] = await this.prisma.$transaction([
      this.prisma.userWarning.create({
        data: {
          userId: targetUserId,
          moderatorId,
          message,
        },
        select: {
          id: true,
          message: true,
          createdAt: true,
          moderator: { select: { id: true, username: true } },
        },
      }),
    ]);

    logger.info("Предупреждение выдано", { targetUserId, moderatorId });

    return warning;
  }

  async getWarnings(userId: number) {
    return this.prisma.userWarning.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        message: true,
        createdAt: true,
        moderator: { select: { id: true, username: true } },
      },
    });
  }
}
