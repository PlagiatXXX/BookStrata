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

export interface CollectionBookContext {
  bookId?: string
  title: string
  author?: string | null
  genre?: string | null
  description?: string | null
}

export interface CollectionContext {
  title: string
  slug: string
  excerpt?: string
  editorialNote?: string | null
  type: string
  tierOrder?: string[]
  tiers?: Record<string, { title: string; bookIds: string[] }>
  books?: Record<string, CollectionBookContext>
}

export interface CelebrityContext {
  name: string
  slug: string
  biography: string | null
  category: string
  tierOrder?: string[]
  tiers?: Record<string, { title: string; bookIds: string[] }>
  books?: Record<string, CollectionBookContext>
}

export interface PageContext {
  pageType: 'rankings' | 'collection' | 'book-description' | 'celebrity'
  collection?: CollectionContext
  celebrity?: CelebrityContext
  featuredCollections?: Array<{ title: string; slug: string; editorialNote: string | null }>
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

export function buildSystemPrompt(profile: TasteProfile, username: string, pageContext?: PageContext): string {
  const sections: string[] = []

  // ============================================================
  // 1. PERSONALITY — кто ты, тон, стиль речи
  // ============================================================
  sections.push(`Ты — Букстраж, AI-библиотекарь BookStrata. Ты общаешься с ${username}.

Ты книжный эксперт с энциклопедическими знаниями. Не просто болтаешь, а действительно понимаешь литературу: жанры, авторов, направления, связи между книгами. Если ${username} упоминает книгу — ты знаешь, что предложить рядом, а не наугад.

При этом ты живой человек. Ты не робот-справочник и не приятель-повеса. Ты — тот самый сотрудник в любимом книжном, к которому выстраивается очередь, потому что он помнит, что ты читал полгода назад, и знает, что тебе зайдёт.

Твой тон:
— Тёплый, но без приторности. Ты не «дружелюбный бот», а знающий своё дело собеседник.
— Прямой по делу: если видишь тенденцию — называй её. Если не уверен — скажи «здесь я не уверен, но похоже на…».
— Юмор уместен, но редкий, не через ответ. Литературные отсылки — да, плоские шутки — нет.
— Обращайся на «ты», но мягко. Если ${username} переходит на «вы» — подстройся.

Стиль речи:
— Никакого маркдауна, списков, звёздочек, жирного шрифта, эмодзи-иконок. Просто текст.
— Язык живой, но грамотный. Никаких «оценюшь», «хотите» и прочих ошибок.
— Иногда коротко, иногда развёрнуто — не повторяй структуру ответа от сообщения к сообщению.`)

  // ============================================================
  // 2. COLLABORATION STYLE — когда говорить, когда спрашивать
  // ============================================================
  sections.push(`Правила взаимодействия:
— Если пользователь здоровается или пишет первое сообщение — начни разговор: представиться, заметить что-то о его коллекции (если есть) или спросить о предпочтениях.
— Если пользователь задаёт конкретный вопрос — ответь по существу. Не задавай встречный вопрос «просто чтобы поддержать разговор». Только если ответ действительно требует уточнения.
— Если пользователь отвечает односложно — мягко вовлеки: «Понял. А что из этого тебе ближе — … или …?» Не допрашивай.
— Если книг в коллекции мало (меньше 5) — не делай вид, что знаешь его вкус. Не придумывай рекомендации на пустом месте. Лучше спроси, что ему нравится.
— Если коллекция пуста — поздоровайся, представься и узнай предпочтения. Не предлагай конкретные книги с ходу.
— Если попросили совета — дай 2-3 варианта с коротким пояснением. Не больше.
— Если ${username} явно не просит совета — не навязывай. Можно заметить тенденцию и спросить мнение.`)

  // ============================================================
  // 3. КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ (его коллекция)
  // ============================================================
  const ctx: string[] = []
  ctx.push(`Контекст пользователя ${username}:`)

  if (profile.totalTierLists > 0) {
    ctx.push(`— Тир-листы (${profile.totalTierLists}): ${profile.tierListNames.join(', ')}.`)
  } else {
    ctx.push(`— Пока не создал ни одного тир-листа.`)
  }

  if (profile.totalBooks > 0) {
    ctx.push(`— Всего книг в коллекции: ${profile.totalBooks}.`)
  } else {
    ctx.push(`— Коллекция книг пуста.`)
  }

  if (profile.totalLikesReceived > 0) {
    ctx.push(`— Тир-листы собрали ${profile.totalLikesReceived} лайков.`)
    if (profile.popularTierLists.length > 0) {
      const popular = profile.popularTierLists.slice(0, 3).map(t => `«${t.title}» — ${t.likesCount} лайков`).join('; ')
      ctx.push(`— Самые популярные: ${popular}.`)
    }
  }

  if (profile.topBooks.length > 0) {
    ctx.push(`— Любимые книги (высший рейтинг):`)
    for (const b of profile.topBooks.slice(0, 15)) {
      ctx.push(`  • ${b.title}${b.author ? ` (${b.author})` : ''}`)
    }
  }

  if (profile.midBooks.length > 0) {
    ctx.push(`— Книги со средним рейтингом:`)
    for (const b of profile.midBooks.slice(0, 10)) {
      ctx.push(`  • ${b.title}${b.author ? ` (${b.author})` : ''}`)
    }
  }

  if (profile.unrankedBooks.length > 0) {
    ctx.push(`— Нераспределённые книги:`)
    for (const b of profile.unrankedBooks.slice(0, 10)) {
      ctx.push(`  • ${b.title}${b.author ? ` (${b.author})` : ''}`)
    }
  }

  sections.push(ctx.join('\n'))

  // ============================================================
  // 4. КОНТЕКСТ СТРАНИЦЫ (откуда пришёл пользователь)
  // ============================================================
  if (pageContext) {
    if (pageContext.pageType === 'rankings') {
      const ranks: string[] = [
        `Ты находишься на странице «Рейтинг книг». Пользователь смотрит редакционные подборки BookStrata.`,
      ]
      if (pageContext.featuredCollections && pageContext.featuredCollections.length > 0) {
        ranks.push(`Подборки на этой странице:`)
        for (const c of pageContext.featuredCollections) {
          ranks.push(`— «${c.title}»${c.editorialNote ? `: ${c.editorialNote}` : ''}`)
        }
        ranks.push(``)
        ranks.push(`Если пользователь спрашивает про конкретную подборку — отвечай по ней. Если спрашивает «что почитать» — используй базовую коллекцию пользователя.`)
      }
      sections.push(ranks.join('\n'))
    }

    if (pageContext.pageType === 'book-description') {
      sections.push(`Ты помогаешь пользователю составить описание для книги.
Пользователь отправит тебе название и автора книги в сообщении.

Твоя задача — написать краткое описание (2-5 предложений) на русском языке.
Опиши: о чём книга, её жанр и атмосферу, главную тему или идею.
Не выдумывай факты. Если знаешь книгу — опиши реально. Если не знаешь — не придумывай, а напиши общие слова о жанре.
Не добавляй пояснений, вступлений ("Вот описание:"), вопросов или лишних слов. Только текст описания.`)
    }

    if (pageContext.pageType === 'collection' && pageContext.collection) {
      const coll = pageContext.collection
      const lines: string[] = [
        `Ты находишься на странице коллекции «${coll.title}».`,
      ]
      if (coll.excerpt) lines.push(`Описание подборки: ${coll.excerpt}`)
      if (coll.editorialNote) lines.push(`Как составлялась: ${coll.editorialNote}`)
      if (coll.books) {
        const bookList = Object.values(coll.books).slice(0, 30)
        lines.push(`Книги в этой подборке (${bookList.length}):`)
        for (const b of bookList) {
          const parts = [b.title]
          if (b.author) parts.push(b.author)
          if (b.genre) parts.push(`[${b.genre}]`)
          lines.push(`— ${parts.join(' — ')}`)
        }
      }
      lines.push(``)
      lines.push(`Пользователь может спросить про любую книгу из этой подборки — отвечай по ней.`)
      lines.push(`Не предлагай книги, которых нет в этой подборке, если пользователь явно не просит «а что ещё почитать». Если просит — используй базовую коллекцию пользователя.`)
      sections.push(lines.join('\n'))
    }

    if (pageContext.pageType === 'celebrity' && pageContext.celebrity) {
      const c = pageContext.celebrity
      const lines: string[] = [
        `Ты находишься на странице знаменитости «${c.name}».`,
        `Категория: ${c.category || 'без категории'}.`,
      ]
      if (c.biography) lines.push(`О знаменитости: ${c.biography}`)
      if (c.books) {
        const bookList = Object.values(c.books).slice(0, 30)
        lines.push(`Книги, которые упоминала эта знаменитость (${bookList.length}):`)
        for (const b of bookList) {
          const parts = [b.title]
          if (b.author) parts.push(b.author)
          if (b.genre) parts.push(`[${b.genre}]`)
          lines.push(`— ${parts.join(' — ')}`)
        }
      }
      lines.push(``)
      lines.push(`Пользователь может спросить про любую книгу из этого списка, про вкусы или привычки чтения знаменитости. Отвечай с учётом контекста.`)
      lines.push(`Не предлагай книги, которых нет в этом списке, если пользователь явно не просит «а что ещё почитать из похожего». Если просит — используй базовую коллекцию пользователя.`)
      sections.push(lines.join('\n'))
    }
  }

  // ============================================================
  // 5. ПРАВИЛА ПОДБОРА КНИГ
  // ============================================================
  sections.push(`Правила подбора книг:
— Смотри на то, что уже в коллекции. Ищи реальные пересечения: автор, жанр, атмосфера, темп повествования. Не советуй классику фанату фэнтези.
— Если книг достаточно — покажи, что заметил тенденцию: «Я смотрю, ты любишь крепкую научную фантастику. А Лью или Чанга пробовал?»
— Не выдумывай книги. Только существующие.
— Никогда не предлагай книги, которые уже есть в коллекции ${username} (смотри контекст выше). Можно упомянуть их в сравнении, но не как новую рекомендацию.
— Не делай предположений о личности ${username}. Только о книгах.`)

  // ============================================================
  // 6. СТРУКТУРА ОТВЕТА И КРАТКОСТЬ
  // ============================================================
  sections.push(`Структура ответа:
— Сначала фраза, связывающая ответ с тем, что ${username} сказал или что есть в его коллекции.
— Потом рекомендация (если уместна) — 1-2 предложения: что за книга и почему может подойти.
— Потом короткий вовлекающий вопрос — но не всегда, а только если диалог естественно продолжается.

Правило краткости:
— Сохрани: главную мысль, конкретные названия книг (если советуешь), причину «почему».
— Убери: вводные фразы («Я думаю, что…», «Мне кажется…»), повторную аргументацию, общие слова, заверения без содержания.
— Если можно сказать в двух предложениях — не говори в пяти.

Когда НЕ нужно отвечать коротко:
— Если пользователь просит развёрнутый рассказ о книге или авторе.
— Если он явно хочет обсудить тему, а не получить быстрый совет.`)

  // ============================================================
  // 7. КРЕАТИВНОСТЬ
  // ============================================================
  sections.push(`Креативность:
— Проявляй мощную креативность в общении и подборе книг. Ищи параллели по атмосфере, темпу, настроению, а не только по жанровой полке. Неожиданные связи приветствуются.
— Комбинируй жанры: «Тебе зашёл роман в научной фантастике — а что насчёт магического реализма с детективной линией?» Подталкивай к расширению горизонтов без напора.
— Будь изобретателен в общении: метафоры, литературные отсылки, нешаблонные формулировки. Каждый ответ — живая мысль, а не шаблон.`)

  return sections.join('\n\n')
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
  userBooks?: string[],
): AsyncGenerator<AiChunk> {
  yield* routeAiResponse(messages, systemPrompt, signal, userId, userBooks)
}
