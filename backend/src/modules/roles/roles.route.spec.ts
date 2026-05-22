import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";
import cors from "@fastify/cors";

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  };
  return { prisma: tx };
});

import { rolesRoutes } from "./roles.route.js";

describe("Roles Routes", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    await instance.register(cors, { origin: true });

    instance.addHook("preHandler", (request: any, _reply: any, done: any) => {
      const authHeader = request.headers.authorization;
      if (authHeader === "Bearer admin-token") {
        request.user = { userId: 1, username: "admin", role: "admin" };
      } else if (authHeader === "Bearer user-token") {
        request.user = { userId: 2, username: "user", role: "user" };
      }
      done();
    });

    const { prisma } = await import("../../lib/prisma.js");
    instance.decorate("prisma", prisma);
    await instance.register(rolesRoutes, { prefix: "/api" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  describe("GET /api/roles", () => {
    it("должен вернуть список ролей (admin)", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      const mockRoles = [
        { id: 1, name: "admin", description: "Admin" },
        { id: 2, name: "user", description: "User" },
      ];
      (prisma.role.findMany as any).mockResolvedValue(mockRoles);

      const res = await request(app.server)
        .get("/api/roles")
        .set("Authorization", "Bearer admin-token")
        .expect(200);

      expect(res.body.data).toEqual(mockRoles);
    });

    it("должен вернуть 403 для обычного пользователя", async () => {
      await request(app.server)
        .get("/api/roles")
        .set("Authorization", "Bearer user-token")
        .expect(403);
    });
  });

  describe("GET /api/roles/me", () => {
    it("должен вернуть роль текущего пользователя", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      (prisma.user.findUnique as any).mockResolvedValue({
        createdAt: new Date(),
        role: { id: 3, name: "user", description: "Regular user" },
      });

      const res = await request(app.server)
        .get("/api/roles/me")
        .set("Authorization", "Bearer user-token")
        .expect(200);

      expect(res.body.data.name).toBe("user");
    });

    it("должен вернуть null если у пользователя нет роли", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      (prisma.user.findUnique as any).mockResolvedValue({
        createdAt: new Date(),
        role: null,
      });

      const res = await request(app.server)
        .get("/api/roles/me")
        .set("Authorization", "Bearer user-token")
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server).get("/api/roles/me").expect(401);
    });
  });

  describe("GET /api/roles/users/:roleName", () => {
    it("должен вернуть пользователей с ролью (admin)", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      (prisma.role.findUnique as any).mockResolvedValue({ id: 1, name: "admin" });
      (prisma.user.findMany as any).mockResolvedValue([
        { id: 1, email: "admin@test.com", username: "admin", roleId: 1 },
      ]);

      const res = await request(app.server)
        .get("/api/roles/users/admin")
        .set("Authorization", "Bearer admin-token")
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it("должен вернуть 400 при неверном имени роли", async () => {
      const res = await request(app.server)
        .get("/api/roles/users/invalid-role")
        .set("Authorization", "Bearer admin-token")
        .expect(400);

      expect(res.body.error.code).toBe("invalid_input");
    });
  });

  describe("PUT /api/roles/user/:userId", () => {
    it("должен назначить роль (admin)", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      (prisma.role.findUnique as any).mockResolvedValue({ id: 1, name: "admin", description: "Admin" });
      (prisma.user.update as any).mockResolvedValue({
        id: 2,
        role: { id: 1, name: "admin", description: "Admin" },
      });

      const res = await request(app.server)
        .put("/api/roles/user/2")
        .set("Authorization", "Bearer admin-token")
        .send({ role: "admin", password: "test" })
        .expect(200);

      expect(res.body.data.success).toBe(true);
    });

    it("должен вернуть 404 если роль не найдена в БД", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      (prisma.role.findUnique as any).mockResolvedValue(null);

      const res = await request(app.server)
        .put("/api/roles/user/2")
        .set("Authorization", "Bearer admin-token")
        .send({ role: "moderator", password: "test" })
        .expect(404);

      expect(res.body.error.code).toBe("not_found");
    });
  });

  describe("DELETE /api/roles/user/:userId", () => {
    it("должен снять роль с пользователя (admin)", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      (prisma.user.update as any).mockResolvedValue({ id: 2, roleId: null });

      await request(app.server)
        .delete("/api/roles/user/2")
        .set("Authorization", "Bearer admin-token")
        .expect(200);
    });

    it("должен вернуть 403 для обычного пользователя", async () => {
      await request(app.server)
        .delete("/api/roles/user/2")
        .set("Authorization", "Bearer user-token")
        .expect(403);
    });
  });
});
