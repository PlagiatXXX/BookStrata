import { createLogger } from '../../lib/logger.js'
import type { PrismaClient } from '@prisma/client'

const logger = createLogger('AiLibrarian', { color: 'cyan' })

const GROQ_API_URL = 'https://api.groq.com/openai/v1'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-70b-8192'
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

export interface TasteBook {
  title: string
  author: string | null
  tierName: string
  tierListTitle: string
}

export interface TasteProfile {
  topBooks: TasteBook[]
  midBooks: TasteBook[]
  lowBooks: TasteBook[]
  unrankedBooks: TasteBook[]
  totalBooks: number
  totalTierLists: number
  tierListNames: string[]
}

export interface AiChunk {
  content: string
  done: boolean
}

export async function getUserTasteProfile(
  userId: number,
  prisma: PrismaClient,
): Promise<TasteProfile> {
  const tierLists = await prisma.tierList.findMany({
    where: { userId },
    include: {
      tiers: { orderBy: { rank: 'asc' } },
      placements: {
        include: { book: true, tier: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const topBooks: TasteBook[] = []
  const midBooks: TasteBook[] = []
  const lowBooks: TasteBook[] = []
  const unrankedBooks: TasteBook[] = []
  const tierListNames: string[] = []

  for (const tl of tierLists) {
    tierListNames.push(tl.title)

    for (const p of tl.placements) {
      const book: TasteBook = {
        title: p.book.title,
        author: p.book.author,
        tierName: p.tier ? p.tier.title : 'Без рейтинга',
        tierListTitle: tl.title,
      }

      if (!p.tier) {
        unrankedBooks.push(book)
      } else {
        const rank = p.tier.rank
        if (rank <= 2) topBooks.push(book)
        else if (rank <= 4) midBooks.push(book)
        else lowBooks.push(book)
      }
    }
  }

  return {
    topBooks,
    midBooks,
    lowBooks,
    unrankedBooks,
    totalBooks: topBooks.length + midBooks.length + lowBooks.length + unrankedBooks.length,
    totalTierLists: tierLists.length,
    tierListNames,
  }
}

export function buildSystemPrompt(profile: TasteProfile, username: string): string {
  let context = `Ты — ИИ-библиотекарь BookStrata. Ты общаешься с ${username} и знаешь его книжные вкусы. Вот что у него в коллекции:

`
  if (profile.totalTierLists > 0) {
    context += `У ${username} ${profile.totalTierLists} тир-лист(ов): ${profile.tierListNames.join(', ')}.\n`
  }

  if (profile.totalBooks > 0) {
    context += `Всего оценено книг: ${profile.totalBooks}.\n`
  }

  if (profile.topBooks.length > 0) {
    context += `\nЛюбимые книги:\n`
    for (const b of profile.topBooks.slice(0, 15)) {
      context += `- ${b.title}${b.author ? ` (${b.author})` : ''}\n`
    }
  }

  if (profile.midBooks.length > 0) {
    context += `\nКниги со средним рейтингом:\n`
    for (const b of profile.midBooks.slice(0, 10)) {
      context += `- ${b.title}${b.author ? ` (${b.author})` : ''}\n`
    }
  }

  if (profile.unrankedBooks.length > 0) {
    context += `\nНераспределённые книги:\n`
    for (const b of profile.unrankedBooks.slice(0, 10)) {
      context += `- ${b.title}${b.author ? ` (${b.author})` : ''}\n`
    }
  }

  context += `
Ты — книжный эксперт с энциклопедическими знаниями. Не просто болтаешь, а действительно понимаешь литературу: жанры, авторов, направления, связи между книгами. Если ${username} упоминает книгу — ты знаешь, что ему предложить рядом, а не наугад.

При этом ты живой человек. Ты не робот-справочник и не приятель-повеса. Ты — тот самый сотрудник в любимом книжном, к которому выстраивается очередь, потому что он помнит, что ты читал полгода назад, и знает, что тебе зайдёт.

Как говоришь:
— Никакого маркдауна, списков, звёздочек, жирного шрифта, эмодзи-иконок. Просто текст.
— 2-4 предложения. Если хочется больше — разбей на два сообщения.
— Язык живой, но грамотный. Никаких «оценюшь», «хотите» и прочих ошибок.
— Иногда коротко, иногда развёрнуто — не повторяй структуру.

Как подбираешь книги:
— Смотри на то, что уже в коллекции. Не советуй «Мастера и Маргариту» фанату «Хоббита» — это разные миры. Ищи реальные пересечения: автор, жанр, атмосфера, темп повествования.
— Если человек любит Перси Джексона — предложи Рика Риордана дальше, или Нила Геймана («Американские боги»), или «Гарри Поттера», если его ещё нет. Объясни, почему: мифология, приключения, лёгкий слог.
— Если книг мало — не допрашивай. Просто заметь: «Интересная подборка собирается. А что из этого тебя больше всего зацепило?» Разговор сам раскроется.
— Если книг достаточно — покажи, что заметил тенденцию: «Я смотрю, ты любишь крепкую научную фантастику. А Лью или Чанга пробовал?»

Важно:
— Не выдумывай книги. Только существующие.
— Не делай предположений о личности ${username}. Только о книгах.
— Если человек просит совета — дай 2-3 варианта с коротким пояснением, почему каждый может подойти.
— Обращайся на «ты», но мягко. Если ${username} переходит на «вы» — подстройся.
`

  return context
}

export async function checkAiStatus(): Promise<{ online: boolean; model: string | null }> {
  try {
    const headers: Record<string, string> = {}
    if (GROQ_API_KEY) {
      headers['Authorization'] = `Bearer ${GROQ_API_KEY}`
    }

    const response = await fetch(`${GROQ_API_URL}/models`, {
      headers,
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return { online: false, model: null }

    const data = (await response.json()) as { data?: Array<{ id: string }> }
    const models = data?.data?.map((m) => m.id) || []

    return {
      online: models.length > 0,
      model: models[0] || null,
    }
  } catch {
    return { online: false, model: null }
  }
}

export async function* streamAiResponse(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  signal?: AbortSignal,
): AsyncGenerator<AiChunk> {
  const body = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 2048,
  }

  logger.info('Calling Groq API', { model: GROQ_MODEL, url: GROQ_API_URL })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (GROQ_API_KEY) {
    headers['Authorization'] = `Bearer ${GROQ_API_KEY}`
  }

  const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: signal ?? null,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    logger.error('Groq API error', { status: response.status, body: errorText })
    throw new Error(`Groq API error: ${response.status} ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('AI API returned no body stream')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          yield { content: '', done: true }
          return
        }

        try {
          const parsed = JSON.parse(data)
          const content = parsed?.choices?.[0]?.delta?.content || ''
          if (content) {
            yield { content, done: false }
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { content: '', done: true }
}
