/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  readingDnaInputSchema,
  readingDnaDuelInputSchema,
  readingDnaShareInputSchema,
  readingDnaClaimInputSchema,
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
  claimGuestDna,
  getTicketDuels,
  getArchetypeStats,
} from "./readingDna.service.js";
import {
  findReadingDnaForOg,
  generateReadingDnaOgPng,
} from "./readingDnaOg.service.js";
import {
  getCelebritiesWithDna,
  conductCelebrityDuel,
} from "./celebrityDna.service.js";
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
  fastify.post("/preview", {
    config: {
      rateLimit: { max: 20, timeWindow: "1 minute" },
    },
  }, async (request, reply) => {
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
  fastify.post("/save", {
    config: {
      rateLimit: { max: 5, timeWindow: "1 minute" },
    },
  }, async (request: FastifyRequest, reply) => {
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
  fastify.post("/duel", {
    config: {
      rateLimit: { max: 10, timeWindow: "1 minute" },
    },
  }, async (request, reply) => {
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
   * GET /api/reading-dna/duels/:ticketNumber
   * Журнал входящих дуэлей билета («Кто сравнил вкус со мной»).
   */
  fastify.get<{
    Params: { ticketNumber: string };
    Querystring: { limit?: string };
  }>("/duels/:ticketNumber", async (request, reply) => {
    const { ticketNumber } = request.params;
    const rawLimit = request.query.limit ? Number.parseInt(request.query.limit, 10) : 10;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 20) : 10;

    const summary = await getTicketDuels(ticketNumber, limit);
    if (!summary) {
      return reply
        .status(404)
        .send(
          createApiError(
            ErrorCodes.NOT_FOUND,
            `Читательский билет «${ticketNumber}» не найден`
          )
        );
    }

    return reply.send(createSuccessResponse(summary));
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
    const rawLimit = request.query.limit ? Number.parseInt(request.query.limit, 10) : 5;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 20) : 5;

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
   * GET /api/reading-dna/stats
   * Реальное распределение архетипов по базе данных.
   */
  fastify.get("/stats", async (_request, reply) => {
    const stats = await getArchetypeStats();
    return reply.send(createSuccessResponse(stats));
  });

  /**
   * GET /api/reading-dna/celebrities
   * Список реальных опубликованных знаменитостей BookStrata с вычисленным ДНК.
   */
  fastify.get("/celebrities", async (_request, reply) => {
    const celebrities = await getCelebritiesWithDna();
    return reply.send(createSuccessResponse({ celebrities }));
  });

  /**
   * POST /api/reading-dna/duel/celebrity/:slug
   * Дуэль читательского вкуса со знаменитостью из каталога BookStrata.
   */
  fastify.post<{
    Params: { slug: string };
    Body: { challengerTicketNumber?: string; challengerDna?: unknown };
  }>(
    "/duel/celebrity/:slug",
    {
      config: {
        rateLimit: { max: 15, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const body = (request.body ?? {}) as {
        challengerTicketNumber?: string;
        challengerDna?: unknown;
      };

      let parsedDna;
      if (body.challengerDna) {
        const check = readingDnaInputSchema.safeParse(body.challengerDna);
        if (!check.success) {
          return reply
            .status(400)
            .send(
              createApiError(
                ErrorCodes.VALIDATION_ERROR,
                check.error.issues[0]?.message || "Невалидные данные ДНК"
              )
            );
        }
        parsedDna = check.data;
      }

      if (!body.challengerTicketNumber && !parsedDna) {
        return reply
          .status(400)
          .send(
            createApiError(
              ErrorCodes.VALIDATION_ERROR,
              "Необходимо передать challengerTicketNumber или challengerDna"
            )
          );
      }

      const result = await conductCelebrityDuel({
        slug,
        challengerTicketNumber: body.challengerTicketNumber,
        challengerDna: parsedDna,
      });
      return reply.send(createSuccessResponse(result));
    }
  );

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
  fastify.post("/share", {
    config: {
      rateLimit: { max: 10, timeWindow: "1 minute" },
    },
  }, async (request, reply) => {
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

  /**
   * POST /api/reading-dna/claim
   * Привязка гостевого билета к аккаунту авторизованного пользователя.
   */
  fastify.post(
    "/claim",
    {
      preHandler: [authMiddleware],
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const parseResult = readingDnaClaimInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send(
            createApiError(
              ErrorCodes.VALIDATION_ERROR,
              parseResult.error.issues[0]?.message || "guestToken обязателен"
            )
          );
      }

      const userId = (request as any).user?.userId ?? (request as any).user?.id;
      const result = await claimGuestDna(parseResult.data.guestToken, userId);
      if (!result) {
        return reply
          .status(404)
          .send(
            createApiError(
              ErrorCodes.NOT_FOUND,
              "Гостевой читательский билет не найден или уже привязан"
            )
          );
      }

      return reply.send(createSuccessResponse(result));
    }
  );

  /**
   * GET /api/reading-dna/og/:ticketFile
   * Динамическая OG-картинка (1200×630 PNG) для билета или вызова на дуэль.
   */
  fastify.get<{
    Params: { ticketFile: string };
    Querystring: { mode?: string };
  }>(
    "/og/:ticketFile",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const raw = request.params.ticketFile.replace(/\.png$/i, "");
      const ticket = await findReadingDnaForOg(raw);
      if (!ticket) {
        return reply
          .status(404)
          .send(createApiError(ErrorCodes.NOT_FOUND, "Читательский билет не найден"));
      }

      const mode: "ticket" | "challenge" =
        request.query.mode === "challenge" ? "challenge" : "ticket";
      const png = await generateReadingDnaOgPng(ticket, mode);

      return reply
        .header("Content-Type", "image/png")
        .header("Cache-Control", "public, max-age=86400")
        .send(png);
    }
  );
}
