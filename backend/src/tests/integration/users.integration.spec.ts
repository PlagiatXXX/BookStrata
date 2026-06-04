import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken, getMe, updateUsername, changePassword } from "./helpers.js";

import type { TestContext } from "./helpers.js";

describe("Users /me", () => {
  let ctx: TestContext;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    ctx = await createTestServer();
    await registerUser(ctx.fastify, "userme", "userme@test.com", "StrongPass1!");
    const loginRes = await loginUser(ctx.fastify, "userme", "StrongPass1!");
    token = extractToken(loginRes);

    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: "userme@test.com" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен вернуть профиль текущего пользователя", async () => {
    const res = await getMe(ctx.fastify, token);

    expect(res.statusCode).toBe(200);
    const user = JSON.parse(res.body).data;
    expect(user.id).toBe(userId);
    expect(user.username).toBe("userme");
    expect(user.email).toBe("userme@test.com");
  });

  it("должен обновить username", async () => {
    const res = await updateUsername(ctx.fastify, token, "newusername");

    expect(res.statusCode).toBe(200);
    const user = JSON.parse(res.body).data;
    expect(user.username).toBe("newusername");

    const dbUser = await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(dbUser.username).toBe("newusername");
  });

  it("должен вернуть 400 при неверном текущем пароле", async () => {
    const res = await changePassword(ctx.fastify, token, "WrongPassword1!", "NewPass123!");

    expect(res.statusCode).toBe(400);
  });

  it("должен сменить пароль с правильным текущим паролем", async () => {
    const res = await changePassword(ctx.fastify, token, "StrongPass1!", "NewPass123!");

    expect(res.statusCode).toBe(200);
  });

  it("должен залогиниться с новым паролем", async () => {
    const res = await loginUser(ctx.fastify, "newusername", "NewPass123!");

    expect(res.statusCode).toBe(200);
    const newToken = extractToken(res);
    expect(newToken).toBeTruthy();
  });

  it("должен вернуть 401 без токена", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/users/me",
    });

    expect(res.statusCode).toBe(401);
  });
});
