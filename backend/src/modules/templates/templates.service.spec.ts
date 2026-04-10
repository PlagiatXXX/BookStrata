import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Моки для Prisma — создаём объект сразу
const mockTemplate = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
};

const mockTemplateLike = {
  groupBy: vi.fn(),
};

const mockTierList = {
  create: vi.fn(),
};

const mockTier = {
  createMany: vi.fn(),
  findMany: vi.fn(),
};

const mockBook = {
  create: vi.fn(),
  createMany: vi.fn(),
};

const mockBookPlacement = {
  create: vi.fn(),
};

const mockUser = {
  findUnique: vi.fn(),
};

const mockPrisma = {
  template: mockTemplate,
  templateLike: mockTemplateLike,
  tierList: mockTierList,
  tier: mockTier,
  book: mockBook,
  bookPlacement: mockBookPlacement,
  user: mockUser,
  $transaction: vi.fn((arg) => {
    if (typeof arg === "function") {
      return arg(mockPrisma);
    }
    return Promise.all(arg);
  }),
};

// Мок PrismaClient
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

// Импортируем после vi.mock
import {
  TemplatesService,
  type CreateTemplateInput,
} from "./templates.service.js";
import type { PrismaClient } from "@prisma/client";

const mockPrismaClient = mockPrisma as unknown as PrismaClient;

