import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { AppError, ConflictError } from "../../lib/errors.js";
import { createApiError, type ErrorCode } from "../../lib/api-response.js";

const serviceMock = vi.hoisted(() => ({
  listSeries: vi.fn(),
  getSeriesBySlug: vi.fn(),
  createSeries: vi.fn(),
  findOrCreateSeriesByName: vi.fn(),
  updateSeries: vi.fn(),
  deleteSeries: vi.fn(),
}));

vi.mock("./series.service.js", () => serviceMock);
vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn(async (req: { user?: { userId: number; role: string } }) => {
    req.user = { userId: 1, role: "admin" };
  }),
}));
vi.mock("../../middleware/requireRole.js", () => ({
  requireRole: () => vi.fn(async () => {}),
}));

import { seriesRoutes, adminSeriesRoutes } from "./series.route.js";

async function buildApp() {
  const app = Fastify();
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof AppError) {
      return reply
        .code(error.statusCode)
        .send(createApiError(error.code as ErrorCode, error.message));
    }
    return reply.code(500).send({ error: { message: error.message } });
  });
  await app.register(seriesRoutes, { prefix: "/api/series" });
  await app.register(adminSeriesRoutes, { prefix: "/api/admin/series" });
  return app;
}

describe("series.route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/series возвращает список циклов", async () => {
    serviceMock.listSeries.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    const app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/api/series?q=дюна" });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    await app.close();
  });

  it("GET /api/series/:slug возвращает 404 для несуществующего цикла", async () => {
    serviceMock.getSeriesBySlug.mockResolvedValue(null);
    const app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/api/series/unknown" });

    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("POST /api/admin/series поддерживает findOrCreate", async () => {
    serviceMock.findOrCreateSeriesByName.mockResolvedValue({
      id: 1,
      name: "Ведьмак",
      slug: "vedmak",
    });
    const app = await buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/api/admin/series",
      payload: { name: "Ведьмак", findOrCreate: true },
    });

    expect(res.statusCode).toBe(201);
    expect(serviceMock.findOrCreateSeriesByName).toHaveBeenCalledWith("Ведьмак", undefined);
    await app.close();
  });

  it("DELETE /api/admin/series/:id возвращает 409 при привязанных книгах", async () => {
    serviceMock.deleteSeries.mockRejectedValue(new ConflictError("Нельзя удалить цикл"));
    const app = await buildApp();

    const res = await app.inject({ method: "DELETE", url: "/api/admin/series/5" });

    expect(res.statusCode).toBe(409);
    await app.close();
  });
});
