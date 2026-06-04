import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, loginUser, extractToken, createTierList } from "./helpers.js";

import type { TestContext } from "./helpers.js";

describe("Лимиты: free vs Pro", () => {
  let ctx: TestContext;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    ctx = await createTestServer();
    // Создаём free user напрямую (регистрация включает Pro-триал)
    const bcryptjs = await import("bcryptjs");
    const passwordHash = await bcryptjs.hash("StrongPass1!", 10);
    const role = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "user" } });
    const user = await ctx.prisma.user.create({
      data: {
        username: "limitfree",
        email: "limitfree@test.com",
        passwordHash,
        roleId: role.id,
        isPro: false,
      },
    });
    userId = user.id;

    // Логинимся, чтобы получить токен
    const loginRes = await loginUser(ctx.fastify, "limitfree", "StrongPass1!");
    token = extractToken(loginRes);
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен создать 5 тир-листов бесплатно", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await createTierList(ctx.fastify, token, `Тир-лист ${i}`);
      expect(res.statusCode).toBe(201);
    }
    const count = await ctx.prisma.tierList.count({ where: { userId } });
    expect(count).toBe(5);
  });

  it("должен заблокировать 6-й тир-лист для free", async () => {
    const res = await createTierList(ctx.fastify, token, "6-й тир-лист");
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).message).toMatch(/лимит/i);
  });

  it("должен создать 6-й тир-лист после апгрейда до Pro", async () => {
    await ctx.prisma.user.update({
      where: { id: userId },
      data: { isPro: true },
    });

    const res = await createTierList(ctx.fastify, token, "Pro-тир-лист");
    expect(res.statusCode).toBe(201);
  });
});
