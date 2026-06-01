import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireAdminOrModerator } from "../../middleware/requireRole.js";
import * as service from "./battles.service.js";
import * as schema from "./battles.schema.js";
import type { CreateBattleBody, VoteInBattleBody, ApplyToBattleBody, ReviewApplicationBody } from "./battles.schema.js";
import { ErrorCodes, createApiError, createSuccessResponse } from "../../lib/api-response.js";

export async function battleRoutes(fastify: FastifyInstance) {
  // GET /api/battles - получить активные битвы
  fastify.get("/", async (request, reply) => {
    return reply.send(createSuccessResponse(await service.getActiveBattles()));
  });

  // GET /api/battles/:id - получить конкретную битву
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const battle = await service.getBattleById(request.params.id);
    if (!battle) return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Battle not found"));
    return reply.send(createSuccessResponse(battle));
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
      const { templateId, ...rest } = request.body;
      const battle = await service.createBattle({
        ...rest,
        ...(templateId ? { templateId } : {}),
        description: request.body.description ?? null,
        endTime: new Date(request.body.endTime),
      });
      return reply.code(201).header("Location", `/api/battles/${battle.id}`).send(createSuccessResponse(battle));
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
    async (request, reply) => {
      const userId = request.user!.userId;
      const battleId = request.params.id;
      try {
        return reply.send(createSuccessResponse(await service.voteInBattle(userId, battleId, request.body.tierListId)));
      } catch (err: unknown) {
        if (err instanceof Error && "code" in err && err.code === "P2002") {
          return reply.code(409).send(createApiError(ErrorCodes.CONFLICT, "Вы уже отдали свой голос в этой битве"));
        }
        throw err;
      }
    }
  );

  // GET /api/battles/applications/pending - все ожидающие заявки (Admin/Moderator)
  fastify.get(
    "/applications/pending",
    {
      preHandler: [authMiddleware, requireAdminOrModerator],
    },
    async (request, reply) => {
      return reply.send(createSuccessResponse(await service.getPendingApplications()));
    }
  );

  // GET /api/battles/applications/approved - все принятые заявки для создания битв (Admin/Moderator)
  fastify.get(
    "/applications/approved",
    {
      preHandler: [authMiddleware, requireAdminOrModerator],
    },
    async (request, reply) => {
      return reply.send(createSuccessResponse(await service.getApprovedApplications()));
    }
  );

  // POST /api/battles/apply - общая заявка на участие (без привязки к битве)
  fastify.post<{ Body: { tierListId: string; message?: string } }>(
    "/apply",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const result = await service.applyGeneral(userId, request.body.tierListId, request.body.message);
      return reply.code(201).send(createSuccessResponse(result));
    }
  );

  // POST /api/battles/:id/close - закрыть битву (Admin/Moderator)
  fastify.post<{ Params: { id: string } }>(
    "/:id/close",
    {
      preHandler: [authMiddleware, requireAdminOrModerator],
      schema: schema.closeBattleSchema,
    },
    async (request, reply) => {
      const battleId = request.params.id;
      return reply.send(createSuccessResponse(await service.closeBattle(battleId)));
    }
  );

  // POST /api/battles/:id/apply - подать заявку на участие
  fastify.post<{ Params: { id: string }; Body: ApplyToBattleBody }>(
    "/:id/apply",
    {
      preHandler: [authMiddleware],
      schema: schema.applyToBattleSchema,
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const battleId = request.params.id;
      const result = await service.applyToBattle(userId, battleId, request.body.tierListId, request.body.message);
      return reply.code(201).send(createSuccessResponse(result));
    }
  );

  // GET /api/battles/:id/applications - получить заявки (Admin/Moderator)
  fastify.get<{ Params: { id: string } }>(
    "/:id/applications",
    {
      preHandler: [authMiddleware, requireAdminOrModerator],
    },
    async (request, reply) => {
      const battleId = request.params.id;
      return reply.send(createSuccessResponse(await service.getApplications(battleId)));
    }
  );

  // PATCH /api/battles/applications/:applicationId - одобрить/отклонить общую заявку (без battleId)
  fastify.patch<{ Params: { applicationId: string }; Body: ReviewApplicationBody }>(
    "/applications/:applicationId",
    {
      preHandler: [authMiddleware, requireAdminOrModerator],
    },
    async (request, reply) => {
      const applicationId = parseInt(request.params.applicationId, 10);
      if (isNaN(applicationId)) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_INPUT, "Invalid application ID"));
      }
      const result = await service.reviewApplication(null, applicationId, request.body.status);
      return reply.send(createSuccessResponse(result));
    }
  );

  // PATCH /api/battles/:id/applications/:applicationId - одобрить/отклонить заявку в битве (Admin/Moderator)
  fastify.patch<{ Params: { id: string; applicationId: string }; Body: ReviewApplicationBody }>(
    "/:id/applications/:applicationId",
    {
      preHandler: [authMiddleware, requireAdminOrModerator],
      schema: schema.reviewApplicationSchema,
    },
    async (request, reply) => {
      const battleId = request.params.id;
      const applicationId = parseInt(request.params.applicationId, 10);
      if (isNaN(applicationId)) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_INPUT, "Invalid application ID"));
      }
      const result = await service.reviewApplication(battleId, applicationId, request.body.status);
      return reply.send(createSuccessResponse(result));
    }
  );
}
