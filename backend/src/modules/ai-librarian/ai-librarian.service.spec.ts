import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './ai-librarian.service.js'
import type { TasteProfile } from './ai-librarian.service.js'

const emptyProfile: TasteProfile = {
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
}

const richProfile: TasteProfile = {
  topBooks: [
    { title: 'Война и мир', author: 'Толстой', tierName: 'S', tierListTitle: 'Лучшее' },
    { title: 'Преступление и наказание', author: 'Достоевский', tierName: 'S', tierListTitle: 'Лучшее' },
  ],
  midBooks: [
    { title: 'Мастер и Маргарита', author: 'Булгаков', tierName: 'A', tierListTitle: 'Классика' },
  ],
  lowBooks: [
    { title: 'Гарри Поттер', author: 'Роулинг', tierName: 'C', tierListTitle: 'Попса' },
  ],
  unrankedBooks: [
    { title: '1984', author: 'Оруэлл', tierName: 'Без рейтинга', tierListTitle: 'Надо прочесть' },
  ],
  totalBooks: 4,
  totalTierLists: 3,
  tierListNames: ['Лучшее', 'Классика', 'Попса', 'Надо прочесть'],
  totalLikesReceived: 42,
  popularTierLists: [
    { title: 'Лучшее', likesCount: 30 },
    { title: 'Классика', likesCount: 10 },
  ],
  dna: null,
}

