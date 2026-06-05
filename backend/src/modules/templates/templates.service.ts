/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { createLogger } from "../../lib/logger.js";
import { sanitize } from "../../lib/sanitizer.js";

// Логгер для сервиса шаблонов
const logger = createLogger("Templates", { color: "magenta" });

// Zod схемы для валидации
const createTemplateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  type: z.enum(["starter", "curated", "community"]).optional(),
  tiers: z.array(
    z.object({
      id: z.union([z.string(), z.number()]), // Принимаем и строки, и числа
      name: z.string(),
      color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/), // hex цвет
      order: z.number().int(),
    }),
  ),
  defaultBooks: z
    .array(
      z.object({
        title: z.string(),
        author: z.string().optional(),
        coverImageUrl: z.string().optional(),
        cover_image_url: z.string().optional(), // для совместимости
        description: z.string().optional(),
        thoughts: z.string().optional(),
        defaultTierId: z.string().optional(), // новый формат
        tierId: z.string().optional(), // старый формат
        rank: z.number().int().optional(),
        googleBooksId: z.string().optional(),
      }),
    )
    .optional(),
  isPublic: z.boolean().optional().default(false),
  isProOnly: z.boolean().optional().default(false),
});

const updateTemplateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  type: z.enum(["starter", "curated", "community"]).optional(),
  tiers: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]), // Принимаем и строки, и числа
        name: z.string(),
        color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/), // hex цвет
        order: z.number().int(),
      }),
    )
    .optional(),
  defaultBooks: z
    .array(
      z.object({
        title: z.string(),
        author: z.string().optional(),
        coverImageUrl: z.string().optional(),
        cover_image_url: z.string().optional(), // для совместимости
        description: z.string().optional(),
        thoughts: z.string().optional(),
        defaultTierId: z.string().optional(), // новый формат
        tierId: z.string().optional(), // старый формат
        rank: z.number().int().optional(),
        googleBooksId: z.string().optional(),
      }),
    )
    .optional(),
  isPublic: z.boolean().optional(),
  isProOnly: z.boolean().optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export class TemplatesService {
  constructor(private prisma: PrismaClient) {}

  async validateCreateTemplate(input: unknown) {
    return createTemplateSchema.parse(input);
  }

  async validateUpdateTemplate(input: unknown) {
    return updateTemplateSchema.parse(input);
  }

  async createTemplate(input: CreateTemplateInput, userId?: string) {
    const validatedInput = await this.validateCreateTemplate(input);

    logger.debug("createTemplate вызван", {
      title: input.title,
      userId,
    });

    const templateData: any = {
      title: sanitize(validatedInput.title),
      description: validatedInput.description
        ? sanitize(validatedInput.description)
        : undefined,
      coverImageUrl: validatedInput.coverImageUrl,
      tiers: validatedInput.tiers as any, // Приведение к типу any для JSON поля
      defaultBooks: validatedInput.defaultBooks
        ? (validatedInput.defaultBooks.map((book) => ({
            ...book,
            title: sanitize(book.title),
            author: book.author ? sanitize(book.author) : book.author,
            description: book.description
              ? sanitize(book.description)
              : book.description,
            thoughts: book.thoughts ? sanitize(book.thoughts) : book.thoughts,
          })) as any)
        : undefined,
      isPublic: validatedInput.isPublic,
    };

    // Добавляем authorId только если userId предоставлен
    if (userId) {
      templateData.authorId = parseInt(userId);
    }

    logger.debug("Создание шаблона в БД", { title: templateData.title });

    return this.prisma.template.create({
      data: templateData,
    });
  }

  async getTemplateById(id: string, userId?: string) {
    const conditions: any[] = [{ isPublic: true }];

    // Добавляем условие по автору, только если userId предоставлен и может быть преобразован в число
    if (userId && !isNaN(parseInt(userId))) {
      conditions.push({ authorId: parseInt(userId) });
    }

    // Если шаблон публичный или принадлежит пользователю
    const template = await this.prisma.template.findFirst({
      where: {
        id,
        OR: conditions,
      },
      include: {
        _count: {
          select: { likes: true },
        },
      },
    });

    if (!template) return null;

    // Проверяем, что JSON-поля корректно десериализованы
    if (template.tiers === null) {
      (template as any).tiers = [];
    }

    return {
      ...template,
      likesCount: (template as any)._count.likes,
    };
  }

  async getUserTemplates(userId: string) {
    // Проверяем, что userId может быть преобразован в число
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error("Invalid user ID provided");
    }

    const templates = await this.prisma.template.findMany({
      where: { authorId: parseInt(userId) },
      include: {
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Проверяем, что JSON-поля корректно десериализованы
    return templates.map((template) => {
      if (template.tiers === null) {
        (template as any).tiers = [];
      }
      return {
        ...template,
        likesCount: (template as any)._count.likes,
      };
    });
  }

  async getAllTemplates(userId?: string) {
    const conditions: any[] = [{ isPublic: true }];

    // Добавляем условие по автору, только если userId предоставлен и может быть преобразован в число
    if (userId && !isNaN(parseInt(userId))) {
      conditions.push({ authorId: parseInt(userId) });
    }

    const templates = await this.prisma.template.findMany({
      where: {
        OR: conditions,
      },
      include: {
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return templates.map((template) => ({
      ...template,
      likesCount: (template as any)._count.likes,
    }));
  }

  async updateTemplate(id: string, input: UpdateTemplateInput, userId: string) {
    // Проверяем, что userId может быть преобразован в число
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error("Invalid user ID provided");
    }

    const validatedInput = await this.validateUpdateTemplate(input);

    // Проверяем, что пользователь является владельцем шаблона
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    if (template.authorId !== parseInt(userId)) {
      throw new Error("Unauthorized: You can only update your own templates");
    }

    // Создаем объект с данными для обновления, включая поля только если они были переданы
    const updateData: any = {
      title: validatedInput.title
        ? sanitize(validatedInput.title)
        : template.title,
      description: validatedInput.description
        ? sanitize(validatedInput.description)
        : template.description,
      tiers: (validatedInput.tiers ?? template.tiers) as any,
      isPublic: validatedInput.isPublic ?? template.isPublic,
    };

    // defaultBooks включаем только если он явно передан и не null
    if (
      validatedInput.defaultBooks !== undefined &&
      validatedInput.defaultBooks !== null
    ) {
      updateData.defaultBooks = validatedInput.defaultBooks.map((book) => ({
        ...book,
        title: sanitize(book.title),
        author: book.author ? sanitize(book.author) : book.author,
        description: book.description
          ? sanitize(book.description)
          : book.description,
        thoughts: book.thoughts ? sanitize(book.thoughts) : book.thoughts,
      })) as any;
    } else if (template.defaultBooks !== null) {
      updateData.defaultBooks = template.defaultBooks;
    }

    return this.prisma.template.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteTemplate(id: string, userId: string) {
    // Проверяем, что userId может быть преобразован в число
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error("Invalid user ID provided");
    }

    // Проверяем, что пользователь является владельцем шаблона
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    if (template.authorId !== parseInt(userId)) {
      throw new Error("Unauthorized: You can only delete your own templates");
    }

    return this.prisma.template.delete({
      where: { id },
    });
  }

  async useTemplate(templateId: string, userId: string, newListTitle?: string) {
    const uId = parseInt(userId);
    // Проверяем, что userId может быть преобразован в число
    if (!userId || isNaN(uId)) {
      throw new Error("Invalid user ID provided");
    }

    // Получаем шаблон
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    if (!template.isPublic && template.authorId !== uId) {
      throw new Error(
        "Unauthorized: Template is not public and does not belong to you",
      );
    }

    // Парсим тиры шаблона
    const templateTiers = Array.isArray(template.tiers)
      ? (template.tiers as any[])
      : [];

    // Оптимизация Bolt: использование транзакции и вложенного include для исключения findMany
    return this.prisma.$transaction(async (tx) => {
      // Создаем новый тир-лист на основе шаблона
      const newList = await tx.tierList.create({
        data: {
          title: newListTitle || `${template.title}`,
          userId: uId,
          isTemplate: false, // Это не шаблон, а обычный тир-лист
          tiers: {
            create: templateTiers.map((tier: any, index: number) => ({
              title:
                typeof tier.name === "string" ? tier.name : String(tier.name),
              color:
                typeof tier.color === "string"
                  ? tier.color
                  : String(tier.color),
              rank: typeof tier.order === "number" ? tier.order : index,
            })),
          },
        },

        include: {
          tiers: { orderBy: { rank: "asc" } },
        },
      });
      const createdTiers = newList.tiers;

      // Создаём мапу oldTierId → newTierId
      const tierMap = new Map<string, number>();
      templateTiers.forEach((tier: any, index: number) => {
        if (createdTiers[index]) {
          tierMap.set(String(tier.id), createdTiers[index].id);
        }
      });

      // Если в шаблоне есть книги по умолчанию, добавляем их (Оптимизировано Bolt: O(1) roundtrip)
      if (
        template.defaultBooks &&
        Array.isArray(template.defaultBooks) &&
        template.defaultBooks.length > 0
      ) {
        // Используем вложенные create в update для атомарного создания всех книг за один запрос
        await tx.tierList.update({
          where: { id: newList.id },
          data: {
            placements: {
              create: template.defaultBooks
                .map((bookData: any) => {
                  if (
                    bookData &&
                    typeof bookData === "object" &&
                    "title" in bookData
                  ) {
                    const oldTierId = bookData.defaultTierId || bookData.tierId;
                    const newTierId = tierMap.get(String(oldTierId));

                    return {
                      rank:
                        typeof bookData.rank === "number" ? bookData.rank : 0,
                      tierId: newTierId || null,
                      book: {
                        create: {
                          title: String(bookData.title || "Untitled"),
                          author: bookData.author
                            ? String(bookData.author)
                            : null,
                          coverImageUrl: String(
                            bookData.coverImageUrl ||
                              bookData.cover_image_url ||
                              "",
                          ),
                          description: bookData.description
                            ? String(bookData.description)
                            : null,
                          thoughts: bookData.thoughts
                            ? String(bookData.thoughts)
                            : null,
                        },
                      },
                    };
                  }
                  return null;
                })
                .filter(
                  (item): item is NonNullable<typeof item> => item !== null,
                ),
            },
          },
        });
      }
      return newList;
    });
  }
}
