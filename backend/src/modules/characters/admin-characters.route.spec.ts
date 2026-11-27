// backend/src/modules/characters/admin-characters.route.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";

const mocks = vi.hoisted(() => ({
  searchCharacters: vi.fn(),
}));

vi.mock("./characters.service.js", () => ({
  searchCharacters: mocks.searchCharacters,
}));

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, _reply: any, done: any) => {
    const authHeader = request.headers.authorization;
    if (authHeader === "Bearer admin-token") {
      request.user = { userId: 1, username: "admin", role: "admin" };
    } else if (authHeader === "Bearer user-token") {
      request.user = { userId: 2, username: "user", role: "user" };
    }
    done();
  }),
}));

vi.mock("../../middleware/requireRole.js", () => ({
  requireRole: (...roles: string[]) => {
    return (request: any, reply: any, done: any) => {
      if (!request.user) {
        reply.code(401).send({ error: { code: "unauthorized", message: "Требуется авторизация" } });
      } else if (roles.includes(request.user.role)) {
        done();
      } else {
        reply.code(403).send({ error: { code: "forbidden", message: "Нет прав доступа" } });
      }
    };
  },
}));

import { adminCharactersRoutes } from "./admin-characters.route.js";

describe("Admin Characters Routes", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });
    await app.register(adminCharactersRoutes, { prefix: "/api/admin/characters" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("без токена → 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/characters?q=Данте",
    });

    expect(res.statusCode).toBe(401);
    expect(mocks.searchCharacters).not.toHaveBeenCalled();
  });

  it("обычный пользователь → 403", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/characters?q=Данте",
      headers: { authorization: "Bearer user-token" },
    });

    expect(res.statusCode).toBe(403);
    expect(mocks.searchCharacters).not.toHaveBeenCalled();
  });

  it("GET /api/admin/characters?q=Данте → 200 и вызывает searchCharacters('Данте')", async () => {
    const items = [
      {
        id: 1,
        slug: "dante-alighieri",
        name: "Данте",
        aliases: ["Поэт"],
        universeSlug: null,
        traits: ["мыслитель"],
        bookCount: 2,
      },
    ];
    mocks.searchCharacters.mockResolvedValue(items);

    const res = await app.inject({
      method: "GET",
      url: "/api/admin/characters?q=%D0%94%D0%B0%D0%BD%D1%82%D0%B5",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { items } });
    expect(mocks.searchCharacters).toHaveBeenCalledWith("Данте");
  });

  it("GET /api/admin/characters без q → вызывает searchCharacters('')", async () => {
    mocks.searchCharacters.mockResolvedValue([]);

    const res = await app.inject({
      method: "GET",
      url: "/api/admin/characters",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { items: [] } });
    expect(mocks.searchCharacters).toHaveBeenCalledWith("");
  });

  it("GET /api/admin/characters?q=a&q=b → 400 validation_error", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/characters?q=a&q=b",
      headers: { authorization: "Bearer admin-token" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("validation_error");
    expect(mocks.searchCharacters).not.toHaveBeenCalled();
  });
});
