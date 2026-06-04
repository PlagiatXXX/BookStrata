import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Discussions", () => {
  let ctx: TestContext;
  let tokenA: string;
  let tokenB: string;
  let adminToken: string;
  let topicId: string;
  let messageId: string;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "disc_a", "disc_a@test.com", "StrongPass1!");
    const loginA = await loginUser(ctx.fastify, "disc_a", "StrongPass1!");
    tokenA = extractToken(loginA);

    await registerUser(ctx.fastify, "disc_b", "disc_b@test.com", "StrongPass1!");
    const loginB = await loginUser(ctx.fastify, "disc_b", "StrongPass1!");
    tokenB = extractToken(loginB);

    await registerUser(ctx.fastify, "xdisc_oper", "xdisc_oper@test.com", "StrongPass1!");
    const adminRole = await ctx.prisma.role.findUnique({ where: { name: "admin" } });
    const adminUser = await ctx.prisma.user.findUnique({ where: { email: "xdisc_oper@test.com" } });
    await ctx.prisma.user.update({
      where: { id: adminUser!.id },
      data: { roleId: adminRole!.id },
    });
    const loginAdmin = await loginUser(ctx.fastify, "xdisc_oper", "StrongPass1!");
    adminToken = extractToken(loginAdmin);
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен вернуть пустой список топиков", async () => {
    const res = await ctx.fastify.inject({ method: "GET", url: "/api/discussions/topics" });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });

  it("должен создать топик и вернуть 201", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/discussions/topics",
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { title: "Тестовый топик" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe("Тестовый топик");
    expect(body.data.id).toBeDefined();
    expect(body.data.type).toBe("topic");
    topicId = body.data.id;
  });

  it("должен вернуть созданный топик в списке", async () => {
    const res = await ctx.fastify.inject({ method: "GET", url: "/api/discussions/topics" });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const topic = body.data.find((t: { id: string }) => t.id === topicId);
    expect(topic).toBeDefined();
    expect(topic.title).toBe("Тестовый топик");
  });

  it("должен создать сообщение в топике и вернуть 201", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: `/api/discussions/${topicId}/messages`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { content: "Привет, это тестовое сообщение!" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.content).toBe("Привет, это тестовое сообщение!");
    expect(body.data.discussionId).toBe(topicId);
    messageId = body.data.id;
  });

  it("должен вернуть сообщения топика с пагинацией", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/discussions/${topicId}/messages`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.meta).toBeDefined();
    expect(body.meta.totalItems).toBeGreaterThanOrEqual(1);
    expect(body.links).toBeDefined();
  });

  it("должен отредактировать своё сообщение", async () => {
    const res = await ctx.fastify.inject({
      method: "PATCH",
      url: `/api/discussions/${topicId}/messages/${messageId}`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { content: "Отредактированное сообщение" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.content).toBe("Отредактированное сообщение");
  });

  it("должен удалить сообщение админом и вернуть 204", async () => {
    const res = await ctx.fastify.inject({
      method: "DELETE",
      url: `/api/discussions/${topicId}/messages/${messageId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(204);
  });

  it("должен запретить редактирование чужого сообщения — 403", async () => {
    const msgRes = await ctx.fastify.inject({
      method: "POST",
      url: `/api/discussions/${topicId}/messages`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { content: "Ещё одно сообщение" },
    });
    const otherMessageId = JSON.parse(msgRes.body).data.id;

    const res = await ctx.fastify.inject({
      method: "PATCH",
      url: `/api/discussions/${topicId}/messages/${otherMessageId}`,
      headers: { Authorization: `Bearer ${tokenB}` },
      payload: { content: "Попытка взлома" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("должен запретить удаление сообщения для обычного пользователя — 403", async () => {
    const msgRes = await ctx.fastify.inject({
      method: "POST",
      url: `/api/discussions/${topicId}/messages`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { content: "Ещё одно сообщение" },
    });
    const otherMessageId = JSON.parse(msgRes.body).data.id;

    const res = await ctx.fastify.inject({
      method: "DELETE",
      url: `/api/discussions/${topicId}/messages/${otherMessageId}`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("должен получить общий чат (создаётся при первом обращении)", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/discussions/general",
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.type).toBe("general");
  });

  it("должен создать обсуждение для битвы", async () => {
    const battle = await ctx.prisma.battle.create({
      data: {
        title: "Тестовая битва",
        endTime: new Date(Date.now() + 86400000),
      },
    });

    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/discussions",
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { battleId: battle.id, title: "Обсуждение битвы" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.battleId).toBe(battle.id);
    expect(body.data.type).toBe("battle");
  });

  it("должен получить обсуждение по id", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/discussions/${topicId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBe(topicId);
    expect(body.data.title).toBe("Тестовый топик");
  });

  it("должен вернуть 404 для несуществующего обсуждения", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/discussions/00000000-0000-0000-0000-000000000000",
    });

    expect(res.statusCode).toBe(404);
  });
});
