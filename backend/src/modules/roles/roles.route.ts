import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RolesService, type RoleName } from "./roles.service.js";
import { requireRole } from "../../middleware/requireRole.js";
import { createLogger } from "../../lib/logger.js";
import { ErrorCodes, createApiError } from "../../lib/api-response.js";

const logger = createLogger("RolesRoute", { color: "yellow" });

export async function rolesRoutes(fastify: FastifyInstance) {
  const rolesService = new RolesService(fastify.prisma);

  /**
   * GET /api/roles
   * Получить все роли (требуется роль admin)
   */
  fastify.get(
    "/roles",
    { preHandler: requireRole("admin") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const roles = await rolesService.getAllRoles();
        return reply.send({ data: roles });
      } catch (error) {
        logger.error("Ошибка получения ролей", { error });
        return reply.code(500).send(createApiError(ErrorCodes.INTERNAL_ERROR, "Ошибка при получении ролей"));
      }
    },
  );

  /**
   * GET /api/roles/me
   * Получить роль текущего пользователя
   */
  fastify.get(
    "/roles/me",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          return reply.code(401).send(createApiError(ErrorCodes.AUTHENTICATION_REQUIRED, "Требуется авторизация"));
        }

        const role = await rolesService.getUserRole(request.user.userId);

        if (!role) {
          return reply.send({ data: null });
        }

        return reply.send({ data: role });
      } catch (error) {
        logger.error("Ошибка получения роли пользователя", { error });
        return reply.code(500).send(createApiError(ErrorCodes.INTERNAL_ERROR, "Ошибка при получении роли"));
      }
    },
  );

  /**
   * GET /api/roles/users/:roleName
   * Получить пользователей с указанной ролью (требуется роль admin)
   */
  fastify.get(
    "/roles/users/:roleName",
    { preHandler: requireRole("admin") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { roleName } = request.params as { roleName: string };

        if (!["admin", "moderator", "user"].includes(roleName)) {
          return reply.code(400).send(createApiError(ErrorCodes.INVALID_INPUT, "Неверное имя роли"));
        }

        const users = await rolesService.getUsersByRole(roleName as RoleName);
        return reply.send({ data: users });
      } catch (error) {
        logger.error("Ошибка получения пользователей по роли", { error });
        return reply
          .code(500)
          .send(createApiError(ErrorCodes.INTERNAL_ERROR, "Ошибка при получении пользователей"));
      }
    },
  );

  /**
   * PUT /api/roles/user/:userId
   * Назначить роль пользователю (требуется роль admin)
   */
  fastify.put(
    "/roles/user/:userId",
    {
      preHandler: requireRole("admin"),
      schema: {
        body: {
          type: "object",
          required: ["role"],
          properties: {
            role: {
              type: "string",
              enum: ["admin", "moderator", "user"],
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const { role } = request.body as { role: RoleName };

        const adminId = request.user?.userId;

        const result = await rolesService.assignRole(
          parseInt(userId, 10),
          role,
          adminId,
        );

        if (!result) {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Роль не найдена"));
        }

        logger.info("Роль назначена", {
          userId,
          role,
          grantedBy: adminId,
        });

        return reply.send({
          data: {
            success: true,
            role: result,
          },
        });
      } catch (error) {
        logger.error("Ошибка назначения роли", { error });
        return reply.code(500).send(createApiError(ErrorCodes.INTERNAL_ERROR, "Ошибка при назначении роли"));
      }
    },
  );

  /**
   * DELETE /api/roles/user/:userId
   * Снять роль с пользователя (требуется роль admin)
   */
  fastify.delete(
    "/roles/user/:userId",
    { preHandler: requireRole("admin") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };

        await rolesService.removeRole(parseInt(userId, 10));

        logger.info("Роль снята", { userId });

        return reply.send({ data: { success: true } });
      } catch (error) {
        logger.error("Ошибка снятия роли", { error });
        return reply.code(500).send(createApiError(ErrorCodes.INTERNAL_ERROR, "Ошибка при снятии роли"));
      }
    },
  );
}