describe('buildSystemPrompt', () => {
  it('handles empty profile', () => {
    const prompt = buildSystemPrompt(emptyProfile, 'Test')
    expect(prompt).toContain('Test')
    expect(prompt).not.toContain('Всего книг в коллекции')
  })

  it('includes user name', () => {
    const prompt = buildSystemPrompt(richProfile, 'Федя')
    expect(prompt).toContain('Федя')
  })

  it('includes total books count', () => {
    const prompt = buildSystemPrompt(richProfile, 'User')
    expect(prompt).toContain('Всего книг в коллекции: 4')
  })

  it('includes tier list names', () => {
    const prompt = buildSystemPrompt(richProfile, 'User')
    expect(prompt).toContain('Лучшее')
    expect(prompt).toContain('Классика')
  })

  it('lists top rated books', () => {
    const prompt = buildSystemPrompt(richProfile, 'User')
    expect(prompt).toContain('Война и мир')
    expect(prompt).toContain('Толстой')
    expect(prompt).toContain('Преступление и наказание')
    expect(prompt).toContain('Достоевский')
  })

  it('lists unranked books', () => {
    const prompt = buildSystemPrompt(richProfile, 'User')
    expect(prompt).toContain('1984')
    expect(prompt).toContain('Оруэлл')
  })

  it('includes instructions section', () => {
    const prompt = buildSystemPrompt(richProfile, 'User')
    expect(prompt).toContain('книжный эксперт')
    expect(prompt).toContain('реальные пересечения')
  })

  it('запрещает повторять книги, уже названные в диалоге', () => {
    const prompt = buildSystemPrompt(richProfile, 'User')
    expect(prompt).toContain('Не повторяй книги, которые уже назвал')
  })

  it('запрещает выдумывать названия при неуверенности', () => {
    const prompt = buildSystemPrompt(richProfile, 'User')
    expect(prompt).toContain('Не уверен в точном названии')
  })

  it('limits top books to 15', () => {
    const manyBooks: TasteProfile = {
      ...emptyProfile,
      topBooks: Array.from({ length: 20 }, (_, i) => ({
        title: `Book ${i}`,
        author: 'Author',
        tierName: 'S',
        tierListTitle: 'List',
      })),
      totalBooks: 20,
      totalTierLists: 1,
      tierListNames: ['List'],
    }
    const prompt = buildSystemPrompt(manyBooks, 'User')
    const matches = prompt.match(/Book \d+/g)
    expect(matches).toHaveLength(15)
  })

  it('добавляет секцию «Читательский ДНК», если profile.dna задан', () => {
    const profileWithDna: TasteProfile = {
      ...richProfile,
      dna: {
        archetypeName: 'Архитектор смыслов',
        axes: {
          storyFocus: 90,
          emotionalWeight: 80,
          pace: 75,
          darkness: 60,
          scope: 75,
          complexity: 90,
        },
        likedGenres: ['Философия', 'Классика'],
        dislikedGenres: ['Бульварный детектив'],
      },
    }
    const prompt = buildSystemPrompt(profileWithDna, 'Федя')
    expect(prompt).toContain('Читательский ДНК')
    expect(prompt).toContain('Архитектор смыслов')
    expect(prompt).toContain('сюжет/рефлексия 90')
    expect(prompt).toContain('Философия')
  })

  it('не включает секцию «Читательский ДНК», если profile.dna === null', () => {
    const prompt = buildSystemPrompt(richProfile, 'Федя')
    expect(prompt).not.toContain('Читательский ДНК')
  })

  it('включает блок Книжного ДНК с орденом, полюсами осей, священными книгами, запретом криптонита и именем пользователя при pageType reading-dna', () => {
    const profileWithDna: TasteProfile = {
      ...richProfile,
      dna: {
        archetypeName: 'Неактуальный дубль',
        axes: { storyFocus: 10, emotionalWeight: 10, pace: 10, darkness: 10, scope: 10, complexity: 10 },
        likedGenres: [],
        dislikedGenres: [],
      },
    }
    const prompt = buildSystemPrompt(profileWithDna, 'Федя', {
      pageType: 'reading-dna',
      readingDna: {
        ticketNumber: 'DNA-777',
        customName: 'Фёдор Архивный',
        archetypeName: 'Архивариус бездны',
        casteName: 'Орден Бездны',
        motto: 'Истина скрыта во тьме фолиантов',
        storyFocus: 85,
        emotionalWeight: 90,
        pace: 40,
        darkness: 95,
        scope: 70,
        complexity: 88,
        favoriteBooks: [
          { title: 'Имя розы', author: 'Умберто Эко' },
          { title: 'Хребты безумия', author: 'Г. Ф. Лавкрафт' },
        ],
        kryptoniteBook: { title: 'Сумерки', author: 'Стефани Майер' },
      },
    })

    expect(prompt).toContain('Федя')
    expect(prompt).toContain('Имя на читательском билете: Фёдор Архивный')
    expect(prompt).toContain('Орден читателя: Орден Бездны')
    expect(prompt).toContain('читательский билет № DNA-777')
    expect(prompt).toContain('«Архивариус бездны»')
    expect(prompt).toContain('«Истина скрыта во тьме фолиантов»')
    expect(prompt).toContain('Сюжет vs Рефлексия: 85')
    expect(prompt).toContain('Свет vs Мрак: 95')
    expect(prompt).toContain('0 — быстро, книга за вечер')
    expect(prompt).toContain('«Имя розы» (Умберто Эко)')
    expect(prompt).toContain('КНИГА-КРИПТОНИТ')
    expect(prompt).toContain('«Сумерки» (Стефани Майер)')
    expect(prompt).toContain('СТРОЖАЙШИЙ ЗАПРЕТ: Категорически запрещено рекомендовать читателю эту книгу')
    expect(prompt).not.toContain('Неактуальный дубль')
    expect(prompt).toContain('Уже есть в тир-листах пользователя')
  })

  it('на странице знаменитости (celebrity) и коллекции (collection) сохраняет имя пользователя, выводит тиры, но исключает ДНК и личные тир-листы', () => {
    const profileWithDna: TasteProfile = {
      ...richProfile,
      dna: {
        archetypeName: 'Архитектор смыслов',
        axes: { storyFocus: 90, emotionalWeight: 80, pace: 75, darkness: 60, scope: 75, complexity: 90 },
        likedGenres: ['Философия'],
        dislikedGenres: [],
      },
    }

    const celebPrompt = buildSystemPrompt(profileWithDna, 'Анна', {
      pageType: 'celebrity',
      celebrity: {
        name: 'Стивен Кинг',
        slug: 'stephen-king',
        biography: 'Мастер ужасов',
        category: 'Писатель',
        tierOrder: ['s'],
        tiers: { s: { title: 'S', bookIds: ['b1'] } },
        books: { b1: { title: 'Повелитель мух', author: 'Уильям Голдинг', genre: 'Антиутопия' } },
      },
    })

    expect(celebPrompt).toContain('Анна')
    expect(celebPrompt).toContain('Стивен Кинг')
    expect(celebPrompt).toContain('Тир «S»: Повелитель мух — Уильям Голдинг')
    expect(celebPrompt).not.toContain('Архитектор смыслов')
    expect(celebPrompt).not.toContain('Война и мир')

    const collPrompt = buildSystemPrompt(profileWithDna, 'Анна', {
      pageType: 'collection',
      collection: {
        title: 'Хорроры на осень',
        slug: 'autumn-horrors',
        type: 'tier-list',
        tierOrder: ['s'],
        tiers: { s: { title: 'S', bookIds: ['c1'] } },
        books: { c1: { title: 'Сияние', author: 'Стивен Кинг' } },
      },
    })

    expect(collPrompt).toContain('Анна')
    expect(collPrompt).toContain('Хорроры на осень')
    expect(collPrompt).toContain('Тир «S»: Сияние — Стивен Кинг')
    expect(collPrompt).not.toContain('Архитектор смыслов')
    expect(collPrompt).not.toContain('Война и мир')
  })

  it('на странице тир-листа (pageType: tier-list) не включает Книжный ДНК и ограничивает обсуждение книгами тир-листа', () => {
    const profileWithDna: TasteProfile = {
      ...richProfile,
      dna: {
        archetypeName: 'Архитектор смыслов',
        axes: {
          storyFocus: 90,
          emotionalWeight: 80,
          pace: 75,
          darkness: 60,
          scope: 75,
          complexity: 90,
        },
        likedGenres: ['Философия'],
        dislikedGenres: ['Детектив'],
      },
    }

    const prompt = buildSystemPrompt(profileWithDna, 'Федя', {
      pageType: 'tier-list',
      tierList: {
        title: 'Любимая фантастика',
        description: 'Только космоопера',
        tiers: [
          {
            title: 'S',
            books: [{ title: 'Дюна', author: 'Фрэнк Герберт' }],
          },
        ],
        unrankedBooks: [{ title: 'Гиперион', author: 'Дэн Симмонс' }],
      },
    })

    expect(prompt).not.toContain('Архитектор смыслов')
    expect(prompt).not.toContain('Читательский ДНК:')
    expect(prompt).toContain('«Любимая фантастика»')
    expect(prompt).toContain('«Дюна» (Фрэнк Герберт)')
    expect(prompt).toContain('«Гиперион» (Дэн Симмонс)')
    expect(prompt).toContain('обсуждать и советовать книги ТОЛЬКО опираясь на книги внутри этого тир-листа')
    expect(prompt).toContain('на странице читательского билета в разделе «Книжный ДНК»')
  })
})

