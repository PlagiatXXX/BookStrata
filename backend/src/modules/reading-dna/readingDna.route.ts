/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  readingDnaInputSchema,
  readingDnaDuelInputSchema,
  readingDnaShareInputSchema,
} from "./readingDna.schema.js";
import {
  previewDna,
  saveDna,
  getTicket,
  conductDuel,
  findTwins,
  getArchetypeCatalog,
  getMyDna,
  incrementShareCount,
} from "./readingDna.service.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import {
  ErrorCodes,
  createApiError,
  createSuccessResponse,
} from "../../lib/api-response.js";

export async function readingDnaRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/reading-dna/preview
   * Публичный предварительный расчет архетипа и цитаты без сохранения в БД.
   */
  fastify.post("/preview", async (request, reply) => {
    const parseResult = readingDnaInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send(
          createApiError(
            ErrorCodes.VALIDATION_ERROR,
            parseResult.error.issues[0]?.message || "Невалидные данные для превью"
          )
        );
    }

    const preview = await previewDna(parseResult.data);
    return reply.send(createSuccessResponse(preview));
  });

  /**
   * POST /api/reading-dna/save
   * Сохранение / обновление читательского ДНК (авторизованный пользователь или гость).
   */
  fastify.post("/save", async (request: FastifyRequest, reply) => {
    const parseResult = readingDnaInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send(
          createApiError(
            ErrorCodes.VALIDATION_ERROR,
            parseResult.error.issues[0]?.message || "Невалидные данные для сохранения"
          )
        );
    }

    const userId = (request as any).user?.userId as number | undefined;
    const saved = await saveDna(parseResult.data, userId);
    return reply.send(createSuccessResponse(saved));
  });

  /**
   * GET /api/reading-dna/ticket/:ticketNumber
   * Публичный просмотр билета по уникальному номеру или shortCode.
   */
  fastify.get<{
    Params: { ticketNumber: string };
  }>("/ticket/:ticketNumber", async (request, reply) => {
    const { ticketNumber } = request.params;
    const ticket = await getTicket(ticketNumber);

    if (!ticket) {
      return reply
        .status(404)
        .send(
          createApiError(
            ErrorCodes.NOT_FOUND,
            `Читательский билет «${ticketNumber}» не найден`
          )
        );
    }

    return reply.send(createSuccessResponse(ticket));
  });

  /**
   * POST /api/reading-dna/duel
   * Проведение слепой дуэли литературных вкусов.
   */
  fastify.post("/duel", async (request, reply) => {
    const parseResult = readingDnaDuelInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send(
          createApiError(
            ErrorCodes.VALIDATION_ERROR,
            parseResult.error.issues[0]?.message || "Невалидные данные для дуэли"
          )
        );
    }

    const duelResult = await conductDuel(parseResult.data);
    return reply.send(createSuccessResponse(duelResult));
  });

  /**
   * GET /api/reading-dna/twins/:ticketNumber
   * Поиск книжных близнецов (Twin Search).
   */
  fastify.get<{
    Params: { ticketNumber: string };
    Querystring: { limit?: string };
  }>("/twins/:ticketNumber", async (request, reply) => {
    const { ticketNumber } = request.params;
    const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : 5;

    const twins = await findTwins(ticketNumber, limit);
    return reply.send(createSuccessResponse({ twins }));
  });

  /**
   * GET /api/reading-dna/archetypes
   * Публичный каталог всех 16 архетипов и диапазонов осей.
   */
  fastify.get("/archetypes", async (_request, reply) => {
    return reply.send(createSuccessResponse({ archetypes: getArchetypeCatalog() }));
  });

  /**
   * GET /api/reading-dna/me
   * Получение ДНК текущего авторизованного пользователя.
   */
  fastify.get("/me", { preHandler: [authMiddleware] }, async (request, reply) => {
    const userId = (request as any).user?.userId ?? (request as any).user?.id;
    const dna = await getMyDna(userId);
    return reply.send(createSuccessResponse({ dna }));
  });

  /**
   * POST /api/reading-dna/share
   * Фиксация факта шеринга читательского билета.
   */
  fastify.post("/share", async (request, reply) => {
    const parseResult = readingDnaShareInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send(
          createApiError(
            ErrorCodes.VALIDATION_ERROR,
            parseResult.error.issues[0]?.message || "Номер билета обязателен"
          )
        );
    }

    const shareCount = await incrementShareCount(parseResult.data.ticketNumber);
    if (shareCount === null) {
      return reply
        .status(404)
        .send(
          createApiError(
            ErrorCodes.NOT_FOUND,
            `Читательский билет «${parseResult.data.ticketNumber}» не найден`
          )
        );
    }

    return reply.send(createSuccessResponse({ shareCount }));
  });
}