describe("TemplatesService", () => {
  let service: TemplatesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TemplatesService(mockPrismaClient);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("validateCreateTemplate", () => {
    const validInput = {
      title: "My Template",
      description: "Test description",
      coverImageUrl: "https://example.com/cover.jpg",
      tiers: [
        { id: "1", name: "S", color: "#FF6B6B", order: 0 },
        { id: "2", name: "A", color: "#4ECDC4", order: 1 },
      ],
      defaultBooks: [],
      isPublic: true,
      isProOnly: false,
    };

    it("должен валидировать корректные данные", async () => {
      const result = await service.validateCreateTemplate(validInput);
      expect(result).toEqual(validInput);
    });

    it("должен отклонить пустой title", async () => {
      const invalidInput = { ...validInput, title: "" };
      await expect(
        service.validateCreateTemplate(invalidInput),
      ).rejects.toThrow();
    });

    it("должен отклонить title длиннее 255 символов", async () => {
      const invalidInput = { ...validInput, title: "a".repeat(256) };
      await expect(
        service.validateCreateTemplate(invalidInput),
      ).rejects.toThrow();
    });

    it("должен отклонить некорректный цвет", async () => {
      const invalidInput = {
        ...validInput,
        tiers: [{ id: "1", name: "S", color: "invalid", order: 0 }],
      };
      await expect(
        service.validateCreateTemplate(invalidInput),
      ).rejects.toThrow();
    });

    it("должен принять валидный hex цвет", async () => {
      const validColorInput = {
        ...validInput,
        tiers: [{ id: "1", name: "S", color: "#abc", order: 0 }],
      };
      await expect(
        service.validateCreateTemplate(validColorInput),
      ).resolves.toBeDefined();
    });
  });

  describe("validateUpdateTemplate", () => {
    const validUpdateInput = {
      title: "Updated Template",
      tiers: [{ id: "1", name: "S+", color: "#FF0000", order: 0 }],
    };

    it("должен валидировать корректные данные для обновления", async () => {
      const result = await service.validateUpdateTemplate(validUpdateInput);
      expect(result).toEqual(validUpdateInput);
    });

    it("должен принять частичные данные", async () => {
      const partialInput = { title: "Only Title" };
      const result = await service.validateUpdateTemplate(partialInput);
      expect(result.title).toBe("Only Title");
    });

    it("должен отклонить пустой title", async () => {
      const invalidInput = { title: "" };
      await expect(
        service.validateUpdateTemplate(invalidInput),
      ).rejects.toThrow();
    });
  });

  describe("createTemplate", () => {
    const mockInput = {
      title: "Test Template",
      description: "Description",
      coverImageUrl: "https://example.com/cover.jpg",
      tiers: [{ id: "1", name: "S", color: "#FF6B6B", order: 0 }],
      defaultBooks: [],
      isPublic: true,
      isProOnly: false,
    };

    const mockCreatedTemplate = {
      id: "uuid-123",
      ...mockInput,
      authorId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("должен создать шаблон с валидацией", async () => {
      mockTemplate.count.mockResolvedValue(0);
      mockUser.findUnique.mockResolvedValue({ isPro: false });
      mockTemplate.create.mockResolvedValue(mockCreatedTemplate);

      const result = await service.createTemplate(mockInput, "1");

      expect(mockTemplate.count).toHaveBeenCalledWith({
        where: { authorId: 1 },
      });
      expect(mockTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: "Test Template", authorId: 1 }),
      });
      expect(result).toEqual(mockCreatedTemplate);
    });

    it("должен проверить лимит шаблонов (5 для бесплатных)", async () => {
      mockTemplate.count.mockResolvedValue(5);
      mockUser.findUnique.mockResolvedValue({ isPro: false });
      await expect(service.createTemplate(mockInput, "1")).rejects.toThrow(
        "Превышен лимит шаблонов",
      );
    });

    it("должен создать шаблон без userId (анонимно)", async () => {
      mockTemplate.count.mockResolvedValue(0);
      mockUser.findUnique.mockResolvedValue({ isPro: false });
      mockTemplate.create.mockResolvedValue(mockCreatedTemplate);
      await service.createTemplate(mockInput, undefined);
      expect(mockTemplate.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ authorId: expect.anything() }),
      });
    });

    it("должен установить isPublic=false по умолчанию", async () => {
      mockTemplate.count.mockResolvedValue(0);
      mockUser.findUnique.mockResolvedValue({ isPro: false });
      mockTemplate.create.mockResolvedValue(mockCreatedTemplate);
      const inputWithoutPublic: CreateTemplateInput = {
        title: mockInput.title,
        description: mockInput.description,
        coverImageUrl: mockInput.coverImageUrl,
        tiers: mockInput.tiers,
        defaultBooks: mockInput.defaultBooks,
        isPublic: false,
        isProOnly: false,
      };
      await service.createTemplate(inputWithoutPublic, "1");
      expect(mockTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isPublic: false }),
      });
    });
  });

  describe("getTemplateById", () => {
    const mockTemplateData = {
      id: "uuid-123",
      title: "Public Template",
      isPublic: true,
      tiers: [{ id: "1", name: "S", color: "#FF6B6B", order: 0 }],
      _count: { likes: 5 },
    };

    it("должен вернуть публичный шаблон", async () => {
      mockTemplate.findFirst.mockResolvedValue(mockTemplateData);
      const result = await service.getTemplateById("uuid-123", "1");
      expect(mockTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: "uuid-123", OR: [{ isPublic: true }, { authorId: 1 }] },
        include: { _count: { select: { likes: true } } },
      });
      expect(result).toEqual({ ...mockTemplateData, likesCount: 5 });
    });

    it("должен вернуть шаблон пользователя если он приватный", async () => {
      const privateTemplate = {
        ...mockTemplateData,
        isPublic: false,
        authorId: 1,
      };
      mockTemplate.findFirst.mockResolvedValue(privateTemplate);
      const result = await service.getTemplateById("uuid-123", "1");
      expect(result).toEqual({ ...privateTemplate, likesCount: 5 });
    });

    it("должен вернуть null для чужого приватного шаблона", async () => {
      mockTemplate.findFirst.mockResolvedValue(null);
      const result = await service.getTemplateById("uuid-123", "999");
      expect(result).toBeNull();
    });

    it("должен обработать null tiers", async () => {
      const templateWithNullTiers = { ...mockTemplateData, tiers: null };
      mockTemplate.findFirst.mockResolvedValue(templateWithNullTiers);
      const result = await service.getTemplateById("uuid-123", "1");
      expect(result?.tiers).toEqual([]);
    });

    it("должен работать без userId", async () => {
      mockTemplate.findFirst.mockResolvedValue(mockTemplateData);
      await service.getTemplateById("uuid-123", undefined);
      expect(mockTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: "uuid-123", OR: [{ isPublic: true }] },
        include: { _count: { select: { likes: true } } },
      });
    });
  });

  describe("getUserTemplates", () => {
    const mockTemplates = [
      {
        id: "1",
        title: "Template 1",
        tiers: null,
        createdAt: new Date(),
        _count: { likes: 0 },
      },
      {
        id: "2",
        title: "Template 2",
        tiers: [{ id: "1", name: "S" }],
        createdAt: new Date(),
        _count: { likes: 10 },
      },
    ];

    it("должен вернуть шаблоны пользователя", async () => {
      mockTemplate.findMany.mockResolvedValue(mockTemplates);
      const result = await service.getUserTemplates("1");
      expect(mockTemplate.findMany).toHaveBeenCalledWith({
        where: { authorId: 1 },
        include: { _count: { select: { likes: true } } },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(2);
      expect(result?.[0].tiers).toEqual([]);
      expect(result?.[0].likesCount).toBe(0);
      expect(result?.[1].likesCount).toBe(10);
    });

    it("должен бросить ошибку при невалидном userId", async () => {
      await expect(service.getUserTemplates("invalid")).rejects.toThrow(
        "Invalid user ID",
      );
    });

    it("должен бросить ошибку при пустом userId", async () => {
      await expect(service.getUserTemplates("")).rejects.toThrow(
        "Invalid user ID",
      );
    });
  });

  describe("getAllTemplates", () => {
    const mockTemplates = [
      {
        id: "1",
        title: "Public Template 1",
        isPublic: true,
        _count: { likes: 5 },
      },
      {
        id: "2",
        title: "Public Template 2",
        isPublic: true,
        _count: { likes: 3 },
      },
    ];

    it("должен вернуть все публичные шаблоны", async () => {
      mockTemplate.findMany.mockResolvedValue(mockTemplates);
      const result = await service.getAllTemplates("1");
      expect(mockTemplate.findMany).toHaveBeenCalledWith({
        where: { OR: [{ isPublic: true }, { authorId: 1 }] },
        include: { _count: { select: { likes: true } } },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(2);
      expect(result?.[0].likesCount).toBe(5);
      expect(result?.[1].likesCount).toBe(3);
    });

    it("должен вернуть публичные + шаблоны пользователя", async () => {
      const allTemplates = [
        ...mockTemplates,
        {
          id: "3",
          title: "My Private Template",
          isPublic: false,
          authorId: 1,
          _count: { likes: 0 },
        },
      ];
      mockTemplate.findMany.mockResolvedValue(allTemplates);
      const result = await service.getAllTemplates("1");
      expect(result).toHaveLength(3);
      expect(result?.[2].likesCount).toBe(0);
    });

    it("должен работать без userId", async () => {
      mockTemplate.findMany.mockResolvedValue(mockTemplates);
      await service.getAllTemplates(undefined);
      expect(mockTemplate.findMany).toHaveBeenCalledWith({
        where: { OR: [{ isPublic: true }] },
        include: { _count: { select: { likes: true } } },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("updateTemplate", () => {
    const mockTemplateId = "uuid-123";
    const mockUpdateInput = { title: "Updated Title" };
    const mockUpdatedTemplate = {
      id: mockTemplateId,
      title: "Updated Title",
      authorId: 1,
    };

    it("должен обновить шаблон если пользователь владелец", async () => {
      mockTemplate.findUnique.mockResolvedValue({ authorId: 1 });
      mockTemplate.update.mockResolvedValue(mockUpdatedTemplate);
      const result = await service.updateTemplate(
        mockTemplateId,
        mockUpdateInput,
        "1",
      );
      expect(mockTemplate.update).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
        data: mockUpdateInput,
      });
      expect(result).toEqual(mockUpdatedTemplate);
    });

    it("должен бросить ошибку если пользователь не владелец", async () => {
      mockTemplate.findUnique.mockResolvedValue({ authorId: 999 });
      await expect(
        service.updateTemplate(mockTemplateId, mockUpdateInput, "1"),
      ).rejects.toThrow("You can only update your own templates");
    });

    it("должен бросить ошибку если шаблон не найден", async () => {
      mockTemplate.findUnique.mockResolvedValue(null);
      await expect(
        service.updateTemplate(mockTemplateId, mockUpdateInput, "1"),
      ).rejects.toThrow("Template not found");
    });
  });

  describe("deleteTemplate", () => {
    const mockTemplateId = "uuid-123";

    it("должен удалить шаблон если пользователь владелец", async () => {
      mockTemplate.findUnique.mockResolvedValue({ authorId: 1 });
      mockTemplate.delete.mockResolvedValue({});
      await service.deleteTemplate(mockTemplateId, "1");
      expect(mockTemplate.delete).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
      });
    });

    it("должен бросить ошибку если пользователь не владелец", async () => {
      mockTemplate.findUnique.mockResolvedValue({ authorId: 999 });
      await expect(service.deleteTemplate(mockTemplateId, "1")).rejects.toThrow(
        "You can only delete your own templates",
      );
    });

    it("должен бросить ошибку если шаблон не найден", async () => {
      mockTemplate.findUnique.mockResolvedValue(null);
      await expect(service.deleteTemplate(mockTemplateId, "1")).rejects.toThrow(
        "Template not found",
      );
    });
  });

  describe("useTemplate", () => {
    const mockTemplateId = "uuid-123";
    const mockUserId = "1";
    const mockNewListTitle = "My New Tier List";

    const mockTemplateData = {
      id: mockTemplateId,
      title: "Template",
      isPublic: true,
      authorId: 1,
      tiers: [
        { id: "1", name: "S", color: "#FF6B6B", order: 0 },
        { id: "2", name: "A", color: "#4ECDC4", order: 1 },
      ],
      defaultBooks: [
        {
          title: "Default Book 1",
          author: "Author 1",
          coverImageUrl: "cover1.jpg",
        },
      ],
    };

    const mockCreatedTierList = { id: 1, title: mockNewListTitle, userId: 1 };
    const mockCreatedBook = {
      id: 1,
      title: "Default Book 1",
      author: "Author 1",
    };
    const mockCreatedTiers = [
      { id: 1, title: "S", color: "#FF6B6B", rank: 0 },
      { id: 2, title: "A", color: "#4ECDC4", rank: 1 },
    ];

    it("должен создать тир-лист из шаблона", async () => {
      mockTemplate.findUnique.mockResolvedValue(mockTemplateData);
      mockUser.findUnique.mockResolvedValue({ isPro: true });
      mockTierList.create.mockResolvedValue({
        ...mockCreatedTierList,
        tiers: mockCreatedTiers,
      });
      mockBook.create.mockResolvedValue(mockCreatedBook);
      mockBookPlacement.create.mockResolvedValue({});
      const result = await service.useTemplate(
        mockTemplateId,
        mockUserId,
        mockNewListTitle,
      );
      expect(mockTierList.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: mockNewListTitle, userId: 1 }),
        include: { tiers: { orderBy: { rank: "asc" } } },
      });
      expect(result).toEqual({
        ...mockCreatedTierList,
        tiers: mockCreatedTiers,
      });
    });

    it("должен создать тиры из шаблона", async () => {
      mockTemplate.findUnique.mockResolvedValue(mockTemplateData);
      mockUser.findUnique.mockResolvedValue({ isPro: true });
      mockTierList.create.mockResolvedValue({
        ...mockCreatedTierList,
        tiers: mockCreatedTiers,
      });
      mockBook.create.mockResolvedValue(mockCreatedBook);
      mockBookPlacement.create.mockResolvedValue({});
      await service.useTemplate(mockTemplateId, mockUserId, mockNewListTitle);
      expect(mockTierList.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: mockNewListTitle,
          userId: 1,
          tiers: {
            create: expect.arrayContaining([
              expect.objectContaining({
                title: "S",
                color: "#FF6B6B",
                rank: 0,
              }),
              expect.objectContaining({
                title: "A",
                color: "#4ECDC4",
                rank: 1,
              }),
            ]),
          },
        }),
        include: { tiers: { orderBy: { rank: "asc" } } },
      });
    });

    it("должен создать книги из шаблона", async () => {
      mockTemplate.findUnique.mockResolvedValue(mockTemplateData);
      mockUser.findUnique.mockResolvedValue({ isPro: true });
      mockTierList.create.mockResolvedValue({
        ...mockCreatedTierList,
        tiers: mockCreatedTiers,
      });
      mockBook.create.mockResolvedValue(mockCreatedBook);
      mockBookPlacement.create.mockResolvedValue({});
      await service.useTemplate(mockTemplateId, mockUserId, mockNewListTitle);
      expect(mockBook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Default Book 1",
          author: "Author 1",
        }),
      });
    });

    it("должен бросить ошибку если шаблон не найден", async () => {
      mockTemplate.findUnique.mockResolvedValue(null);
      await expect(
        service.useTemplate(mockTemplateId, mockUserId, mockNewListTitle),
      ).rejects.toThrow("Template not found");
    });
  });
});
