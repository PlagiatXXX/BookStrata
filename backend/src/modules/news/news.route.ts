/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { NewsService } from "./news.service.js";
import { createLogger } from "../../lib/logger.js";
import { requireRole } from "../../middleware/requireRole.js";

const logger = createLogger("NewsRoute", { color: "cyan" });

const getNewsQuerySchema = {
  querystring: {
    type: "object",
    properties: {
      page: { type: "string", pattern: "^[0-9]+$", default: "1" },
      limit: { type: "string", pattern: "^[0-9]+$", default: "10" },
      publishedOnly: { type: "string", enum: ["true", "false"] },
    },
  },
};

export async function newsRoutes(fastify: FastifyInstance) {
  const newsService = new NewsService();

  /**
   * GET /api/news
   * Получить все новости (с пагинацией)
   */
  fastify.get(
    "/",
    { schema: getNewsQuerySchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const {
          page = "1",
          limit = "10",
          publishedOnly: publishedOnlyQuery,
        } = request.query as Record<string, string>;

        const userRole = (request as any).user?.role;
        const isAdminOrModerator =
          userRole === "admin" || userRole === "moderator";

        // Security: If not admin/moderator, force publishedOnly to true
        // If user is admin/moderator, respect their choice, otherwise default to showing all articles for them
        let publishedOnly = true;

        if (isAdminOrModerator) {
          publishedOnly = publishedOnlyQuery === "true";
          if (publishedOnlyQuery === undefined) {
            publishedOnly = false; // Admins see everything by default
          }
        } else {
          publishedOnly = true; // Non-admins always see only published
        }

        const articles = await newsService.getAllNews({
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          publishedOnly,
        });

        return reply.send(articles);
    } catch (error) {
      logger.error("Ошибка получения новостей", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return reply.code(500).send({ error: "Ошибка при получении новостей" });
    }
  });

  /**
   * GET /api/news/published
   * Получить опубликованные новости для главной страницы
   */
  fastify.get(
    "/published",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { limit = "6" } = request.query as Record<string, string>;

        const articles = await newsService.getPublishedNews(
          parseInt(limit, 10),
        );

        return reply.send(articles);
      } catch (error) {
        logger.error("Ошибка получения опубликованных новостей", { error });
        return reply.code(500).send({ error: "Ошибка при получении новостей" });
      }
    },
  );

  /**
   * GET /api/news/:id
   * Получить новость по ID
   */
  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const userRole = (request as any).user?.role;
      const isAdminOrModerator =
        userRole === "admin" || userRole === "moderator";

      const article = await newsService.getNewsById(parseInt(id, 10), {
        publishedOnly: !isAdminOrModerator,
      });

      if (!article) {
        return reply.code(404).send({ error: "Новость не найдена" });
      }

      return reply.send(article);
    } catch (error) {
      logger.error("Ошибка получения новости", { error });
      return reply.code(500).send({ error: "Ошибка при получении новости" });
    }
  });

  /**
   * POST /api/news
   * Создать новость (требуется роль admin или moderator)
   */
  fastify.post(
    "/",
    { preHandler: requireRole("admin", "moderator") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as Record<string, unknown>;

        // Валидация данных
        const validated = await newsService.validateCreateNews(body);

        await newsService.createNews(validated, request.user!.userId);

        return reply.code(201).send({ message: "Новость создана" });
      } catch (error) {
        logger.error("Ошибка создания новости", { error });

        if (error instanceof Error && error.name === "ZodError") {
          return reply.code(400).send({ error: "Неверный формат данных" });
        }

        return reply.code(500).send({ error: "Ошибка при создании новости" });
      }
    },
  );

  /**
   * PUT /api/news/:id
   * Обновить новость (требуется роль admin или moderator)
   */
  fastify.put(
    "/:id",
    { preHandler: requireRole("admin", "moderator") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as Record<string, unknown>;

        // Валидация данных
        const validated = await newsService.validateUpdateNews(body);

        const article = await newsService.updateNews(
          parseInt(id, 10),
          validated,
        );

        if (!article) {
          return reply.code(404).send({ error: "Новость не найдена" });
        }

        return reply.send({ message: "Новость обновлена", article });
      } catch (error) {
        logger.error("Ошибка обновления новости", { error });

        if (error instanceof Error && error.name === "ZodError") {
          return reply.code(400).send({ error: "Неверный формат данных" });
        }

        return reply.code(500).send({ error: "Ошибка при обновлении новости" });
      }
    },
  );

  /**
   * DELETE /api/news/:id
   * Удалить новость (требуется роль admin или moderator)
   */
  fastify.delete(
    "/:id",
    { preHandler: requireRole("admin", "moderator") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        await newsService.deleteNews(parseInt(id, 10));

        return reply.send({ message: "Новость удалена" });
      } catch (error) {
        logger.error("Ошибка удаления новости", { error });
        return reply.code(500).send({ error: "Ошибка при удалении новости" });
      }
    },
  );

  /**
   * POST /api/news/:id/publish
   * Опубликовать/снять с публикации новость (требуется роль admin или moderator)
   */
  fastify.post(
    "/:id/publish",
    { preHandler: requireRole("admin", "moderator") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { isPublished } = request.body as { isPublished: boolean };

        const article = await newsService.togglePublish(
          parseInt(id, 10),
          isPublished,
        );

        if (!article) {
          return reply.code(404).send({ error: "Новость не найдена" });
        }

        return reply.send({ message: "Статус публикации изменён", article });
      } catch (error) {
        logger.error("Ошибка изменения статуса публикации", { error });
        return reply
          .code(500)
          .send({ error: "Ошибка при изменении статуса публикации" });
      }
    },
  );
}
