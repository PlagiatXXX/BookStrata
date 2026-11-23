import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {},
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

import { aiLibrarianRoutes } from './ai-librarian.route.js'
import { generateTierListRoast } from './ai-librarian.service.js'

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
})
