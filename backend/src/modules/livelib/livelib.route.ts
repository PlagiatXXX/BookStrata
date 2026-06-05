import type { FastifyInstance } from "fastify";
import { fetchUserBooks } from "./livelib.service.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import {
  ErrorCodes,
  createApiError,
  createSuccessResponse,
} from "../../lib/api-response.js";

interface LiveLibImportQuery {
  username: string;
}

export async function livelibRoutes(fastify: FastifyInstance) {
  // POST /api/books/livelib-import — получить книги пользователя LiveLib
  fastify.post<{
    Body: LiveLibImportQuery;
  }>(
    "/livelib-import",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["username"],
          properties: {
            username: {
              type: "string",
              minLength: 1,
              description: "LiveLib username",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { username } = request.body;

      try {
        const books = await fetchUserBooks(username);
        return reply
          .code(200)
          .send(createSuccessResponse({ books, username }));
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes("не найден") ||
            error.message.includes("not found")
          ) {
            return reply
              .code(404)
              .send(
                createApiError(
                  ErrorCodes.NOT_FOUND,
                  "Пользователь не найден на LiveLib",
                ),
              );
          }
          fastify.log.warn(error, "LiveLib import failed");
          return reply
            .code(502)
            .send(
              createApiError(
                ErrorCodes.SERVICE_UNAVAILABLE,
                "Не удалось загрузить книги из LiveLib. Попробуйте позже.",
              ),
            );
        }
        throw error;
      }
    },
  );
}
