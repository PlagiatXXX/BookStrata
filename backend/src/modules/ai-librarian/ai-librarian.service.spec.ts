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

  it('включает блок Книжного ДНК с осями вкуса, священными книгами и запретом криптонита при pageType reading-dna', () => {
    const prompt = buildSystemPrompt(emptyProfile, 'User', {
      pageType: 'reading-dna',
      readingDna: {
        ticketNumber: 'DNA-777',
        archetypeName: 'Архивариус бездны',
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

    expect(prompt).toContain('читательский билет № DNA-777')
    expect(prompt).toContain('«Архивариус бездны»')
    expect(prompt).toContain('«Истина скрыта во тьме фолиантов»')
    expect(prompt).toContain('Сюжет vs Рефлексия: 85')
    expect(prompt).toContain('Свет vs Мрак: 95')
    expect(prompt).toContain('«Имя розы» (Умберто Эко)')
    expect(prompt).toContain('КНИГА-КРИПТОНИТ')
    expect(prompt).toContain('«Сумерки» (Стефани Майер)')
    expect(prompt).toContain('СТРОЖАЙШИЙ ЗАПРЕТ: Категорически запрещено рекомендовать читателю эту книгу')
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
})
