import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";
import { newsRoutes } from "./news.route.js";
import { prisma } from "../../lib/prisma.js";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    newsArticle: {
      findFirst: vi.fn(),
    },
  },
}));

describe("News Detail Security (Verification)", () => {
  let app: any;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    // Mock the user decorator
    app.decorateRequest("user", null);
    app.register(newsRoutes);
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should return 404 for draft news when requested by anonymous users (SECURED)", async () => {
    // Mock findFirst to return null because isPublished: true will be in where clause
    (prisma.newsArticle.findFirst as any).mockResolvedValue(null);

    // Act: Anonymous user requests a draft article by ID
    await request(app.server)
      .get("/1")
      .expect(404);

    // Assert: Check that where clause enforced isPublished: true
    expect(prisma.newsArticle.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1, isPublished: true }
    }));
  });

  it("should return news for admin users even if it is a draft", async () => {
    const draftArticle = {
      id: 1,
      title: "Draft News",
      content: "Draft content",
      isPublished: false,
      author: { username: "admin" }
    };

    (prisma.newsArticle.findFirst as any).mockResolvedValue(draftArticle);

    // Mock an admin user
    const adminApp = Fastify({ logger: false });
    adminApp.addHook("onRequest", async (req: any) => {
      req.user = { userId: 1, role: "admin" };
    });
    adminApp.register(newsRoutes);
    await adminApp.ready();

    // Act: Admin user requests a draft article by ID
    const response = await request(adminApp.server)
      .get("/1")
      .expect(200);

    // Assert: It returns the draft content
    expect(response.body.title).toBe("Draft News");
    expect(prisma.newsArticle.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 } // No isPublished: true filter for admins
    }));

    await adminApp.close();
  });
});
