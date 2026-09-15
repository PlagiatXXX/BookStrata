import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";

vi.mock("./admin-users.service.js", () => ({
  adminResetPassword: vi.fn(),
}));

import { adminResetPassword } from "./admin-users.service.js";
import { adminUsersRoutes } from "./admin-users.route.js";

describe("POST /api/admin/users/:id/reset-password", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });

    instance.addHook("preHandler", (request: any, _reply: any, done: any) => {
      const authHeader = request.headers.authorization;
      if (authHeader === "Bearer admin-token") {
        request.user = { userId: 1, username: "admin", role: "admin" };
      } else if (authHeader === "Bearer user-token") {
        request.user = { userId: 2, username: "user", role: "user" };
      }
      done();
    });

    await instance.register(adminUsersRoutes, { prefix: "/api/admin" });
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

  it("возвращает 401 без авторизации", async () => {
    await request(app.server)
      .post("/api/admin/users/42/reset-password")
      .send({ password: "newPassword123" })
      .expect(401);
  });

  it("возвращает 403 для обычного пользователя", async () => {
    await request(app.server)
      .post("/api/admin/users/42/reset-password")
      .set("Authorization", "Bearer user-token")
      .send({ password: "newPassword123" })
      .expect(403);
  });

  it("возвращает 400 для некорректного ID", async () => {
    await request(app.server)
      .post("/api/admin/users/abc/reset-password")
      .set("Authorization", "Bearer admin-token")
      .send({ password: "newPassword123" })
      .expect(400);
  });

  it("возвращает 404 если пользователь не найден", async () => {
    vi.mocked(adminResetPassword).mockRejectedValue(new Error("Пользователь не найден"));

    await request(app.server)
      .post("/api/admin/users/999/reset-password")
      .set("Authorization", "Bearer admin-token")
      .send({ password: "newPassword123" })
      .expect(404);
  });

  it("сбрасывает пароль для админа", async () => {
    vi.mocked(adminResetPassword).mockResolvedValue({
      message: "Пароль пользователя testuser успешно сброшен",
    });

    const res = await request(app.server)
      .post("/api/admin/users/42/reset-password")
      .set("Authorization", "Bearer admin-token")
      .send({ password: "newPassword123" })
      .expect(200);

    expect(res.body).toEqual({
      data: { message: "Пароль пользователя testuser успешно сброшен" },
    });
    expect(adminResetPassword).toHaveBeenCalledWith(42, "newPassword123");
  });
});
