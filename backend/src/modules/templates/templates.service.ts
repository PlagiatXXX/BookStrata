/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Zod схемы для валидации
const createTemplateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  tiers: z.array(
    z.object({
      id: z.union([z.string(), z.number()]), // Принимаем и строки, и числа
      name: z.string(),
      color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/), // hex цвет
      order: z.number().int()
    })
  ),
  defaultBooks: z.array(z.any()).optional(), // Пока любой формат для книг по умолчанию
  isPublic: z.boolean().optional().default(false)
});

const updateTemplateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  tiers: z.array(
    z.object({
      id: z.union([z.string(), z.number()]), // Принимаем и строки, и числа
      name: z.string(),
      color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/), // hex цвет
      order: z.number().int()
    })
  ).optional(),
  defaultBooks: z.array(z.any()).optional(),
  isPublic: z.boolean().optional()
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
    
    console.log("[TemplatesService] createTemplate вызван с:", {
      input,
      userId,
      validatedInput
    });

    const templateData: any = {
      title: validatedInput.title,
      description: validatedInput.description,
      tiers: validatedInput.tiers as any, // Приведение к типу any для JSON поля
      defaultBooks: validatedInput.defaultBooks as any, // Приведение к типу any для JSON поля
      isPublic: validatedInput.isPublic,
    };

    // Добавляем authorId только если userId предоставлен
    if (userId) {
      templateData.authorId = parseInt(userId);
    }

    console.log("[TemplatesService] Создание шаблона в БД:", templateData);

    return this.prisma.template.create({
      data: templateData
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
        OR: conditions
      }
    });
    
    // Проверяем, что JSON-поля корректно десериализованы
    if (template && template.tiers === null) {
      (template as any).tiers = [];
    }
    
    return template;
  }

  async getUserTemplates(userId: string) {
    // Проверяем, что userId может быть преобразован в число
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error('Invalid user ID provided');
    }
    
    const templates = await this.prisma.template.findMany({
      where: { authorId: parseInt(userId) },
      orderBy: { createdAt: 'desc' }
    });
    
    // Проверяем, что JSON-поля корректно десериализованы
    return templates.map(template => {
      if (template.tiers === null) {
        (template as any).tiers = [];
      }
      return template;
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
        OR: conditions
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Получаем количество лайков для каждого шаблона отдельным запросом
    const templateIds = templates.map(t => t.id);
    const likesCounts = await this.prisma.templateLike.groupBy({
      by: ['templateId'],
      _count: { templateId: true },
      where: { templateId: { in: templateIds } }
    });
    
    // Создаём Map для быстрого поиска количества лайков
    const likesMap = new Map(likesCounts.map(l => [l.templateId, l._count.templateId]));
    
    return templates.map(template => ({
      ...template,
      likesCount: likesMap.get(template.id) || 0,
    }));
  }

  async updateTemplate(id: string, input: UpdateTemplateInput, userId: string) {
    // Проверяем, что userId может быть преобразован в число
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error('Invalid user ID provided');
    }
    
    const validatedInput = await this.validateUpdateTemplate(input);

    // Проверяем, что пользователь является владельцем шаблона
    const template = await this.prisma.template.findUnique({
      where: { id }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.authorId !== parseInt(userId)) {
      throw new Error('Unauthorized: You can only update your own templates');
    }

    // Создаем объект с данными для обновления, включая поля только если они были переданы
    const updateData: any = {
      title: validatedInput.title ?? template.title,
      description: validatedInput.description ?? template.description,
      tiers: (validatedInput.tiers ?? template.tiers) as any,
      isPublic: validatedInput.isPublic ?? template.isPublic
    };
    
    // defaultBooks включаем только если он явно передан и не null
    if (validatedInput.defaultBooks !== undefined && validatedInput.defaultBooks !== null) {
      updateData.defaultBooks = validatedInput.defaultBooks as any;
    } else if (template.defaultBooks !== null) {
      updateData.defaultBooks = template.defaultBooks;
    }
    
    return this.prisma.template.update({
      where: { id },
      data: updateData
    });
  }

  async deleteTemplate(id: string, userId: string) {
    // Проверяем, что userId может быть преобразован в число
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error('Invalid user ID provided');
    }
    
    // Проверяем, что пользователь является владельцем шаблона
    const template = await this.prisma.template.findUnique({
      where: { id }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.authorId !== parseInt(userId)) {
      throw new Error('Unauthorized: You can only delete your own templates');
    }

    return this.prisma.template.delete({
      where: { id }
    });
  }

  async useTemplate(templateId: string, userId: string, newListTitle?: string) {
    // Проверяем, что userId может быть преобразован в число
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error('Invalid user ID provided');
    }
    
    // Получаем шаблон
    const template = await this.prisma.template.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Проверяем права доступа к шаблону
    if (!template.isPublic && template.authorId !== parseInt(userId)) {
      throw new Error('Unauthorized: Template is not public and does not belong to you');
    }

    // Создаем новый тир-лист на основе шаблона
    const templateTiers = Array.isArray(template.tiers) ? template.tiers as any[] : [];
    const newList = await this.prisma.tierList.create({
      data: {
        title: newListTitle || `${template.title} (from template)`,
        userId: parseInt(userId),
        isTemplate: false, // Это не шаблон, а обычный тир-лист
        tiers: {
          create: templateTiers.map((tier: any, index: number) => ({
            title: typeof tier.name === 'string' ? tier.name : String(tier.name),
            color: typeof tier.color === 'string' ? tier.color : String(tier.color),
            rank: typeof tier.order === 'number' ? tier.order : index
          }))
        }
      }
    });

    // Если в шаблоне есть книги по умолчанию, добавляем их
    if (template.defaultBooks && Array.isArray(template.defaultBooks) && template.defaultBooks.length > 0) {
      for (const bookData of template.defaultBooks) {
        // Проверяем, что bookData является объектом и имеет необходимые свойства
        if (bookData && typeof bookData === 'object' && 'title' in bookData) {
          // Создаем книгу
          const book = await this.prisma.book.create({
            data: {
              title: typeof bookData.title === 'string' ? bookData.title : (bookData.title ? String(bookData.title) : 'Untitled'),
              author: typeof bookData.author === 'string' ? bookData.author : (bookData.author ? String(bookData.author) : null),
              coverImageUrl: typeof bookData.cover_image_url === 'string' ? bookData.cover_image_url : (bookData.cover_image_url ? String(bookData.cover_image_url) : ''),
              description: typeof bookData.description === 'string' ? bookData.description : (bookData.description ? String(bookData.description) : null)
            }
          });

          // Создаем размещение книги в соответствующем тире
          if ('tierId' in bookData && typeof bookData.tierId !== 'undefined' && bookData.tierId !== null) {
            const tier = (template.tiers as any[]).find((t: any) => t.id === bookData.tierId);
            if (tier) {
              // Получаем созданные тиры для этого списка, чтобы найти правильный ID тира
              const createdTiers = await this.prisma.tier.findMany({
                where: { tierListId: newList.id },
                orderBy: { rank: 'asc' }
              });
              
              // Находим тир по порядковому номеру, как он был создан
              const tierIndex = (template.tiers as any[]).findIndex((t: any) => t.id === bookData.tierId);
              if (tierIndex >= 0 && tierIndex < createdTiers.length && createdTiers[tierIndex]) {
                await this.prisma.bookPlacement.create({
                  data: {
                    tierListId: newList.id,
                    bookId: book.id,
                    tierId: createdTiers[tierIndex].id,
                    rank: typeof bookData.rank === 'number' ? bookData.rank : 0
                  }
                });
              }
            }
          }
        }
      }
    }

    return newList;
  }
}