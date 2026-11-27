import type { FastifyPluginAsync } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import {
  createApiError,
  createSuccessResponse,
  ErrorCodes,
} from "../../lib/api-response.js";
import {
  createSeries,
  deleteSeries,
  findOrCreateSeriesByName,
  getSeriesBySlug,
  listSeries,
  updateSeries,
} from "./series.service.js";
import {
  listSeriesQuerySchema,
  type CreateSeriesInput,
  type UpdateSeriesInput,
} from "./series.schema.js";

function parsePositiveIntId(raw: string): number | null {
  const num = Number(raw);
  return Number.isInteger(num) && num > 0 ? num : null;
}

export const seriesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/series — список циклов с поиском и пагинацией
  fastify.get("/", async (request, reply) => {
    const query = listSeriesQuerySchema.parse(request.query);
    const result = await listSeries(query);
    reply.header("Cache-Control", "public, max-age=60, s-maxage=300");
    return reply.send(createSuccessResponse(result));
  });

  // GET /api/series/:slug — хаб цикла (цикл + опубликованные книги по порядку)
  fastify.get<{ Params: { slug: string } }>("/:slug", async (request, reply) => {
    const { slug } = request.params;
    const series = await getSeriesBySlug(slug);
    if (!series) {
      return reply
        .code(404)
        .send(createApiError(ErrorCodes.NOT_FOUND, "Цикл не найден"));
    }
    reply.header("Cache-Control", "public, max-age=60, s-maxage=300");
    return reply.send(createSuccessResponse(series));
  });
};

export const adminSeriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", requireRole("admin"));

  // GET /api/admin/series — список циклов для админки
  fastify.get("/", async (request, reply) => {
    const query = listSeriesQuerySchema.parse(request.query);
    const result = await listSeries(query);
    return reply.send(createSuccessResponse(result));
  });

  // POST /api/admin/series — создать цикл (или findOrCreate при inline-вводе)
  fastify.post<{
    Body: CreateSeriesInput & { findOrCreate?: boolean };
  }>("/", async (request, reply) => {
    const { findOrCreate, ...payload } = request.body ?? ({} as CreateSeriesInput);
    const series = findOrCreate
      ? await findOrCreateSeriesByName(payload.name ?? "", payload.authorId)
      : await createSeries(payload);
    return reply.code(201).send(createSuccessResponse(series));
  });

  // PATCH /api/admin/series/:id — обновить цикл (slug не меняется)
  fastify.patch<{ Params: { id: string }; Body: UpdateSeriesInput }>(
    "/:id",
    async (request, reply) => {
      const id = parsePositiveIntId(request.params.id);
      if (id === null) {
        return reply
          .code(400)
          .send(createApiError(ErrorCodes.VALIDATION_ERROR, "Некорректный ID цикла"));
      }
      const series = await updateSeries(id, request.body);
      return reply.send(createSuccessResponse(series));
    },
  );

  // DELETE /api/admin/series/:id — удалить цикл (409, если есть привязанные книги)
  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const id = parsePositiveIntId(request.params.id);
    if (id === null) {
      return reply
        .code(400)
        .send(createApiError(ErrorCodes.VALIDATION_ERROR, "Некорректный ID цикла"));
    }
    const result = await deleteSeries(id);
    return reply.send(createSuccessResponse(result));
  });
};
