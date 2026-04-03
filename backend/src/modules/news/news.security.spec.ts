import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";
import { NewsService } from "./news.service.js";
import { newsRoutes } from "./news.route.js";
import { prisma } from "../../lib/prisma.js";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    newsArticle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("News Security (Vulnerability Reproduction)", () => {
  let newsService: NewsService;
  let app: any;

  beforeEach(async () => {
    newsService = new NewsService();
    app = Fastify({ logger: false });
    // Mock the auth decorator that authPlugin usually provides
    app.decorateRequest("user", null);
    app.register(newsRoutes);
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should hide unpublished news by default (SECURED)", async () => {
    (prisma.newsArticle.findMany as any).mockResolvedValue([]);
    (prisma.newsArticle.count as any).mockResolvedValue(0);

    // Act: Requesting all news without explicit publishedOnly
    await newsService.getAllNews();

    // Assert: Check that where clause enforces isPublished: true
    expect(prisma.newsArticle.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isPublished: true }
    }));
  });

  it("should return all news if explicitly set to false in service call (Internal usage only)", async () => {
    (prisma.newsArticle.findMany as any).mockResolvedValue([]);
    (prisma.newsArticle.count as any).mockResolvedValue(0);

    // Act: Requesting news with publishedOnly: false
    // In the current implementation, publishedOnly: false means "give me everything" (where: {})
    await newsService.getAllNews({ publishedOnly: false });

    expect(prisma.newsArticle.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {}
    }));
  });

  it("should enforce publishedOnly=true in route for unauthenticated users", async () => {
    (prisma.newsArticle.findMany as any).mockResolvedValue([]);
    (prisma.newsArticle.count as any).mockResolvedValue(0);

    // Act: Calling the route as anonymous user trying to see unpublished
    await request(app.server)
      .get("/")
      .query({ publishedOnly: "false" })
      .expect(200);

    // Assert: Check that service was called with publishedOnly: true despite query
    expect(prisma.newsArticle.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isPublished: true }
    }));
  });

  it("should allow publishedOnly=false in route for admin users", async () => {
    (prisma.newsArticle.findMany as any).mockResolvedValue([]);
    (prisma.newsArticle.count as any).mockResolvedValue(0);

    // Mock an admin user
    const adminApp = Fastify({ logger: false });
    adminApp.addHook("onRequest", async (req: any) => {
      req.user = { userId: 1, role: "admin" };
    });
    adminApp.register(newsRoutes);
    await adminApp.ready();

    // Act: Calling the route as admin user
    await request(adminApp.server)
      .get("/")
      .query({ publishedOnly: "false" })
      .expect(200);

    // Assert: Check that service was called with publishedOnly: false
    expect(prisma.newsArticle.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {}
    }));

    await adminApp.close();
  });

  it("should hide unpublished news from anonymous users when requested by ID (VULNERABILITY REPRODUCTION)", async () => {
    // @ts-ignore
    vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(null);

    // Act: Requesting specific news by ID as anonymous user
    const response = await request(app.server).get("/999");

    // Assert: It should return 404 (Not Found) if it's unpublished and we're not admin
    expect(response.status).toBe(404);
    expect(prisma.newsArticle.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 999, isPublished: true }
    }));
  });

  it("should allow admins to see unpublished news by ID", async () => {
    const unpublishedArticle = {
      id: 999,
      title: "Draft News",
      isPublished: false,
      publishedAt: new Date(),
    };

    // @ts-ignore
    vi.mocked(prisma.newsArticle.findFirst).mockResolvedValue(unpublishedArticle);

    // Mock an admin user
    const adminApp = Fastify({ logger: false });
    adminApp.addHook("onRequest", async (req: any) => {
      req.user = { userId: 1, role: "admin" };
    });
    adminApp.register(newsRoutes);
    await adminApp.ready();

    // Act: Requesting specific news by ID as admin user
    const response = await request(adminApp.server).get("/999");

    // Assert: Admins should see it
    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Draft News");

    await adminApp.close();
  });
});
