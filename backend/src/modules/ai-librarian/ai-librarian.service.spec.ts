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
}

describe('buildSystemPrompt', () => {
  it('handles empty profile', () => {
    const prompt = buildSystemPrompt(emptyProfile, 'Test')
    expect(prompt).toContain('Test')
    expect(prompt).not.toContain('Всего оценено книг')
  })

  it('includes user name', () => {
    const prompt = buildSystemPrompt(richProfile, 'Федя')
    expect(prompt).toContain('Федя')
  })

  it('includes total books count', () => {
    const prompt = buildSystemPrompt(richProfile, 'User')
    expect(prompt).toContain('Всего оценено книг: 4')
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
})
