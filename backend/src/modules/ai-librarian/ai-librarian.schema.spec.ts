import { describe, it, expect } from 'vitest'
import {
  ChatRequestSchema,
  ChatMessageSchema,
  TierListRoastRequestSchema,
  TierListRoastResponseSchema,
} from './ai-librarian.schema.js'

describe('ChatMessageSchema', () => {
  it('validates a user message', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: 'Hello',
    })
    expect(result.success).toBe(true)
  })

  it('validates an assistant message', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'assistant',
      content: 'Hi there',
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown role', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'admin',
      content: 'test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing content', () => {
    const result = ChatMessageSchema.safeParse({ role: 'user' })
    expect(result.success).toBe(false)
  })
})

describe('ChatRequestSchema', () => {
  it('validates a chat request with messages', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [
        { role: 'user', content: 'Recommend me a book' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty messages array', () => {
    const result = ChatRequestSchema.safeParse({ messages: [] })
    expect(result.success).toBe(false)
  })

  it('rejects missing messages field', () => {
    const result = ChatRequestSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('validates multiple messages', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'Recommend something' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('validates context with pageType reading-dna and ticketNumber', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'Разбери мой ДНК' }],
      context: {
        pageType: 'reading-dna',
        ticketNumber: 'DNA-12345',
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('TierListRoastRequestSchema', () => {
  const validPayload = {
    tierListTitle: 'Мой идеальный топ',
    tierListDescription: 'Только шедевры',
    tiers: [
      {
        label: 'S',
        color: '#ff7f7f',
        books: [
          { title: 'Война и мир', author: 'Лев Толстой' },
          { title: 'Преступление и наказание', author: 'Фёдор Достоевский' },
        ],
      },
      {
        label: 'D',
        color: '#7fbfff',
        books: [
          { title: 'Сумерки', author: 'Стефани Майер' },
          { title: 'Пятьдесят оттенков серого', author: 'Э. Л. Джеймс' },
        ],
      },
    ],
  }

  it('validates a correct tier list roast request with 4+ books', () => {
    const result = TierListRoastRequestSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('rejects if total books across all tiers is less than 4', () => {
    const invalid = {
      tierListTitle: 'Мало книг',
      tiers: [
        {
          label: 'S',
          books: [
            { title: 'Книга 1' },
            { title: 'Книга 2' },
          ],
        },
      ],
    }
    const result = TierListRoastRequestSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects if title is empty', () => {
    const invalid = {
      ...validPayload,
      tierListTitle: '',
    }
    const result = TierListRoastRequestSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('TierListRoastResponseSchema', () => {
  it('validates a correct roast response', () => {
    const valid = {
      archetype: 'Сноб-трагик',
      roast: 'Вы явно читаете только ради страданий персонажей.',
      hotTake: 'Поставить Достоевского в S, а Кинга в D — классика снобизма.',
      cynicismScore: 85,
    }
    const result = TierListRoastResponseSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects cynicismScore outside 0..100', () => {
    const invalid = {
      archetype: 'Сноб',
      roast: 'Текст',
      hotTake: 'Хоттейк',
      cynicismScore: 150,
    }
    const result = TierListRoastResponseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

