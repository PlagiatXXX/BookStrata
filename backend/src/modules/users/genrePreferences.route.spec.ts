// backend/src/modules/users/genrePreferences.route.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((req: { user?: { userId: number } }, _reply: unknown, done: () => void) => {
    req.user = { userId: 7 };
    done();
  }),
}));

describe("GET/PUT /api/users/me/genre-preferences", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { userRoutes } = await import("./users.route.js");
    app = Fastify({ logger: false });
    await app.register(userRoutes, { prefix: "/api/users" });
    await app.ready();
  });

  it("GET: отдаёт genres из сервиса", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ genrePreferences: ["fantasy"] } as never);
    const res = await request(app.server).get("/api/users/me/genre-preferences");
    expect(res.statusCode).toBe(200);
    expect(res.body.data.genres).toEqual(["fantasy"]);
  });

  it("PUT: валидный body → 200 с очищенным списком", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    const res = await request(app.server)
      .put("/api/users/me/genre-preferences")
      .send({ genres: ["fantasy", "horror"] });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.genres).toEqual(["fantasy", "horror"]);
  });

  it("PUT: без genres → 400", async () => {
    const res = await request(app.server).put("/api/users/me/genre-preferences").send({});
    expect(res.statusCode).toBe(400);
  });

  it("PUT: genres не массив → 400", async () => {
    const res = await request(app.server)
      .put("/api/users/me/genre-preferences")
      .send({ genres: "fantasy" });
    expect(res.statusCode).toBe(400);
  });
});
