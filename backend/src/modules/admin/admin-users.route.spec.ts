import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/users/42/reset-password",
      payload: { password: "newPassword123" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("возвращает 403 для обычного пользователя", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/users/42/reset-password",
      headers: { authorization: "Bearer user-token" },
      payload: { password: "newPassword123" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("возвращает 400 для некорректного ID", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/users/abc/reset-password",
      headers: { authorization: "Bearer admin-token" },
      payload: { password: "newPassword123" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("возвращает 404 если пользователь не найден", async () => {
    vi.mocked(adminResetPassword).mockRejectedValue(new Error("Пользователь не найден"));

    const res = await app.inject({
      method: "POST",
      url: "/api/admin/users/999/reset-password",
      headers: { authorization: "Bearer admin-token" },
      payload: { password: "newPassword123" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("возвращает 400 для слишком короткого пароля", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/users/42/reset-password",
      headers: { authorization: "Bearer admin-token" },
      payload: { password: "short" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("сбрасывает пароль для админа", async () => {
    vi.mocked(adminResetPassword).mockResolvedValue({
      message: "Пароль пользователя testuser успешно сброшен",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/admin/users/42/reset-password",
      headers: { authorization: "Bearer admin-token" },
      payload: { password: "newPassword123" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      data: { message: "Пароль пользователя testuser успешно сброшен" },
    });
    expect(adminResetPassword).toHaveBeenCalledWith(42, "newPassword123");
  });
});