describe('getUserTasteProfile with DNA', () => {
  it('возвращает dna: null, если у пользователя нет ReadingDna', async () => {
    const { getUserTasteProfile } = await import('./ai-librarian.service.js')
    const mockPrisma = {
      tierList: { findMany: vi.fn().mockResolvedValue([]) },
      readingDna: { findUnique: vi.fn().mockResolvedValue(null) },
    } as any

    const profile = await getUserTasteProfile(1, mockPrisma)
    expect(profile.dna).toBeNull()
    expect(mockPrisma.readingDna.findUnique).toHaveBeenCalledWith({ where: { userId: 1 } })
  })

  it('возвращает dna с archetypeName, осями, likedGenres, dislikedGenres, если ДНК есть', async () => {
    const { getUserTasteProfile } = await import('./ai-librarian.service.js')
    const mockDna = {
      archetypeName: 'Архитектор смыслов',
      storyFocus: 90,
      emotionalWeight: 80,
      pace: 75,
      darkness: 60,
      scope: 75,
      complexity: 90,
      likedGenres: ['Философия', 'Классика'],
      dislikedGenres: ['Бульварный детектив'],
    }
    const mockPrisma = {
      tierList: { findMany: vi.fn().mockResolvedValue([]) },
      readingDna: { findUnique: vi.fn().mockResolvedValue(mockDna) },
    } as any

    const profile = await getUserTasteProfile(1, mockPrisma)
    expect(profile.dna).toEqual({
      archetypeName: 'Архитектор смыслов',
      axes: {
        storyFocus: 90,
        emotionalWeight: 80,
        pace: 75,
        darkness: 60,
        scope: 75,
        complexity: 90,
      },
      likedGenres: ['Философия', 'Классика'],
      dislikedGenres: ['Бульварный детектив'],
    })
  })

  it('не запрашивает readingDna и возвращает dna: null при includeDna: false', async () => {
    const { getUserTasteProfile } = await import('./ai-librarian.service.js')
    const mockPrisma = {
      tierList: { findMany: vi.fn().mockResolvedValue([]) },
      readingDna: { findUnique: vi.fn() },
    } as any

    const profile = await getUserTasteProfile(1, mockPrisma, { includeDna: false })
    expect(profile.dna).toBeNull()
    expect(mockPrisma.readingDna.findUnique).not.toHaveBeenCalled()
  })
})

