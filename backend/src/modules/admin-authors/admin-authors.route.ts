// backend/src/modules/admin-authors/admin-authors.route.ts
// Админ-эндпоинты ручного контента страницы автора. Только admin.
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { createApiError, createSuccessResponse, ErrorCodes } from "../../lib/api-response.js";
import { createAdminAuthorService, AdminAuthorError } from "./admin-authors.service.js";
import { authorContentInputSchema } from "./admin-authors.schema.js";
import { validateImageSize } from "../../lib/validators.js";
import { uploadBase64 } from "../../lib/upload.js";

const handleError = (
  error: unknown,
  reply: { code: (code: number) => { send: (payload: unknown) => unknown } },
) => {
  if (error instanceof AdminAuthorError) {
    if (error.code === "author_not_found") {
      return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, error.message));
    }
    return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, error.message));
  }
  if (error instanceof z.ZodError) {
    return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Невалидный контент автора"));
  }
  throw error;
};

/** id из пути: только положительное целое — иначе 404, не отдаём Prisma NaN/дробь */
const parseAuthorId = (raw: string): number | null => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const adminAuthorsRoutes: FastifyPluginAsync = async (fastify) => {
  const service = createAdminAuthorService(fastify.prisma);

  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", requireRole("admin"));

  // GET /api/admin/authors?q= — список авторов с флагами контента
  fastify.get<{ Querystring: { q?: string } }>("/", async (request, reply) => {
    try {
      const authors = await service.list(request.query.q);
      return reply.code(200).send(createSuccessResponse({ authors }));
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // GET /api/admin/authors/:id/content — контент для редактора
  fastify.get<{ Params: { id: string } }>("/:id/content", async (request, reply) => {
    const id = parseAuthorId(request.params.id);
    if (id === null) {
      return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Автор не найден"));
    }
    try {
      const content = await service.getContent(id);
      return reply.code(200).send(createSuccessResponse(content));
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // PUT /api/admin/authors/:id/content — полный контент одной транзакцией
  fastify.put<{ Params: { id: string } }>("/:id/content", async (request, reply) => {
    const id = parseAuthorId(request.params.id);
    if (id === null) {
      return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Автор не найден"));
    }
    try {
      const input = authorContentInputSchema.parse(request.body);
      await service.saveContent(id, input);
      return reply.code(200).send(createSuccessResponse({ ok: true }));
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // POST /upload-hero — загрузить портрет автора (base64 → S3/CDN)
  // Как в admin-books/upload-cover: WebP q85 ≤1600px делает storage (prepareImage)
  fastify.post<{ Body: { heroImageUrl: string } }>(
    "/upload-hero",
    async (request, reply) => {
      const { heroImageUrl } = request.body ?? {};

      if (!heroImageUrl || !heroImageUrl.startsWith("data:")) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_FORMAT, "Invalid image format"));
      }

      const sizeError = validateImageSize(heroImageUrl);
      if (sizeError) {
        return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, sizeError));
      }

      try {
        const uploadResult = await uploadBase64(heroImageUrl, "tiermaker-pro/author-heroes");
        return reply.code(200).send(createSuccessResponse({ heroImageUrl: uploadResult.url }));
      } catch (error: unknown) {
        fastify.log.error({ error: String(error) }, "Failed to upload author hero image");
        return reply.code(500).send(createApiError(ErrorCodes.UPLOAD_FAILED, "Failed to upload image"));
      }
    },
  );
};
