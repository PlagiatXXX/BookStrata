import { prisma } from "../../lib/prisma.js";
import { z } from "zod";
import { createLogger } from "../../lib/logger.js";

// Логгер для сервиса новостей
const logger = createLogger("News", { color: "cyan" });

// Zod схемы для валидации
const createNewsSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(10).max(50000),
  excerpt: z.string().max(300),
  imageUrl: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().optional().default(false),
});

const updateNewsSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(10).max(50000).optional(),
  excerpt: z.string().max(300).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

export type CreateNewsInput = z.infer<typeof createNewsSchema>;
export type UpdateNewsInput = z.infer<typeof updateNewsSchema>;

export type NewsArticle = {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string | null;
  tags: string[];
  authorId: number | null;
  authorName?: string | null;
  publishedAt: Date;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class NewsService {
  async validateCreateNews(input: unknown) {
    return createNewsSchema.parse(input);
  }

  async validateUpdateNews(input: unknown) {
    return updateNewsSchema.parse(input);
  }

  /**
   * Получить все новости (с пагинацией)
   */
  async getAllNews(options?: {
    page?: number;
    limit?: number;
    publishedOnly?: boolean;
  }): Promise<{ articles: NewsArticle[]; total: number }> {
    // publishedOnly defaults to true for security - unprivileged calls shouldn't see draft content
    const { page = 1, limit = 10, publishedOnly = true } = options || {};
    const skip = (page - 1) * limit;

    const where = publishedOnly ? { isPublished: true } : {};

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: "desc" },
        include: {
          author: {
            select: {
              username: true,
            },
          },
        },
      }),
      prisma.newsArticle.count({ where }),
    ]);

    return {
      articles: articles.map((article) => ({
        ...article,
        authorName: article.author?.username || null,
      })),
      total,
    };
  }

  /**
   * Получить опубликованные новости для главной страницы
   */
  async getPublishedNews(limit: number = 6): Promise<NewsArticle[]> {
    const articles = await prisma.newsArticle.findMany({
      where: { isPublished: true },
      take: limit,
      orderBy: { publishedAt: "desc" },
      include: {
        author: {
          select: {
            username: true,
          },
        },
      },
    });

    return articles.map((article) => ({
      ...article,
      authorName: article.author?.username || null,
    }));
  }

  /**
   * Получить новость по ID
   */
  async getNewsById(
    id: number,
    options?: { publishedOnly?: boolean },
  ): Promise<NewsArticle | null> {
    const { publishedOnly = true } = options || {};
    const where = publishedOnly ? { id, isPublished: true } : { id };

    const article = await prisma.newsArticle.findFirst({
      where,
      include: {
        author: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!article) return null;

    return {
      ...article,
      authorName: article.author?.username || null,
    };
  }

  /**
   * Создать новость
   */
  async createNews(
    input: CreateNewsInput,
    authorId?: number,
  ): Promise<NewsArticle> {
    const validated = await this.validateCreateNews(input);

    logger.info("Создание новости", {
      title: validated.title,
      authorId,
    });

    const article = await prisma.newsArticle.create({
      data: {
        ...validated,
        authorId: authorId || null,
        imageUrl: validated.imageUrl || null,
      },
      include: {
        author: {
          select: {
            username: true,
          },
        },
      },
    });

    logger.info("Новость создана", { id: article.id });

    return {
      ...article,
      authorName: article.author?.username || null,
    };
  }

  /**
   * Обновить новость
   */
  async updateNews(
    id: number,
    input: UpdateNewsInput,
  ): Promise<NewsArticle | null> {
    const validated = await this.validateUpdateNews(input);

    logger.info("Обновление новости", { id });

    const data: Record<string, unknown> = {};

    if (validated.title !== undefined) data.title = validated.title;
    if (validated.content !== undefined) data.content = validated.content;
    if (validated.excerpt !== undefined) data.excerpt = validated.excerpt;
    if (validated.tags !== undefined) data.tags = validated.tags;
    if (validated.isPublished !== undefined)
      data.isPublished = validated.isPublished;
    if (validated.imageUrl !== undefined) {
      data.imageUrl = validated.imageUrl === "" ? null : validated.imageUrl;
    }

    const article = await prisma.newsArticle.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            username: true,
          },
        },
      },
    });

    logger.info("Новость обновлена", { id });

    return {
      ...article,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authorName: (article as any).author?.username || null,
    };
  }

  /**
   * Удалить новость
   */
  async deleteNews(id: number): Promise<void> {
    logger.info("Удаление новости", { id });

    await prisma.newsArticle.delete({
      where: { id },
    });

    logger.info("Новость удалена", { id });
  }

  /**
   * Опубликовать/снять с публикации новость
   */
  async togglePublish(
    id: number,
    isPublished: boolean,
  ): Promise<NewsArticle | null> {
    logger.info("Публикация новости", { id, isPublished });

    const article = await prisma.newsArticle.update({
      where: { id },
      data: { isPublished },
      include: {
        author: {
          select: {
            username: true,
          },
        },
      },
    });

    return {
      ...article,
      authorName: article.author?.username || null,
    };
  }
}
