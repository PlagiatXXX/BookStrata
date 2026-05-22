import type { FastifyPluginAsync } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { AdminStatsService } from "./admin-stats.service.js";

export const adminStatsRoutes: FastifyPluginAsync = async (fastify) => {
  const adminStatsService = new AdminStatsService();

  fastify.get(
    "/stats",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (_request, reply) => {
      const stats = await adminStatsService.getStats()
      return reply.send({ data: stats })
    },
  );
};

export default adminStatsRoutes;
