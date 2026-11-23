import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from './api-client'
import { roastTierList, type TierListRoastPayload } from './aiLibrarianApi'

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('aiLibrarianApi - roastTierList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls /ai/librarian/roast-tier-list with correct payload', async () => {
    const mockPayload: TierListRoastPayload = {
      tierListTitle: 'Тестовый список',
      tiers: [
        {
          label: 'S',
          books: [
            { title: 'Книга 1', author: 'Автор 1' },
            { title: 'Книга 2' },
          ],
        },
        {
          label: 'D',
          books: [
            { title: 'Книга 3' },
            { title: 'Книга 4' },
          ],
        },
      ],
    }

    const mockResult = {
      archetype: 'Сноб-диагност',
      roast: 'Слишком много пафоса.',
      hotTake: 'Книга 1 в S — очевидный выбор.',
      cynicismScore: 75,
    }

    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResult)

    const result = await roastTierList(mockPayload)

    expect(apiClient.post).toHaveBeenCalledWith('/ai/librarian/roast-tier-list', mockPayload)
    expect(result).toEqual(mockResult)
  })
})
