import type { FastifyPluginAsync } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { cleanupLoadTestUsers } from "./admin-cleanup.service.js";

export const adminCleanupRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/cleanup-load-test",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const result = await cleanupLoadTestUsers(fastify.prisma);
      return reply.send({ data: result });
    },
  );
};

export default adminCleanupRoutes;
