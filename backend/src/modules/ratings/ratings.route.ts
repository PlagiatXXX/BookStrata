import type { FastifyInstance, FastifyRequest } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { ErrorCodes, createApiError } from "../../lib/api-response.js";
import {
  rateBook,
  getBookRatings,
  getUserBookRating,
  CATEGORY_LABELS,
} from "./ratings.service.js";

export async function ratingsRoutes(fastify: FastifyInstance) {
  // POST /api/ratings — оценить книгу (требуется авторизация)
  fastify.post(
    "/",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["bookId", "ratings"],
          properties: {
            bookId: { type: "integer" },
            ratings: {
              type: "object",
              additionalProperties: { type: "number", minimum: 0.1, maximum: 10 },
              minProperties: 1,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { user } = request as FastifyRequest;
      const userId = user?.userId;
      const { bookId, ratings } = request.body as {
        bookId: number;
        ratings: Record<string, number>;
      };

      const rating = await rateBook(bookId, userId!, ratings);
      const averages = await getBookRatings(bookId);
      return reply.code(201).send({ data: { rating, averages } });
    },
  );

  // GET /api/ratings/:bookId — получить средние оценки книги
  fastify.get("/:bookId", async (request, reply) => {
    const { bookId } = request.params as { bookId: string };
    const bookIdNum = Number(bookId);
    if (!Number.isFinite(bookIdNum)) {
      return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Invalid bookId"));
    }
    const ratings = await getBookRatings(bookIdNum);
    const data = ratings ?? { count: 0, averages: {}, overall: 0 };
    return reply.send({ data: { ...data, categories: CATEGORY_LABELS } });
  });

  // GET /api/ratings/:bookId/mine — получить оценку текущего пользователя
  fastify.get(
    "/:bookId/mine",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as FastifyRequest).user!.userId;
      const { bookId } = request.params as { bookId: string };
      const bookIdNum = Number(bookId);
      if (!Number.isFinite(bookIdNum)) {
        return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Invalid bookId"));
      }
      const rating = await getUserBookRating(bookIdNum, userId);
      return reply.send({ data: rating });
    },
  );
}