describe('TierList Roast', () => {
  const sampleInput = {
    tierListTitle: 'Мой идеальный топ',
    tierListDescription: 'Классика против новинок',
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

  it('buildTierListRoastPrompt formats tiers and books into prompt', async () => {
    const { buildTierListRoastPrompt } = await import('./ai-librarian.service.js')
    const prompt = buildTierListRoastPrompt(sampleInput)

    expect(prompt).toContain('Мой идеальный топ')
    expect(prompt).toContain('Классика против новинок')
    expect(prompt).toContain('Тир S:')
    expect(prompt).toContain('Преступление и наказание')
    expect(prompt).toContain('Тир D:')
    expect(prompt).toContain('Сумерки')
  })

  it('parseTierListRoastResponse parses raw JSON string into valid response', async () => {
    const { parseTierListRoastResponse } = await import('./ai-librarian.service.js')
    const raw = JSON.stringify({
      archetype: 'Сноб-интеллектуал',
      roast: 'Вы выстроили этот тир-лист, чтобы казаться глубже Марианской впадины.',
      hotTake: 'Опустить вампиров на дно — это так свежо для 2008 года.',
      cynicismScore: 82,
    })

    const parsed = parseTierListRoastResponse(raw)
    expect(parsed.archetype).toBe('Сноб-интеллектуал')
    expect(parsed.roast).toContain('Марианской впадины')
    expect(parsed.hotTake).toContain('2008 года')
    expect(parsed.cynicismScore).toBe(82)
  })

  it('parseTierListRoastResponse cleans markdown codeblocks before parsing', async () => {
    const { parseTierListRoastResponse } = await import('./ai-librarian.service.js')
    const raw = `\`\`\`json
{
  "archetype": "Псевдоэстет",
  "roast": "Прекрасный тир-лист для хвастовства.",
  "hotTake": "Булгаков в S — никто не удивлён.",
  "cynicismScore": 65
}
\`\`\``

    const parsed = parseTierListRoastResponse(raw)
    expect(parsed.archetype).toBe('Псевдоэстет')
    expect(parsed.cynicismScore).toBe(65)
  })

  it('parseTierListRoastResponse cleans leading/trailing quotes from text fields', async () => {
    const { parseTierListRoastResponse } = await import('./ai-librarian.service.js')
    const raw = JSON.stringify({
      archetype: '«Сноб-интеллектуал»',
      roast: '«Вы выстроили этот тир-лист, чтобы казаться глубже.»',
      hotTake: '«Сумерки в D-тире — это классика.»',
      cynicismScore: 82,
    })

    const parsed = parseTierListRoastResponse(raw)
    expect(parsed.archetype).toBe('Сноб-интеллектуал')
    expect(parsed.roast).toBe('Вы выстроили этот тир-лист, чтобы казаться глубже.')
    expect(parsed.hotTake).toBe('Сумерки в D-тире — это классика.')
  })

  it('parseTierListRoastResponse returns safe fallback on broken JSON', async () => {
    const { parseTierListRoastResponse } = await import('./ai-librarian.service.js')
    const raw = 'Not a valid JSON at all, but some rant about books.'

    const parsed = parseTierListRoastResponse(raw)
    expect(parsed.archetype).toBeDefined()
    expect(parsed.roast).toContain('Not a valid JSON')
    expect(typeof parsed.cynicismScore).toBe('number')
  })
})

