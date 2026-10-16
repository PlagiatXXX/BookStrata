// Прод: Fastify видел адрес nginx (172.18.0.5), поэтому rate limit считал
// всех пользователей одним клиентом. Проверяем, что доверие к прокси
// ограничено и клиент не может подделать свой IP.
import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { buildFastifyOptions } from "./fastify-options.js";

const appWithTrustProxy = () => {
  const app = Fastify({ trustProxy: buildFastifyOptions().trustProxy, logger: false });
  app.get("/whoami", (request) => ({ ip: request.ip }));
  return app;
};

const NGINX = "172.18.0.5"; // адрес контейнера nginx в docker-сети

describe("buildFastifyOptions — доверие к прокси", () => {
  it("доверяет ровно одному хопу, а не «любому» прокси", () => {
    // true означало бы «верим любому X-Forwarded-For» — клиент подделает IP
    expect(buildFastifyOptions().trustProxy).toBe(1);
  });

  it("req.ip — реальный клиент, а не адрес nginx", async () => {
    const app = appWithTrustProxy();
    const response = await app.inject({
      method: "GET",
      url: "/whoami",
      remoteAddress: NGINX,
      headers: { "x-forwarded-for": "203.0.113.7" },
    });

    expect(response.json()).toEqual({ ip: "203.0.113.7" });
    await app.close();
  });

  it("клиент не подменяет IP своим X-Forwarded-For", async () => {
    const app = appWithTrustProxy();
    // Клиент прислал поддельный адрес, nginx дописал реальный в конец
    const response = await app.inject({
      method: "GET",
      url: "/whoami",
      remoteAddress: NGINX,
      headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.7" },
    });

    expect(response.json()).toEqual({ ip: "203.0.113.7" });
    await app.close();
  });

  it("без заголовков берёт адрес соединения", async () => {
    const app = appWithTrustProxy();
    const response = await app.inject({
      method: "GET",
      url: "/whoami",
      remoteAddress: "198.51.100.9",
    });

    expect(response.json()).toEqual({ ip: "198.51.100.9" });
    await app.close();
  });
});
