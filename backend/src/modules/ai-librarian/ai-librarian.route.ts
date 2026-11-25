/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '../auth/auth.middleware.js'

import { ErrorCodes, createApiError } from '../../lib/api-response.js'
import { ChatRequestSchema, TierListRoastRequestSchema } from './ai-librarian.schema.js'
import {
  getUserTasteProfile,
  buildSystemPrompt,
  streamAiResponse,
  checkAiStatus,
  generateTierListRoast,
} from './ai-librarian.service.js'
import type { AiChunk, PageContext } from './ai-librarian.service.js'
import { getCollectionBySlug, getCollections } from '../collections/collection.service.js'
import { getCelebrityBySlug } from '../celebrities/celebrity.service.js'
import { ARCHETYPES } from '../reading-dna/archetypes.data.js'
import { AiRouterError } from './router.js'
import { createLogger } from '../../lib/logger.js'
import { prisma } from '../../lib/prisma.js'

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
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        body: {
          type: 'object',
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              minItems: 1,
              maxItems: 20,
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant'] },
                  content: { type: 'string', minLength: 1, maxLength: 8000 },
                },
              },
            },
            context: {
              type: 'object',
              required: ['pageType'],
              properties: {
                pageType: { type: 'string', enum: ['rankings', 'collection', 'book-description', 'celebrity', 'reading-dna', 'tier-list'] },
                slug: { type: 'string' },
                ticketNumber: { type: 'string' },
                tierListId: { type: 'string' },
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

      const rawContext = parsed.data.context
      const isScopedPage =
        rawContext?.pageType === 'tier-list' ||
        rawContext?.pageType === 'celebrity' ||
        rawContext?.pageType === 'collection'

      let tasteProfile
      try {
        tasteProfile = await getUserTasteProfile(user.userId, fastify.prisma, {
          includeDna: !isScopedPage,
        })
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

        if (rawContext.pageType === 'celebrity' && rawContext.slug) {
          try {
            const celebrity = await getCelebrityBySlug(rawContext.slug)
            if (celebrity && celebrity.isPublished) {
              const tiers = celebrity.tiers as Record<string, { title: string; bookIds: string[] }> | undefined
              const books = celebrity.books as Record<string, { title: string; author?: string | null; genre?: string | null; description?: string | null }> | undefined
              pageContext = {
                pageType: 'celebrity',
                celebrity: {
                  name: celebrity.name,
                  slug: celebrity.slug,
                  biography: celebrity.biography,
                  category: celebrity.category,
                  tierOrder: celebrity.tierOrder,
                  tiers,
                  books,
                },
              }
            }
          } catch (err) {
            logger.warn('Failed to load celebrity context', { slug: rawContext.slug, error: err instanceof Error ? err.message : String(err) })
          }
        }

        if (rawContext.pageType === 'rankings') {
          try {
            const result = await getCollections({ isFeatured: true, isPublished: true, pageSize: 50, summary: true })
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

        if (rawContext.pageType === 'reading-dna' && rawContext.ticketNumber) {
          try {
            const ticket = await prisma.readingDna.findFirst({
              where: {
                OR: [
                  { ticketNumber: rawContext.ticketNumber },
                  { shortCode: rawContext.ticketNumber },
                ],
              },
            })
            if (ticket) {
              const favoriteBooks = Array.isArray(ticket.favoriteBooks)
                ? (ticket.favoriteBooks as Array<{ title: string; author?: string | null }>)
                : []
              const kryptoniteBook =
                ticket.kryptoniteBook && typeof ticket.kryptoniteBook === 'object'
                  ? (ticket.kryptoniteBook as { title: string; author?: string | null })
                  : null
              const matchedArchetype = ARCHETYPES.find(
                (a) =>
                  a.id === ticket.archetype ||
                  a.names.dark === ticket.archetypeName ||
                  a.names.craft === ticket.archetypeName,
              )

              pageContext = {
                pageType: 'reading-dna',
                readingDna: {
                  ticketNumber: ticket.ticketNumber,
                  customName: ticket.customName,
                  archetypeName: ticket.archetypeName,
                  casteName: matchedArchetype?.caste.name ?? null,
                  motto: ticket.motto,
                  storyFocus: ticket.storyFocus,
                  emotionalWeight: ticket.emotionalWeight,
                  pace: ticket.pace,
                  darkness: ticket.darkness,
                  scope: ticket.scope,
                  complexity: ticket.complexity,
                  favoriteBooks,
                  kryptoniteBook,
                },
              }
            }
          } catch (err) {
              logger.warn('Failed to load reading-dna context', {
                ticketNumber: rawContext.ticketNumber,
                error: err instanceof Error ? err.message : String(err),
              })
            }
          }

          if (rawContext.pageType === 'tier-list') {
            let tierListContext: PageContext['tierList']
            if (rawContext.tierListId) {
              try {
                const tierList = await fastify.prisma.tierList.findFirst({
                  where: {
                    AND: [
                      {
                        OR: [
                          { id: rawContext.tierListId },
                          { slug: rawContext.tierListId },
                        ],
                      },
                      {
                        OR: [
                          { userId: user.userId },
                          { isPublic: true },
                        ],
                      },
                    ],
                  },
                  include: {
                    tiers: { orderBy: { rank: 'asc' } },
                    placements: {
                      include: { book: true, tier: true },
                    },
                  },
                })
                if (tierList) {
                  const booksByTierId = new Map<number, Array<{ title: string; author?: string | null }>>()
                  const unrankedBooks: Array<{ title: string; author?: string | null }> = []
                  for (const p of tierList.placements) {
                    const entry = { title: p.book.title, author: p.book.author }
                    if (p.tierId !== null) {
                      const arr = booksByTierId.get(p.tierId) ?? []
                      arr.push(entry)
                      booksByTierId.set(p.tierId, arr)
                    } else {
                      unrankedBooks.push(entry)
                    }
                  }
                  tierListContext = {
                    title: tierList.title,
                    description: tierList.description,
                    tiers: tierList.tiers.map((t) => ({
                      title: t.title,
                      books: booksByTierId.get(t.id) ?? [],
                    })),
                    unrankedBooks,
                  }
                }
              } catch (err) {
                logger.warn('Failed to load tier-list context', {
                  tierListId: rawContext.tierListId,
                  error: err instanceof Error ? err.message : String(err),
                })
              }
            }

            pageContext = {
              pageType: 'tier-list',
              ...(tierListContext ? { tierList: tierListContext } : {}),
            }
          }
        }

        const systemPrompt = buildSystemPrompt(tasteProfile, user.username, pageContext)

        // Собираем названия книг пользователя для пост-валидации анти-дубля
        const userBookTitles =
          pageContext?.pageType === 'tier-list' && pageContext.tierList
            ? [
                ...pageContext.tierList.tiers.flatMap((t) => t.books.map((b) => b.title)),
                ...pageContext.tierList.unrankedBooks.map((b) => b.title),
              ]
            : pageContext?.pageType === 'collection' || pageContext?.pageType === 'celebrity'
              ? []
              : [
                  ...tasteProfile.topBooks.map((b) => b.title),
                  ...tasteProfile.midBooks.map((b) => b.title),
                  ...tasteProfile.lowBooks.map((b) => b.title),
                  ...tasteProfile.unrankedBooks.map((b) => b.title),
                ]
      if (pageContext?.readingDna?.kryptoniteBook?.title) {
        userBookTitles.push(pageContext.readingDna.kryptoniteBook.title)
      }
      if (pageContext?.readingDna?.favoriteBooks?.length) {
        for (const fav of pageContext.readingDna.favoriteBooks) {
          if (fav.title) userBookTitles.push(fav.title)
        }
      }

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
          'X-Accel-Buffering': 'no',
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

  fastify.post(
    '/librarian/roast-tier-list',
    {
      preHandler: [authMiddleware],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parseResult = TierListRoastRequestSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.code(400).send(
          createApiError(
            ErrorCodes.INVALID_INPUT,
            parseResult.error.issues[0]?.message || 'Некорректные данные тир-листа',
          ),
        )
      }

      const userId = String((request as any).user?.id || (request as any).user?.userId || '')

      try {
        const roast = await generateTierListRoast(parseResult.data, userId)
        return reply.code(200).send({ data: roast })
      } catch (err) {
        if (err instanceof AiRouterError) {
          logger.error('AI router: все провайдеры недоступны для прожарки', {
            providerErrors: err.providerErrors,
          })
          return reply.code(502).send(
            createApiError(ErrorCodes.SERVICE_UNAVAILABLE, 'Букстраж сейчас на перерыве. Постучись через минуту.'),
          )
        }
        logger.error(err instanceof Error ? err : new Error(String(err)), {
          context: 'Roast tier list generation error',
        })
        return reply.code(500).send(
          createApiError(ErrorCodes.INTERNAL_ERROR, 'Не удалось сгенерировать прожарку'),
        )
      }
    },
  )
}

