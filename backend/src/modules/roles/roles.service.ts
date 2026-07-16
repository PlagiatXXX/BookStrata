import type { PrismaClient } from "@prisma/client";
import { ValidationError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { redis } from "../../lib/redis.js";
import { config } from "../../config/env.js";

const logger = createLogger("Roles", { color: "yellow" });

export type RoleName = "admin" | "moderator" | "user";

export interface RoleInfo {
  id: number;
  name: string;
  description: string | null;
}

export interface UserRoleInfo extends RoleInfo {
  grantedAt: Date;
  grantedBy: number | null;
}

export class RolesService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Получить все роли
   */
  async getAllRoles(): Promise<RoleInfo[]> {
    return this.prisma.role.findMany({
      orderBy: { id: "asc" },
    });
  }

  /**
   * Получить роль по имени
   */
  async getRoleByName(name: RoleName): Promise<RoleInfo | null> {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  /**
   * Получить роль пользователя
   */
  async getUserRole(userId: number): Promise<UserRoleInfo | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!user?.role) return null;

    return {
      ...user.role,
      grantedAt: user.createdAt, // Приблизительно, т.к. нет отдельного поля grantedAt
      grantedBy: null,
    };
  }

  /**
   * Назначить роль пользователю
   */
  async assignRole(
    userId: number,
    roleName: RoleName,
    grantedBy?: number,
    adminPassword?: string,
  ): Promise<UserRoleInfo | null> {
    const role = await this.getRoleByName(roleName);

    if (!role) {
      logger.error("Роль не найдена", { roleName });
      return null;
    }

    // Проверяем секретный пароль для смены роли
    const secret = config.ADMIN_ROLE_CHANGE_SECRET;
    if (secret) {
      if (!adminPassword || adminPassword !== secret) {
        throw new ValidationError("Неверный пароль для смены роли");
      }
    }

    logger.info("Назначение роли", { userId, roleName, grantedBy });

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      include: {
        role: true,
      },
    });

    logger.info("Роль назначена", { userId, roleName });

    if (!user.role) {
      logger.error("Роль пользователя не найдена после обновления", { userId });
      return null;
    }

    // Инвалидируем кэш роли — следующий запрос пользователя получит новую роль из БД
    redis.del(`user:role:${userId}`).catch(() => {});

    const result: UserRoleInfo = {
      id: user.role.id,
      name: user.role.name,
      description: user.role.description,
      grantedAt: new Date(),
      grantedBy: grantedBy ?? null,
    };

    return result;
  }

  /**
   * Снять роль с пользователя
   */
  async removeRole(userId: number): Promise<void> {
    logger.info("Снятие роли", { userId });

    await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: null },
    });

    // Инвалидируем кэш роли
    redis.del(`user:role:${userId}`).catch(() => {});

    logger.info("Роль снята", { userId });
  }

  /**
   * Проверить наличие роли у пользователя
   */
  async hasRole(userId: number, roleName: RoleName): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user?.role) return false;

    return user.role.name === roleName;
  }

  /**
   * Проверить наличие роли admin или moderator
   */
  async isAdminOrModerator(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user?.role) return false;

    return ["admin", "moderator"].includes(user.role.name);
  }

  /**
   * Получить пользователей с ролью
   */
  async getUsersByRole(roleName: RoleName): Promise<
    Array<{
      id: number;
      email: string;
      username: string | null;
      roleId: number | null;
    }>
  > {
    const role = await this.getRoleByName(roleName);

    if (!role) return [];

    return this.prisma.user.findMany({
      where: { roleId: role.id },
      select: {
        id: true,
        email: true,
        username: true,
        roleId: true,
      },
    });
  }
}
