// backend/src/modules/characters/admin-characters.route.ts
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { createApiError, createSuccessResponse, ErrorCodes } from "../../lib/api-response.js";
import { searchCharacters } from "./characters.service.js";

const querySchema = z.object({
  q: z.string().optional().default(""),
});

/** Админские эндпоинты канонических персонажей (autocomplete в редакторе книги). */
export const adminCharactersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", requireRole("admin"));

  // GET /api/admin/characters?q= — поиск канонических персонажей для привязки к книге
  fastify.get("/", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(
        createApiError(
          ErrorCodes.VALIDATION_ERROR,
          parsed.error.issues[0]?.message ?? "Некорректные параметры запроса",
          parsed.error.issues,
        ),
      );
    }

    const items = await searchCharacters(parsed.data.q);
    return reply.send(createSuccessResponse({ items }));
  });
};

export default adminCharactersRoutes;
