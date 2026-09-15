import type { FastifyPluginAsync } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { adminResetPassword } from "./admin-users.service.js";
import { resetPasswordBodySchema } from "./admin-users.schema.js";
import { ErrorCodes, createApiError, createSuccessResponse } from "../../lib/api-response.js";

export const adminUsersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/users/:id/reset-password",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const userId = parseInt((request.params as { id: string }).id);

      if (isNaN(userId)) {
        return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Некорректный ID пользователя"));
      }

      const bodyResult = resetPasswordBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        const message = bodyResult.error.issues[0]?.message || "Некорректные данные";
        return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, message));
      }

      const { password } = bodyResult.data;

      try {
        const result = await adminResetPassword(userId, password);
        return reply.code(200).send(createSuccessResponse(result));
      } catch (error) {
        if (error instanceof Error && error.message === "Пользователь не найден") {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, error.message));
        }
        fastify.log.error(error, "Admin reset password error");
        throw error;
      }
    },
  );
};

export default adminUsersRoutes;
