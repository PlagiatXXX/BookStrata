import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase, registerUser, loginUser, extractToken } from "./helpers.js";
import type { TestContext } from "./helpers.js";

describe("Book Ratings", () => {
  let ctx: TestContext;
  let tokenA: string;
  let tokenB: string;
  let bookId: number;

  beforeAll(async () => {
    ctx = await createTestServer();

    await registerUser(ctx.fastify, "rater_a", "rater_a@test.com", "StrongPass1!");
    const loginA = await loginUser(ctx.fastify, "rater_a", "StrongPass1!");
    tokenA = extractToken(loginA);

    await registerUser(ctx.fastify, "rater_b", "rater_b@test.com", "StrongPass1!");
    const loginB = await loginUser(ctx.fastify, "rater_b", "StrongPass1!");
    tokenB = extractToken(loginB);

    const book = await ctx.prisma.book.create({
      data: {
        title: "Тестовая книга",
        author: "Тестовый Автор",
        coverImageUrl: "https://example.com/cover.jpg",
        description: "Описание тестовой книги",
        thoughts: "Мои мысли",
      },
    });
    bookId = book.id;
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("должен поставить оценку книге и вернуть 201", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/ratings",
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        bookId,
        ratings: { style: 8.5, plot: 7, design: 9, atmosphere: 6.5, characters: 8 },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.rating.bookId).toBe(bookId);
    expect(body.data.averages).toBeDefined();
  });

  it("должен вернуть 409 при повторной оценке той же книги", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/ratings",
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        bookId,
        ratings: { style: 7, plot: 8 },
      },
    });

    expect(res.statusCode).toBe(409);
  });

  it("должен вернуть средние оценки книги", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/ratings/${bookId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.count).toBe(1);
    expect(body.data.averages.style).toBe(8.5);
    expect(body.data.averages.plot).toBe(7);
    expect(body.data.averages.design).toBe(9);
    expect(body.data.averages.atmosphere).toBe(6.5);
    expect(body.data.averages.characters).toBe(8);
    expect(body.data.overall).toBeGreaterThan(0);
    expect(body.data.categories).toBeDefined();
  });

  it("должен вернуть оценку текущего пользователя", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/ratings/${bookId}/mine`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).not.toBeNull();
    expect(body.data.bookId).toBe(bookId);
    expect(body.data.ratings).toBeDefined();
  });

  it("должен вернуть null для пользователя без оценки", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: `/api/ratings/${bookId}/mine`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeNull();
  });

  it("должен вернуть пустые оценки для несуществующей книги", async () => {
    const res = await ctx.fastify.inject({
      method: "GET",
      url: "/api/ratings/999999",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.count).toBe(0);
    expect(body.data.averages).toEqual({});
    expect(body.data.overall).toBe(0);
  });

  it("должен вернуть 401 без токена при попытке оценить", async () => {
    const res = await ctx.fastify.inject({
      method: "POST",
      url: "/api/ratings",
      payload: { bookId, ratings: { style: 5 } },
    });

    expect(res.statusCode).toBe(401);
  });
});
