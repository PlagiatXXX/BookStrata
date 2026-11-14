import { describe, it, expect } from "vitest";
import Fastify, { type FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { isPrerenderRequest } from "./rate-limit.js";
import { config } from "../config/env.js";

describe("rate-limit allowList для пререндера", () => {
  it("isPrerenderRequest возвращает true только при валидном x-prerender-secret", () => {
    const validReq = {
      headers: { "x-prerender-secret": config.PRERENDER_SECRET },
    } as unknown as FastifyRequest;

    const invalidReq = {
      headers: { "x-prerender-secret": "wrong-secret" },
    } as unknown as FastifyRequest;

    const emptyReq = {
      headers: {},
    } as unknown as FastifyRequest;

    expect(isPrerenderRequest(validReq)).toBe(true);
    expect(isPrerenderRequest(invalidReq)).toBe(false);
    expect(isPrerenderRequest(emptyReq)).toBe(false);
  });

  it("пропускает запросы с x-prerender-secret сверх лимита rateLimit", async () => {
    const app = Fastify({ logger: false });

    await app.register(rateLimit, {
      global: true,
      max: 2,
      timeWindow: "1 minute",
      allowList: (req) => isPrerenderRequest(req),
    });

    app.get("/test", async () => ({ status: "ok" }));

    // 1-й и 2-й обычные запросы проходят
    const res1 = await app.inject({ method: "GET", url: "/test" });
    expect(res1.statusCode).toBe(200);

    const res2 = await app.inject({ method: "GET", url: "/test" });
    expect(res2.statusCode).toBe(200);

    // 3-й обычный запрос блокируется (429)
    const res3 = await app.inject({ method: "GET", url: "/test" });
    expect(res3.statusCode).toBe(429);

    // Запросы с секретом пререндера проходят даже после исчерпания лимита
    for (let i = 0; i < 5; i++) {
      const resPrerender = await app.inject({
        method: "GET",
        url: "/test",
        headers: {
          "x-prerender-secret": config.PRERENDER_SECRET,
        },
      });
      expect(resPrerender.statusCode).toBe(200);
      expect(resPrerender.json()).toEqual({ status: "ok" });
    }

    await app.close();
  });
});
