/* eslint-disable @typescript-eslint/no-explicit-any */
import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { TemplatesService } from './templates.service.js';
import { templateLikesRoutes } from './likes/likes.route.js';

// Тип для Headers с authorization
interface AuthHeaders {
  authorization?: string;
}

export async function templatesController(fastify: FastifyInstance, prisma: PrismaClient) {
  const service = new TemplatesService(prisma);

  // Роуты для лайков
  fastify.register(templateLikesRoutes, { prefix: '/templates/:id' });

  // Получить все шаблоны пользователя
  fastify.get('/templates', async (req: FastifyRequest<{ Headers: AuthHeaders }>, res: FastifyReply) => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).send({ error: 'Authorization required' });
      }

      const templates = await service.getUserTemplates(String(userId));
      return res.send(templates);
    } catch (error) {
      req.log.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  // Получить все доступные шаблоны (публичные + свои)
  fastify.get('/templates/all', async (req: FastifyRequest<{ Headers: AuthHeaders }>, res: FastifyReply) => {
    try {
      const userId = (req as any).user?.userId;
      
      const templates = await service.getAllTemplates(userId ? String(userId) : undefined);
      return res.send(templates);
    } catch (error) {
      req.log.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  // Создать новый шаблон
  fastify.post('/templates', async (
    req: FastifyRequest<{ 
      Headers: AuthHeaders;
      Body: { title: string; description?: string; tiers: { id: string; name: string; color: string; order: number }[]; defaultBooks?: any[]; isPublic?: boolean } 
    }>, 
    res: FastifyReply
  ) => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).send({ error: 'Authorization required' });
      }

      // Установим значение по умолчанию для isPublic, если оно не предоставлено
      const bodyWithDefaults = {
        ...req.body,
        isPublic: req.body.isPublic ?? false
      };
      
      const template = await service.createTemplate(bodyWithDefaults, String(userId));
      return res.send(template);
    } catch (error: any) {
      req.log.error(error);
      
      if (error instanceof Error && error.message.includes('Validation')) {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  // Получить шаблон по ID
  fastify.get('/templates/:id', async (
    req: FastifyRequest<{ 
      Params: { id: string };
      Headers: AuthHeaders;
    }>, 
    res: FastifyReply
  ) => {
    try {
      const userId = (req as any).user?.userId;
      
      const { id } = req.params;

      const template = await service.getTemplateById(id, userId ? String(userId) : undefined);
      
      if (!template) {
        return res.status(404).send({ error: 'Template not found' });
      }

      return res.send(template);
    } catch (error) {
      req.log.error(error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  // Обновить шаблон
  fastify.put('/templates/:id', async (
    req: FastifyRequest<{ 
      Params: { id: string };
      Headers: AuthHeaders;
      Body: { title?: string; description?: string; tiers?: { id: string; name: string; color: string; order: number }[]; defaultBooks?: any[]; isPublic?: boolean };
    }>, 
    res: FastifyReply
  ) => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).send({ error: 'Authorization required' });
      }
      
      const { id } = req.params;

      const template = await service.updateTemplate(id, req.body, String(userId));
      return res.send(template);
    } catch (error: any) {
      req.log.error(error);
      
      if (error.message === 'Unauthorized: You can only update your own templates') {
        return res.status(403).send({ error: error.message });
      }
      
      if (error instanceof Error && error.message.includes('Validation')) {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  // Удалить шаблон
  fastify.delete('/templates/:id', async (
    req: FastifyRequest<{ 
      Params: { id: string };
      Headers: AuthHeaders;
    }>, 
    res: FastifyReply
  ) => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).send({ error: 'Authorization required' });
      }
      
      const { id } = req.params;

      await service.deleteTemplate(id, String(userId));
      return res.status(204).send();
    } catch (error: any) {
      req.log.error(error);
      
      if (error.message === 'Unauthorized: You can only delete your own templates') {
        return res.status(403).send({ error: error.message });
      }
      
      if (error.message === 'Template not found') {
        return res.status(404).send({ error: error.message });
      }
      
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  // Использовать шаблон для создания нового тир-листа
  fastify.post('/templates/:id/use', async (
    req: FastifyRequest<{ 
      Params: { id: string };
      Headers: AuthHeaders;
      Body: { newListTitle?: string };
    }>, 
    res: FastifyReply
  ) => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).send({ error: 'Authorization required' });
      }
      
      const { id } = req.params;

      const newList = await service.useTemplate(id, String(userId), req.body.newListTitle);
      return res.send(newList);
    } catch (error: any) {
      req.log.error(error);
      
      if (error.message === 'Unauthorized: Template is not public and does not belong to you') {
        return res.status(403).send({ error: error.message });
      }
      
      if (error.message === 'Template not found') {
        return res.status(404).send({ error: error.message });
      }
      
      return res.status(500).send({ error: 'Internal server error' });
    }
  });
}