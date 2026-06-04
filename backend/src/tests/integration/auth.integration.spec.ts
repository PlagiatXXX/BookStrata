import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser } from "./helpers.js";

import type { TestContext } from "./helpers.js";

describe("Auth", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestServer();
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен зарегистрировать нового пользователя", async () => {
    const res = await registerUser(ctx.fastify, "intusr1", "intusr1@test.com", "StrongPass1!");

    expect(res.statusCode).toBe(201);
    const user = await ctx.prisma.user.findUnique({
      where: { email: "intusr1@test.com" },
    });
    expect(user).not.toBeNull();
    expect(user!.username).toBe("intusr1");
  });

  it("должен вернуть 409 при повторной регистрации", async () => {
    const res = await registerUser(ctx.fastify, "intusr1", "intusr1@test.com", "StrongPass1!");

    expect(res.statusCode).toBe(409);
  });

  it("должен залогиниться и получить токен", async () => {
    const res = await loginUser(ctx.fastify, "intusr1", "StrongPass1!");

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const data = body.data || body;
    expect(data.accessToken).toBeTruthy();
  });

  it("должен вернуть 401 с неверным паролем", async () => {
    const res = await loginUser(ctx.fastify, "intusr1", "WrongPass1!");

    expect(res.statusCode).toBe(401);
  });
});
