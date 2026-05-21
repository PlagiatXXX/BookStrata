import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireAdminOrModerator } from "../../middleware/requireRole.js";
import * as service from "./battles.service.js";
import * as schema from "./battles.schema.js";
import type { CreateBattleBody, VoteInBattleBody } from "./battles.schema.js";
import { ErrorCodes, createApiError } from "../../lib/api-response.js";

export async function battleRoutes(fastify: FastifyInstance) {
  // GET /api/battles - получить активные битвы
  fastify.get("/", async () => {
    return service.getActiveBattles();
  });

  // GET /api/battles/:id - получить конкретную битву
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const battle = await service.getBattleById(request.params.id);
    if (!battle) return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Battle not found"));
    return battle;
  });

  // POST /api/battles - создать битву (Admin/Moderator)
  fastify.post<{ Body: CreateBattleBody }>(
    "/",
    {
      preHandler: [authMiddleware, requireAdminOrModerator],
      schema: schema.createBattleSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
        },
      },
    },
    async (request, reply) => {
      const battle = await service.createBattle({
        ...request.body,
        description: request.body.description ?? null,
        endTime: new Date(request.body.endTime),
      });
      return reply.code(201).header("Location", `/api/battles/${battle.id}`).send(battle);
    }
  );

  // POST /api/battles/:id/vote - проголосовать
  fastify.post<{ Params: { id: string }; Body: VoteInBattleBody }>(
    "/:id/vote",
    {
      preHandler: [authMiddleware],
      schema: schema.voteInBattleSchema,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const userId = request.user!.userId;
      const battleId = request.params.id;
      return service.voteInBattle(userId, battleId, request.body.tierListId);
    }
  );

  // POST /api/battles/:id/close - закрыть битву (Admin/Moderator)
  fastify.post<{ Params: { id: string } }>(
    "/:id/close",
    {
      preHandler: [authMiddleware, requireAdminOrModerator],
      schema: schema.closeBattleSchema,
    },
    async (request) => {
      const battleId = request.params.id;
      return service.closeBattle(battleId);
    }
  );
}
