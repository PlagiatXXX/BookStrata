import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    readingDna: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('../auth/auth.middleware.js', () => ({
  authMiddleware: vi.fn((request: any, _reply: any, done: any) => {
    const authHeader = request.headers.authorization
    if (authHeader === 'Bearer test-token') {
      request.user = { id: 1, userId: 1, username: 'testuser' }
      done()
    } else {
      _reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Требуется авторизация' } })
    }
  }),
}))

vi.mock('./ai-librarian.service.js', () => ({
  checkAiStatus: vi.fn().mockResolvedValue({ online: true, model: 'test-model', providers: [] }),
  generateTierListRoast: vi.fn(),
  getUserTasteProfile: vi.fn(),
  buildSystemPrompt: vi.fn(),
  streamAiResponse: vi.fn(),
}))

vi.mock('../celebrities/celebrity.service.js', () => ({
  getCelebrityBySlug: vi.fn(),
}))

import { aiLibrarianRoutes } from './ai-librarian.route.js'
import { prisma } from '../../lib/prisma.js'
import { getCelebrityBySlug } from '../celebrities/celebrity.service.js'
import {
  generateTierListRoast,
  getUserTasteProfile,
  buildSystemPrompt,
  streamAiResponse,
} from './ai-librarian.service.js'

describe('AI Librarian Roast Route', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = Fastify()
    await app.register(aiLibrarianRoutes, { prefix: '/api/ai' })
    await app.ready()
  })

  const validPayload = {
    tierListTitle: 'Мой шедевральный топ',
    tiers: [
      {
        label: 'S',
        books: [
          { title: 'Преступление и наказание', author: 'Фёдор Достоевский' },
          { title: 'Мастер и Маргарита', author: 'Михаил Булгаков' },
        ],
      },
      {
        label: 'D',
        books: [
          { title: 'Сумерки', author: 'Стефани Майер' },
          { title: 'Пятьдесят оттенков серого', author: 'Э. Л. Джеймс' },
        ],
      },
    ],
  }

  it('requires authentication for roast-tier-list', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/librarian/roast-tier-list',
      payload: validPayload,
    })

    expect(response.statusCode).toBe(401)
  })

  it('rejects payload with fewer than 4 books', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/librarian/roast-tier-list',
      headers: { authorization: 'Bearer test-token' },
      payload: {
        tierListTitle: 'Тест',
        tiers: [{ label: 'S', books: [{ title: 'Книга 1' }] }],
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 200 with roast data on valid request', async () => {
    const mockRoast = {
      archetype: 'Сноб-трагик',
      roast: 'Слишком много драмы на квадратный сантиметр полки.',
      hotTake: 'Опустить вампиров — неоригинально.',
      cynicismScore: 78,
    }
    vi.mocked(generateTierListRoast).mockResolvedValueOnce(mockRoast)

    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/librarian/roast-tier-list',
      headers: { authorization: 'Bearer test-token' },
      payload: validPayload,
    })

    expect(response.statusCode).toBe(200)
    const json = JSON.parse(response.payload)
    expect(json.data).toEqual(mockRoast)
    expect(generateTierListRoast).toHaveBeenCalledWith(validPayload, '1')
  })

  it('excludes DNA and passes tier-list context on POST /librarian/chat with pageType tier-list', async () => {
    const mockPrisma = {
      tierList: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'tl-1',
          title: 'Мой топ фантастики',
          description: 'Только научная',
          tiers: [{ id: 1, title: 'S', rank: 1 }],
          placements: [
            { tierId: 1, book: { title: 'Дюна', author: 'Фрэнк Герберт' }, tier: { id: 1, title: 'S' } },
          ],
        }),
      },
    }
    const chatApp = Fastify()
    chatApp.decorate('prisma', mockPrisma as any)
    await chatApp.register(aiLibrarianRoutes, { prefix: '/api/ai' })
    await chatApp.ready()

    vi.mocked(getUserTasteProfile).mockResolvedValueOnce({
      topBooks: [],
      midBooks: [],
      lowBooks: [],
      unrankedBooks: [],
      totalBooks: 0,
      totalTierLists: 1,
      tierListNames: ['Мой топ фантастики'],
      totalLikesReceived: 0,
      popularTierLists: [],
      dna: null,
    })
    vi.mocked(buildSystemPrompt).mockReturnValueOnce('system-prompt')
    vi.mocked(streamAiResponse).mockImplementationOnce(async function* () {
      yield { content: 'Обсуждаем только этот тир-лист.', done: false }
      yield { content: '', done: true }
    })

    const response = await chatApp.inject({
      method: 'POST',
      url: '/api/ai/librarian/chat',
      headers: { authorization: 'Bearer test-token' },
      payload: {
        messages: [{ role: 'user', content: 'Посоветуй книгу с учётом моего ДНК' }],
        context: { pageType: 'tier-list', tierListId: 'tl-1' },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(getUserTasteProfile).toHaveBeenCalledWith(1, mockPrisma, { includeDna: false })
    expect(buildSystemPrompt).toHaveBeenCalledWith(
      expect.anything(),
      'testuser',
      expect.objectContaining({
        pageType: 'tier-list',
        tierList: expect.objectContaining({
          title: 'Мой топ фантастики',
          tiers: [{ title: 'S', books: [{ title: 'Дюна', author: 'Фрэнк Герберт' }] }],
        }),
      }),
    )
    expect(response.payload).toContain('Обсуждаем только этот тир-лист.')
  })

  it('excludes DNA on POST /librarian/chat with pageType celebrity', async () => {
    const chatApp = Fastify()
    chatApp.decorate('prisma', {} as any)
    await chatApp.register(aiLibrarianRoutes, { prefix: '/api/ai' })
    await chatApp.ready()

    vi.mocked(getCelebrityBySlug).mockResolvedValueOnce({
      isPublished: true,
      name: 'Стивен Кинг',
      slug: 'stephen-king',
      biography: 'Писатель',
      category: 'Писатель',
      tierOrder: ['s'],
      tiers: { s: { title: 'S', bookIds: ['b1'] } },
      books: { b1: { title: 'Повелитель мух', author: 'Уильям Голдинг' } },
    } as any)
    vi.mocked(getUserTasteProfile).mockResolvedValueOnce({
      topBooks: [],
      midBooks: [],
      lowBooks: [],
      unrankedBooks: [],
      totalBooks: 0,
      totalTierLists: 0,
      tierListNames: [],
      totalLikesReceived: 0,
      popularTierLists: [],
      dna: null,
    })
    vi.mocked(buildSystemPrompt).mockReturnValueOnce('system-prompt')
    vi.mocked(streamAiResponse).mockImplementationOnce(async function* () {
      yield { content: 'Кинг ценит Повелителя мух.', done: false }
      yield { content: '', done: true }
    })

    const response = await chatApp.inject({
      method: 'POST',
      url: '/api/ai/librarian/chat',
      headers: { authorization: 'Bearer test-token' },
      payload: {
        messages: [{ role: 'user', content: 'Что любит Кинг?' }],
        context: { pageType: 'celebrity', slug: 'stephen-king' },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(getUserTasteProfile).toHaveBeenCalledWith(1, expect.anything(), { includeDna: false })
    expect(buildSystemPrompt).toHaveBeenCalledWith(
      expect.anything(),
      'testuser',
      expect.objectContaining({ pageType: 'celebrity' }),
    )
  })

  it('passes casteName, customName, favoriteBooks and kryptoniteBook on POST /librarian/chat with pageType reading-dna', async () => {
    const chatApp = Fastify()
    chatApp.decorate('prisma', {} as any)
    await chatApp.register(aiLibrarianRoutes, { prefix: '/api/ai' })
    await chatApp.ready()

    vi.mocked(prisma.readingDna.findFirst).mockResolvedValueOnce({
      ticketNumber: 'BS-1111-A',
      customName: 'Фёдор',
      archetype: 'meaning-architect',
      archetypeName: 'Архитектор смыслов',
      motto: 'Смысл важнее шума',
      storyFocus: 85,
      emotionalWeight: 70,
      pace: 60,
      darkness: 45,
      scope: 75,
      complexity: 90,
      favoriteBooks: [{ title: 'Мастер и Маргарита', author: 'Булгаков' }],
      kryptoniteBook: { title: 'Сумерки', author: 'Майер' },
    } as any)
    vi.mocked(getUserTasteProfile).mockResolvedValueOnce({
      topBooks: [],
      midBooks: [],
      lowBooks: [],
      unrankedBooks: [],
      totalBooks: 0,
      totalTierLists: 0,
      tierListNames: [],
      totalLikesReceived: 0,
      popularTierLists: [],
      dna: null,
    })
    vi.mocked(buildSystemPrompt).mockReturnValueOnce('system-prompt')
    vi.mocked(streamAiResponse).mockImplementationOnce(async function* () {
      yield { content: 'Разбор ДНК готов.', done: false }
      yield { content: '', done: true }
    })

    const response = await chatApp.inject({
      method: 'POST',
      url: '/api/ai/librarian/chat',
      headers: { authorization: 'Bearer test-token' },
      payload: {
        messages: [{ role: 'user', content: 'Разбери мой билет' }],
        context: { pageType: 'reading-dna', ticketNumber: 'BS-1111-A' },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(buildSystemPrompt).toHaveBeenCalledWith(
      expect.anything(),
      'testuser',
      expect.objectContaining({
        pageType: 'reading-dna',
        readingDna: expect.objectContaining({
          ticketNumber: 'BS-1111-A',
          customName: 'Фёдор',
          casteName: 'Орден Смыслов',
        }),
      }),
    )
    expect(streamAiResponse).toHaveBeenCalledWith(
      expect.anything(),
      'system-prompt',
      expect.anything(),
      '1',
      expect.arrayContaining(['Мастер и Маргарита', 'Сумерки']),
    )
  })
})
