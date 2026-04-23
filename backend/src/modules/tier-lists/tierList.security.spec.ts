import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma FIRST without using top-level variables inside the factory
vi.mock("../../lib/prisma.js", () => {
  const mockP = {
    tierList: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    book: {
      create: vi.fn(),
      update: vi.fn(),
    },
    bookPlacement: {
      count: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    template: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((cb) => {
      if (typeof cb === 'function') return cb(mockP);
      return Promise.all(cb);
    }),
  };
  return {
    prisma: mockP,
  };
});

// We need to mock @prisma/client for TemplatesService which uses it in constructor
vi.mock("@prisma/client", () => {
   const mockP = {
    tierList: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    book: {
      create: vi.fn(),
      update: vi.fn(),
    },
    bookPlacement: {
      count: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    template: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((cb) => {
      if (typeof cb === 'function') return cb(mockP);
      return Promise.all(cb);
    }),
  };
  return {
    PrismaClient: vi.fn().mockImplementation(() => mockP),
  };
});

import { addBooksToTierList, updateBook, saveAll } from "./tierList.service.js";
import { TemplatesService } from "../templates/templates.service.js";
import { PrismaClient } from "@prisma/client";
import { prisma as mockPrisma } from "../../lib/prisma.js";

describe("Security: HTML Sanitization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const maliciousHtml = "Hello <script>alert('xss')</script><img src=x onerror=alert(1)> world";

  describe("TierListService Sanitization", () => {
    it("should sanitize book description and thoughts in addBooksToTierList", async () => {
      (mockPrisma.bookPlacement.count as any).mockResolvedValue(0);
      (mockPrisma.tierList.update as any).mockResolvedValue({
        placements: [{ book: { id: 1, title: "Test", description: "sanitized", thoughts: "sanitized" } }]
      });

      await addBooksToTierList(1, [{
        title: "Test Book",
        coverImageUrl: "http://example.com/cover.jpg",
        description: maliciousHtml,
        thoughts: maliciousHtml
      }]);

      const createCall = (mockPrisma.tierList.update as any).mock.calls[0][0].data.placements.create[0].book.create;
      expect(createCall.description).not.toContain("<script>");
      expect(createCall.description).not.toContain("onerror");
      expect(createCall.thoughts).not.toContain("<script>");
    });

    it("should sanitize book description and thoughts in updateBook", async () => {
      (mockPrisma.bookPlacement.findUniqueOrThrow as any).mockResolvedValue({});
      (mockPrisma.book.update as any).mockResolvedValue({});

      await updateBook(1, 101, {
        description: maliciousHtml,
        thoughts: maliciousHtml
      });

      const updateCall = (mockPrisma.book.update as any).mock.calls[0][0].data;
      expect(updateCall.description).not.toContain("<script>");
      expect(updateCall.thoughts).not.toContain("<script>");
    });

    it("should sanitize book description and thoughts in saveAll", async () => {
      (mockPrisma.book.create as any).mockResolvedValue({ id: 1 });
      await saveAll(1, 1, {
        newBooks: [{
          tempId: "temp-1",
          title: "New Book",
          coverImageUrl: "img.jpg",
          description: maliciousHtml,
          thoughts: maliciousHtml
        }]
      });

      const createCall = (mockPrisma.book.create as any).mock.calls[0][0].data;
      expect(createCall.description).not.toContain("<script>");
      expect(createCall.thoughts).not.toContain("<script>");
    });
  });

  describe("TemplatesService Sanitization", () => {
    const templatesService = new TemplatesService(mockPrisma as unknown as PrismaClient);

    it("should sanitize defaultBooks in createTemplate", async () => {
      (mockPrisma.template.count as any).mockResolvedValue(0);
      (mockPrisma.user.findUnique as any).mockResolvedValue({ isPro: false });
      (mockPrisma.template.create as any).mockResolvedValue({});

      await templatesService.createTemplate({
        title: "Template",
        tiers: [],
        defaultBooks: [{
          title: "Book",
          description: maliciousHtml,
          thoughts: maliciousHtml
        }]
      }, "1");

      const createCall = (mockPrisma.template.create as any).mock.calls[0][0].data;
      expect(createCall.defaultBooks[0].description).not.toContain("<script>");
      expect(createCall.defaultBooks[0].description).not.toContain("onerror");
    });

    it("should sanitize defaultBooks in updateTemplate", async () => {
      (mockPrisma.template.findUnique as any).mockResolvedValue({ authorId: 1 });
      (mockPrisma.template.update as any).mockResolvedValue({});

      await templatesService.updateTemplate("tpl-1", {
        defaultBooks: [{
          title: "Book",
          description: maliciousHtml,
          thoughts: maliciousHtml
        }]
      }, "1");

      const updateCall = (mockPrisma.template.update as any).mock.calls[0][0].data;
      expect(updateCall.defaultBooks[0].description).not.toContain("<script>");
      expect(updateCall.defaultBooks[0].description).not.toContain("onerror");
    });
  });
});
