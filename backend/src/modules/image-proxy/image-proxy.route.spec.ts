// backend/src/modules/image-proxy/image-proxy.route.spec.ts
// GET /api/images/proxy:
//   - cache hit (getWebP вернул s3Url) → 302 на собственный домен (bookstrata.ru/img),
//     без cache-buster-параметра: CDN отключён, ключ кэша больше не нужен;
//   - cache miss (getWebP вернул buffer) → 200 с телом image/webp;
//   - URL вне белого списка → 403.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";

const mocks = vi.hoisted(() => ({
  isAllowedUrl: vi.fn(),
  getWebP: vi.fn(),
}));

vi.mock("./image-proxy.service.js", () => ({
  isAllowedUrl: mocks.isAllowedUrl,
  getWebP: mocks.getWebP,
}));

import { imageProxyRoutes } from "./image-proxy.route.js";

const MEDIA_URL = "https://bookstrata.ru/img/image-cache/abc123.webp";

describe("GET /api/images/proxy", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    await instance.register(imageProxyRoutes, { prefix: "/api/images" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.isAllowedUrl.mockReturnValue(true);
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("cache hit → 302 на собственный домен без лишних параметров в Location", async () => {
    mocks.getWebP.mockResolvedValue({ buffer: null, s3Url: MEDIA_URL });

    const res = await request(app.server).get(
      "/api/images/proxy?url=" + encodeURIComponent("https://content.img-gorod.ru/cover.jpg"),
    );

    expect(res.status).toBe(302);
    // CDN отключён: отдаём чистый URL, cache-buster больше не нужен
    expect(res.headers.location).toBe(MEDIA_URL);
  });

  it("cache miss → 200 с телом image/webp", async () => {
    const buffer = Buffer.from("fake-webp");
    mocks.getWebP.mockResolvedValue({ buffer, s3Url: null });

    const res = await request(app.server).get(
      "/api/images/proxy?url=" + encodeURIComponent("https://content.img-gorod.ru/cover.jpg"),
    );

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/webp");
    expect(Buffer.isBuffer(res.body)).toBe(true);
  });

  it("URL вне белого списка → 403", async () => {
    mocks.isAllowedUrl.mockReturnValue(false);

    const res = await request(app.server).get(
      "/api/images/proxy?url=" + encodeURIComponent("https://evil.example.com/cover.jpg"),
    );

    expect(res.status).toBe(403);
    expect(mocks.getWebP).not.toHaveBeenCalled();
  });
});
