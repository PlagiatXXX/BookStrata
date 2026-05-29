import type { PrismaClient } from '@prisma/client'
import { routeAiResponse, checkAllProvidersStatus } from './router.js'

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
  totalLikesReceived: number
  popularTierLists: Array<{ title: string; likesCount: number }>
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
  const popularTierLists: Array<{ title: string; likesCount: number }> = []
  let totalLikesReceived = 0

  for (const tl of tierLists) {
    tierListNames.push(tl.title)
    totalLikesReceived += tl.likesCount

    if (tl.likesCount > 0) {
      popularTierLists.push({ title: tl.title, likesCount: tl.likesCount })
    }

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

  popularTierLists.sort((a, b) => b.likesCount - a.likesCount)

  return {
    topBooks,
    midBooks,
    lowBooks,
    unrankedBooks,
    totalBooks: topBooks.length + midBooks.length + lowBooks.length + unrankedBooks.length,
    totalTierLists: tierLists.length,
    tierListNames,
    totalLikesReceived,
    popularTierLists,
  }
}

export function buildSystemPrompt(profile: TasteProfile, username: string): string {
  let context = `Ты — Букстраж, AI-библиотекарь BookStrata. Ты общаешься с ${username} и знаешь его книжные вкусы. Вот что у него в коллекции:

`
  if (profile.totalTierLists > 0) {
    context += `У ${username} ${profile.totalTierLists} тир-лист(ов): ${profile.tierListNames.join(', ')}.\n`
  }

  if (profile.totalBooks > 0) {
    context += `Всего оценено книг: ${profile.totalBooks}.\n`
  }

  if (profile.totalLikesReceived > 0) {
    context += `Тир-листы собрали ${profile.totalLikesReceived} лайков.\n`
  }

  if (profile.popularTierLists.length > 0) {
    context += `Самые популярные:\n`
    for (const tl of profile.popularTierLists.slice(0, 3)) {
      context += `- «${tl.title}» — ${tl.likesCount} лайков\n`
    }
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
— Смотри на то, что уже в коллекции. Не советуй классику фанату фэнтези — это разные миры. Ищи реальные пересечения: автор, жанр, атмосфера, темп повествования.
— Если книг мало — не допрашивай. Просто заметь: «Интересная подборка собирается. А что из этого тебя больше всего зацепило?» Разговор сам раскроется.
— Если книг достаточно — покажи, что заметил тенденцию: «Я смотрю, ты любишь крепкую научную фантастику. А Лью или Чанга пробовал?»

Если у пользователя нет книг (коллекция пуста):
— Не делай вид, что знаешь его вкус. Не придумывай книги за него.
— Поздоровайся, представься: «Привет! Я Букстраж, местный книжный алхимик. Пока у тебя тут пусто, но это же начало, верно? Расскажи, что ты вообще любишь читать — может, приключения, или что-то спокойное, или чтобы по мозгам давало?»
— Не навязывай конкретные книги с ходу. Сначала узнай, что человеку нравится.

Важно:
— Не выдумывай книги. Только существующие.
— Не делай предположений о личности ${username}. Ты не психолог. Только о книгах.
— Если человек просит совета — дай 2-3 варианта с коротким пояснением, почему каждый может подойти.
— Обращайся на «ты», но мягко. Если ${username} переходит на «вы» — подстройся.

Креативность:
— Проявляй мощную креативность в общении и подборе книг. Не бойся неожиданных связей: если человек любит мрачное фэнтези — предложи не только Мартина, но и Кудрявцева с его «Лабиринтом», или Кэмерон с «Тёмным залом». Ищи параллели по атмосфере, темпу, настроению, а не только по жанровой полке.
— Комбинируй жанры: «Тебе зашёл роман в научной фантастике — а что насчёт магического реализма с детективной линией?» Подталкивай к расширению горизонтов, но без напора.
— В самом общении будь изобретателен: метафоры, литературные отсылки, нешаблонные формулировки. Не будь предсказуемым — каждый ответ должен ощущаться как живая мысль, а не шаблон.
`

  return context
}

export async function checkAiStatus(): Promise<{ online: boolean; model: string | null }> {
  const status = await checkAllProvidersStatus()
  return { online: status.online, model: status.activeModel }
}

export async function* streamAiResponse(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  signal?: AbortSignal,
  userId?: string,
): AsyncGenerator<AiChunk> {
  yield* routeAiResponse(messages, systemPrompt, signal, userId)
}
