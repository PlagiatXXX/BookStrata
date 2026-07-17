/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '../auth/auth.middleware.js'

import { ErrorCodes, createApiError } from '../../lib/api-response.js'
import { ChatRequestSchema } from './ai-librarian.schema.js'
import { getUserTasteProfile, buildSystemPrompt, streamAiResponse, checkAiStatus } from './ai-librarian.service.js'
import type { AiChunk, PageContext } from './ai-librarian.service.js'
import { getCollectionBySlug, getCollections } from '../collections/collection.service.js'
import { AiRouterError } from './router.js'
import { createLogger } from '../../lib/logger.js'

const logger = createLogger('AiLibrarianRoute', { color: 'cyan' })

import { config } from "../../config/env.js";

const CLIENT_URL = config.CLIENT_URL

export async function aiLibrarianRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/librarian/status',
    async (_request, reply) => {
      const status = await checkAiStatus()
      return reply.code(200).send({ data: status })
    },
  )


  fastify.post(
    '/librarian/chat',
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: 'object',
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                  content: { type: 'string' },
                },
              },
            },
            context: {
              type: 'object',
              required: ['pageType'],
              properties: {
                pageType: { type: 'string', enum: ['rankings', 'collection', 'book-description'] },
                slug: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = (request as any).user
      const body = request.body as { messages: Array<{ role: string; content: string }> }

      const parsed = ChatRequestSchema.safeParse(body)
      if (!parsed.success) {
        return reply.code(400).send(
          createApiError(ErrorCodes.VALIDATION_ERROR, 'Неверный формат запроса', parsed.error.issues),
        )
      }

      let tasteProfile
      try {
        tasteProfile = await getUserTasteProfile(user.userId, fastify.prisma)
      } catch (err) {
        logger.error(err instanceof Error ? err : new Error(String(err)), {
          context: 'getUserTasteProfile',
        })
        return reply.code(500).send(
          createApiError(ErrorCodes.INTERNAL_ERROR, 'Ошибка при загрузке профиля пользователя'),
        )
      }

      // Загружаем контекст страницы, если передан
      let pageContext: PageContext | undefined
      const rawContext = parsed.data.context
      if (rawContext) {
        if (rawContext.pageType === 'collection' && rawContext.slug) {
          try {
            const collection = await getCollectionBySlug(rawContext.slug)
            if (collection) {
              const tiers = collection.tiers as Record<string, { title: string; bookIds: string[] }> | undefined
              const books = collection.books as Record<string, { title: string; author?: string | null; genre?: string | null; description?: string | null }> | undefined
              pageContext = {
                pageType: 'collection',
                collection: {
                  title: collection.title,
                  slug: collection.slug,
                  excerpt: collection.excerpt ?? undefined,
                  editorialNote: collection.editorialNote,
                  type: collection.type,
                  tierOrder: collection.tierOrder,
                  tiers,
                  books,
                },
              }
            }
          } catch (err) {
            logger.warn('Failed to load collection context', { slug: rawContext.slug, error: err instanceof Error ? err.message : String(err) })
          }
        }

        if (rawContext.pageType === 'rankings') {
          try {
            const result = await getCollections({ isFeatured: true, isPublished: true, pageSize: 50 })
            pageContext = {
              pageType: 'rankings',
              featuredCollections: result.data.map((c) => ({
                title: c.title,
                slug: c.slug,
                editorialNote: c.editorialNote,
              })),
            }
          } catch (err) {
            logger.warn('Failed to load rankings context', { error: err instanceof Error ? err.message : String(err) })
          }
        }
      }

      const systemPrompt = buildSystemPrompt(tasteProfile, user.username, pageContext)

      // Собираем все названия книг пользователя для пост-валидации
      const userBookTitles = [
        ...tasteProfile.topBooks.map((b) => b.title),
        ...tasteProfile.midBooks.map((b) => b.title),
        ...tasteProfile.lowBooks.map((b) => b.title),
        ...tasteProfile.unrankedBooks.map((b) => b.title),
      ]

      logger.info('Starting AI stream', {
        userId: user.userId,
        tasteBooks: tasteProfile.totalBooks,
        tierLists: tasteProfile.totalTierLists,
      })

      let aborted = false
      const abortController = new AbortController()
      let keepaliveTimer: ReturnType<typeof setInterval> | undefined

      const cleanup = () => {
        aborted = true
        try { abortController.abort() } catch { /* noop */ }
        if (keepaliveTimer) {
          clearInterval(keepaliveTimer)
          keepaliveTimer = undefined
        }
      }

      request.raw.on('close', cleanup)

      try {
        const timeoutSignal = AbortSignal.timeout(60_000)
        const combinedSignal = AbortSignal.any([abortController.signal, timeoutSignal])

        const stream = streamAiResponse(parsed.data.messages, systemPrompt, combinedSignal, String(user.userId), userBookTitles)

        // Сначала пробуем получить первый чанк (провайдеры вызываются тут)
        // Если все провайдеры недоступны — AiRouterError → 502
        const iterator = stream[Symbol.asyncIterator]()
        let firstResult: IteratorResult<AiChunk>

        try {
          firstResult = await iterator.next()
        } catch (err) {
          cleanup()
          if (err instanceof AiRouterError) {
            logger.error('AI router: все провайдеры недоступны', {
              providerErrors: err.providerErrors,
            })
            return reply.code(502).send(
              createApiError(ErrorCodes.SERVICE_UNAVAILABLE, 'Букстраж сейчас на перерыве. Постучись через минуту.'),
            )
          }
          throw err
        }

        // Первый чанк получен — берём управление и стримим
        reply.hijack()
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': CLIENT_URL,
          'Access-Control-Allow-Credentials': 'true',
        })

        // SSE keepalive
        keepaliveTimer = setInterval(() => {
          if (!aborted) {
            try { reply.raw.write(': keepalive\n\n') } catch { /* noop */ }
          }
        }, 10_000)

        // Пишем первый чанк
        if (!aborted) {
          try {
            if (firstResult.done) {
              reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
            } else {
              reply.raw.write(`data: ${JSON.stringify({ type: 'token', content: firstResult.value.content })}\n\n`)
            }
          } catch { /* noop */ }
        }

        // Стримим остальные чанки
        while (!aborted) {
          const result = await iterator.next()
          if (aborted || result.done) break

          try {
            reply.raw.write(`data: ${JSON.stringify({ type: 'token', content: result.value.content })}\n\n`)
          } catch { break }
        }
      } catch (err) {
        if (aborted) return

        // Ошибка после hijack — шлём error в SSE
        logger.error(err instanceof Error ? err : new Error(String(err)), {
          context: 'AI API stream',
        })

        try {
          reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Букстраж сейчас на перерыве. Постучись через минуту.' })}\n\n`)
        } catch { /* noop */ }
      } finally {
        cleanup()
        try { reply.raw.end() } catch { /* noop */ }
      }
    },
  )
}
