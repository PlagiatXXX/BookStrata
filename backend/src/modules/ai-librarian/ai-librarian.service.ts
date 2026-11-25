import type { PrismaClient } from '@prisma/client'
import { routeAiResponse, checkAllProvidersStatus } from './router.js'
import type { TierListRoastRequest, TierListRoastResponse } from './ai-librarian.schema.js'
import { TierListRoastResponseSchema } from './ai-librarian.schema.js'


export interface TasteBook {
  title: string
  author: string | null
  tierName: string
  tierListTitle: string
}

export interface TasteDnaSlice {
  archetypeName: string
  axes: {
    storyFocus: number
    emotionalWeight: number
    pace: number
    darkness: number
    scope: number
    complexity: number
  }
  likedGenres: string[]
  dislikedGenres: string[]
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
  dna: TasteDnaSlice | null
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

export interface ReadingDnaPageContext {
  ticketNumber: string
  customName?: string | null
  archetypeName: string
  casteName?: string | null
  motto: string | null
  storyFocus: number
  emotionalWeight: number
  pace: number
  darkness: number
  scope: number
  complexity: number
  favoriteBooks: Array<{ title: string; author?: string | null }>
  kryptoniteBook?: { title: string; author?: string | null } | null
}

export interface TierListPageTierContext {
  title: string
  books: Array<{ title: string; author?: string | null }>
}

export interface TierListPageContext {
  title: string
  description?: string | null
  tiers: TierListPageTierContext[]
  unrankedBooks: Array<{ title: string; author?: string | null }>
}

export interface PageContext {
  pageType: 'rankings' | 'collection' | 'book-description' | 'celebrity' | 'reading-dna' | 'tier-list'
  collection?: CollectionContext
  celebrity?: CelebrityContext
  featuredCollections?: Array<{ title: string; slug: string; editorialNote: string | null }>
  readingDna?: ReadingDnaPageContext
  tierList?: TierListPageContext
}

export interface TasteProfileOptions {
  includeDna?: boolean
}

export async function getUserTasteProfile(
  userId: number,
  prisma: PrismaClient,
  options?: TasteProfileOptions,
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

  const includeDna = options?.includeDna ?? true
  const dnaRecord = includeDna
    ? await prisma.readingDna.findUnique({ where: { userId } })
    : null
  const dna: TasteDnaSlice | null = dnaRecord
    ? {
        archetypeName: dnaRecord.archetypeName,
        axes: {
          storyFocus: dnaRecord.storyFocus,
          emotionalWeight: dnaRecord.emotionalWeight,
          pace: dnaRecord.pace,
          darkness: dnaRecord.darkness,
          scope: dnaRecord.scope,
          complexity: dnaRecord.complexity,
        },
        likedGenres: dnaRecord.likedGenres,
        dislikedGenres: dnaRecord.dislikedGenres,
      }
    : null

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
    dna,
  }
}

function formatContextBook(b: CollectionBookContext): string {
  const parts = [b.title]
  if (b.author) parts.push(b.author)
  if (b.genre) parts.push(`[${b.genre}]`)
  return parts.join(' — ')
}

function appendTieredOrFlatBooks(
  lines: string[],
  headerLabel: string,
  tierOrder?: string[],
  tiers?: Record<string, { title: string; bookIds: string[] }>,
  books?: Record<string, CollectionBookContext>,
): void {
  if (!books) return
  const entries = Object.entries(books)
  if (entries.length === 0) return

  const seenIds = new Set<string>()
  const tierLines: string[] = []

  if (tiers && Object.keys(tiers).length > 0) {
    const orderedIds = tierOrder && tierOrder.length > 0 ? tierOrder : Object.keys(tiers)
    for (const tierId of orderedIds) {
      const tier = tiers[tierId]
      if (!tier || !Array.isArray(tier.bookIds) || tier.bookIds.length === 0) continue
      const formatted: string[] = []
      for (const bookId of tier.bookIds) {
        if (seenIds.size >= 35) break
        const book = books[bookId]
        if (!book) continue
        seenIds.add(bookId)
        formatted.push(formatContextBook(book))
      }
      if (formatted.length > 0) {
        tierLines.push(`— Тир «${tier.title}»: ${formatted.join('; ')}`)
      }
    }
  }

  const remaining = entries
    .filter(([id]) => !seenIds.has(id))
    .slice(0, Math.max(0, 35 - seenIds.size))
    .map(([, book]) => `— ${formatContextBook(book)}`)

  const totalCount = Math.min(entries.length, 35)
  lines.push(`${headerLabel} (${totalCount}):`)
  lines.push(...tierLines)
  if (tierLines.length > 0 && remaining.length > 0) {
    lines.push(`Прочие книги в списке:`)
  }
  lines.push(...remaining)
}

export function buildSystemPrompt(profile: TasteProfile, username: string, pageContext?: PageContext): string {
  // Для генерации описания книги — минимальный промпт без контекста пользователя,
  // личности AI-библиотекаря и правил общения. Только инструкция по написанию описания.
  if (pageContext?.pageType === 'book-description') {
    return `Твоя задача — написать краткое описание для книги на русском языке (2-5 предложений).
Опиши: о чём книга, её жанр и атмосферу, главную тему или идею.
Не выдумывай факты. Если знаешь книгу — опиши реально. Если не знаешь — не придумывай, а напиши общие слова о жанре.
Не добавляй пояснений, вступлений, вопросов, рекомендаций или лишних слов. Только текст описания.
Никакого маркдауна, списков, звёздочек, жирного шрифта, эмодзи.`
  }

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
  // 3. КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ (имя + профиль в рамках режима страницы)
  // ============================================================
  const isTierListPage = pageContext?.pageType === 'tier-list'
  const isCollectionPage = pageContext?.pageType === 'collection' && Boolean(pageContext.collection)
  const isCelebrityPage = pageContext?.pageType === 'celebrity' && Boolean(pageContext.celebrity)
  const isDnaPage = pageContext?.pageType === 'reading-dna' && Boolean(pageContext.readingDna)
  const isScopedListPage = (isTierListPage && Boolean(pageContext?.tierList)) || isCollectionPage || isCelebrityPage

  const ctx: string[] = []
  ctx.push(`Имя собеседника (пользователя): ${username}.`)

  if (isTierListPage && pageContext?.tierList) {
    ctx.push(`Контекст пользователя на этой странице ограничен текущим тир-листом «${pageContext.tierList.title}».`)
  } else if (isCollectionPage && pageContext?.collection) {
    ctx.push(`Контекст пользователя на этой странице ограничен подборкой «${pageContext.collection.title}».`)
  } else if (isCelebrityPage && pageContext?.celebrity) {
    ctx.push(`Контекст пользователя на этой странице ограничен страницей знаменитости «${pageContext.celebrity.name}».`)
  } else if (isDnaPage) {
    // На странице билета ДНК личный профиль не дублируем; из тир-листов передаём лишь список уже добавленных книг (анти-дубль)
    const knownTitles = Array.from(
      new Set([
        ...profile.topBooks,
        ...profile.midBooks,
        ...profile.lowBooks,
        ...profile.unrankedBooks,
      ].map((b) => (b.author ? `«${b.title}» (${b.author})` : `«${b.title}»`))),
    ).slice(0, 30)
    if (knownTitles.length > 0) {
      ctx.push(`Уже есть в тир-листах пользователя (не предлагай повторно как новые рекомендации): ${knownTitles.join(', ')}.`)
    }
  } else {
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

    if (profile.dna && !isScopedListPage && !isTierListPage) {
      const { archetypeName, axes, likedGenres, dislikedGenres } = profile.dna
      const axesStr = `сюжет/рефлексия ${axes.storyFocus}, лёгкость/тяжесть ${axes.emotionalWeight}, темп ${axes.pace}, светло/мрачно ${axes.darkness}, камерно/эпично ${axes.scope}, просто/сложно ${axes.complexity}`
      const likedStr = likedGenres.length > 0 ? ` Любимые жанры: ${likedGenres.join(', ')}.` : ''
      const dislikedStr = dislikedGenres.length > 0 ? ` Неприязненные жанры: ${dislikedGenres.join(', ')}.` : ''
      ctx.push(`— Читательский ДНК: архетип «${archetypeName}». Оси восприятия: ${axesStr}.${likedStr}${dislikedStr}`)
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

    if (pageContext.pageType === 'collection' && pageContext.collection) {
      const coll = pageContext.collection
      const lines: string[] = [
        `Ты находишься на странице коллекции «${coll.title}».`,
      ]
      if (coll.excerpt) lines.push(`Описание подборки: ${coll.excerpt}`)
      if (coll.editorialNote) lines.push(`Как составлялась: ${coll.editorialNote}`)
      appendTieredOrFlatBooks(lines, `Книги в этой подборке`, coll.tierOrder, coll.tiers, coll.books)
      lines.push(``)
      lines.push(`ОГРАНИЧЕНИЕ КОНТЕКСТА НА СТРАНИЦЕ КОЛЛЕКЦИИ:`)
      lines.push(`— Отвечай по книгам из этой подборки, их месту в тирах и логике составления коллекции.`)
      lines.push(`— Не предлагай книги, которых нет в этой подборке. Если пользователь просит персональные рекомендации под личный вкус или с учётом Книжного ДНК — вежливо объясни, что здесь ты обсуждаешь только книги из этой подборки, а персональный подбор доступен в личном кабинете или на странице читательского билета («Книжный ДНК»).`)
      sections.push(lines.join('\n'))
    }

    if (pageContext.pageType === 'celebrity' && pageContext.celebrity) {
      const c = pageContext.celebrity
      const lines: string[] = [
        `Ты находишься на странице знаменитости «${c.name}».`,
        `Категория: ${c.category || 'без категории'}.`,
      ]
      if (c.biography) lines.push(`О знаменитости: ${c.biography}`)
      appendTieredOrFlatBooks(lines, `Книги, которые упоминала эта знаменитость`, c.tierOrder, c.tiers, c.books)
      lines.push(``)
      lines.push(`ОГРАНИЧЕНИЕ КОНТЕКСТА НА СТРАНИЦЕ ЗНАМЕНИТОСТИ:`)
      lines.push(`— Обсуждай только эту знаменитость, её читательские вкусы и книги из её списка (учитывая их распределение по тирам).`)
      lines.push(`— Не предлагай книги, которых нет в списке этой знаменитости. Если пользователь просит персональные рекомендации «под мой вкус» или с учётом его Книжного ДНК — вежливо объясни, что здесь ты обсуждаешь только вкусы и книги ${c.name}, а персональный подбор по ДНК или коллекции пользователя доступен на странице читательского билета («Книжный ДНК») или в личном кабинете.`)
      sections.push(lines.join('\n'))
    }

    if (pageContext.pageType === 'reading-dna' && pageContext.readingDna) {
      const dna = pageContext.readingDna
      const lines: string[] = [
        `Ты находишься в режиме анализа Книжного ДНК (читательский билет № ${dna.ticketNumber}).`,
      ]
      if (dna.customName) {
        lines.push(`Имя на читательском билете: ${dna.customName}.`)
      }
      if (dna.casteName) {
        lines.push(`Орден читателя: ${dna.casteName}.`)
      }
      lines.push(
        `Читательский архетип: «${dna.archetypeName}»${dna.motto ? ` (девиз: «${dna.motto.replace(/^[«"']+|[»"']+$/g, '')}»)` : ''}.`,
        `Оси вкуса (шкала 0–100):`,
        `— Сюжет vs Рефлексия: ${dna.storyFocus} (0 — стремительный сюжет и драйв, 100 — глубокая рефлексия и философия)`,
        `— Эмоциональный вес: ${dna.emotionalWeight} (0 — легко, чтение для отдыха, 100 — эмоционально тяжело и глубоко)`,
        `— Темп чтения: ${dna.pace} (0 — быстро, книга за вечер, 100 — неспешное глубокое погружение)`,
        `— Свет vs Мрак: ${dna.darkness} (0 — тепло, надежда и свет, 100 — мрак, тревога и тьма)`,
        `— Масштаб мира: ${dna.scope} (0 — камерная история, 100 — масштабный эпик, миры и века)`,
        `— Сложность слога: ${dna.complexity} (0 — ясный доступный слог, 100 — многослойная сложная проза)`,
      )

      if (dna.favoriteBooks && dna.favoriteBooks.length > 0) {
        lines.push(`Священные книги читателя (топ-3):`)
        for (const b of dna.favoriteBooks) {
          lines.push(`— «${b.title}»${b.author ? ` (${b.author})` : ''}`)
        }
      }

      if (dna.kryptoniteBook) {
        const k = dna.kryptoniteBook
        lines.push(``)
        lines.push(`КНИГА-КРИПТОНИТ (ИММУНИТЕТ ЧИТАТЕЛЯ): «${k.title}»${k.author ? ` (${k.author})` : ''}.`)
        lines.push(`СТРОЖАЙШИЙ ЗАПРЕТ: Категорически запрещено рекомендовать читателю эту книгу, а также книги того же автора или близкие по манере и стилю произведения, которые читатель терпеть не может! Если читатель спрашивает про криптонит — объясни, почему эта книга могла ему не зайти, и предложи диаметрально противоположные или более подходящие по осям альтернативы.`)
      }

      lines.push(``)
      lines.push(`На этой странице обсуждай Книжный ДНК этого билета: орден, архетип, баланс 6 осей, священные книги и криптонит, и подбирай книги строго под эти параметры (не повторяя книги из тир-листов и священные книги). Если пользователь просит разобрать конкретный его тир-лист целиком — вежливо предложи открыть чат на странице этого тир-листа.`)
      sections.push(lines.join('\n'))
    }

    if (pageContext.pageType === 'tier-list') {
      const tl = pageContext.tierList
      const lines: string[] = [
        tl
          ? `Ты находишься на странице тир-листа «${tl.title}».`
          : `Ты находишься на странице создания или редактирования тир-листа.`,
      ]
      if (tl?.description) {
        lines.push(`Описание тир-листа: ${tl.description}`)
      }
      if (tl) {
        const hasAnyBooks =
          tl.tiers.some((t) => t.books.length > 0) || tl.unrankedBooks.length > 0
        if (hasAnyBooks) {
          lines.push(`Книги в этом тир-листе:`)
          for (const tier of tl.tiers) {
            if (tier.books.length === 0) continue
            const formatted = tier.books
              .slice(0, 20)
              .map((b) => `«${b.title}»${b.author ? ` (${b.author})` : ''}`)
              .join(', ')
            lines.push(`— Тир ${tier.title}: ${formatted}`)
          }
          if (tl.unrankedBooks.length > 0) {
            const formattedUnranked = tl.unrankedBooks
              .slice(0, 20)
              .map((b) => `«${b.title}»${b.author ? ` (${b.author})` : ''}`)
              .join(', ')
            lines.push(`— Без тира (нераспределённые): ${formattedUnranked}`)
          }
        } else {
          lines.push(`В этом тир-листе пока нет книг.`)
        }
      }

      lines.push(``)
      lines.push(`ОГРАНИЧЕНИЕ КОНТЕКСТА НА СТРАНИЦЕ ТИР-ЛИСТА:`)
      lines.push(`— Здесь ты можешь обсуждать и советовать книги ТОЛЬКО опираясь на книги внутри этого тир-листа (расстановку по тирам, оценки и похожие варианты к этим книгам).`)
      lines.push(`— СТРОГИЙ ЗАПРЕТ НА КНИЖНЫЙ ДНК: На странице тир-листа ты НЕ работаешь с Книжным ДНК и не имеешь к нему доступа. Если пользователь просит посоветовать книгу с учётом его Книжного ДНК, разобрать архетип, 6 осей вкуса, криптонит или читательский билет — НЕ подбирай книги под ДНК и не угадывай его параметры. Вежливо дай понять, что здесь ты можешь обсудить только книги в этом тир-листе, а обсуждать Книжный ДНК и подбирать книги по нему можно на странице читательского билета в разделе «Книжный ДНК».`)
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
— Не уверен в точном названии книги или авторе (в том числе в русском переводе) — скажи об этом прямо, не подставляй выдуманное название.
— Не повторяй книги, которые уже назвал в этом диалоге (история переписки перед тобой). На «дай ещё варианты» — предлагай новые.
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

export async function checkAiStatus(): Promise<{
  online: boolean
  model: string | null
  providers: Array<{ name: string; online: boolean; model: string | null; error?: string }>
}> {
  const status = await checkAllProvidersStatus()
  return { online: status.online, model: status.activeModel, providers: status.providers }
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

export function buildTierListRoastPrompt(input: TierListRoastRequest): string {
  const parts: string[] = []
  parts.push(`Название тир-листа: "${input.tierListTitle}"`)
  if (input.tierListDescription?.trim()) {
    parts.push(`Описание от автора: "${input.tierListDescription.trim()}"`)
  }
  parts.push('\nРаспределение книг по тирам:')
  for (const tier of input.tiers) {
    if (tier.books.length === 0) continue
    const booksList = tier.books
      .map((b) => (b.author ? `«${b.title}» (${b.author})` : `«${b.title}»`))
      .join(', ')
    parts.push(`- Тир ${tier.label}: ${booksList}`)
  }
  return parts.join('\n')
}

export const TIER_LIST_ROAST_SYSTEM_PROMPT = `Ты — Букстраж в режиме «Литературная прожарка» (Roast). Твой образ: остроумный, начитанный, ироничный литературный критик с тонким вкусом.

Твоя задача — сделать меткий, сатирический разбор расстановки книг в тир-листе пользователя.

Ключевые правила:
1. ЮМОР ЧЕРЕЗ ИЕРАРХИЮ РАССТАНОВКИ: Главный объект прожарки — это контраст между тирами. Почему одни книги вознесены в «Шедевры» (S/A), а другие сброшены в «Средне» или «Дно» (C/D)? Высмеивай парадоксы вкуса, снобизм, любовь к драме или, наоборот, тягу к попсовым клише.
2. ЕСЛИ У КНИГ НЕТ АВТОРОВ ИЛИ СТРАННЫЕ НАЗВАНИЯ: Ни в коем случае НЕ шути про отсутствие авторов, амнезию, плохую память или неполные данные. Воспринимай каждое название книги как самостоятельное законченное произведение и шути строго по СУТИ названий, жанровому контрасту и смелости расстановки.
3. ЧЁТКИЙ И ПОНЯТНЫЙ ЯЗЫК: Пиши остроумно, легко и естественно на хорошем русском языке. Избегай громоздких заумных фраз и витиеватых абстрактных метафор. Шутка должна быть понятна читателю с первого взгляда.
4. БЕЗ ОСКОРБЛЕНИЙ: Никакого мата, оскорблений личности, возраста или внешности. Высмеивай только литературные претензии и читательский выбор.
5. БЕЗ ВНЕШНИХ КАВЫЧЕК: Не оборачивай весь текст полей "roast", "hotTake" или "archetype" в кавычки — пиши чистый текст.
6. СТРОГИЙ ФОРМАТ JSON: Ответ должен быть строго в формате JSON без markdown-тегов и постороннего текста:
{
  "archetype": "Короткий ироничный читательский диагноз (2-4 слова, например: 'Литературный мазохист в поисках драмы')",
  "roast": "Едкий, саркастичный, но остроумный разбор расстановки тир-листа (40-70 слов, максимум 3 предложения)",
  "hotTake": "Главный грех/скандал этого тир-листа — самое спорное или возмутительное решение по распределению книги (1-2 предложения)",
  "cynicismScore": 75
}`

function cleanQuotes(str?: string | null): string {
  if (!str) return ''
  return str.trim().replace(/^["'«\s]+/, '').replace(/["'»\s]+$/, '').trim()
}

export function parseTierListRoastResponse(rawText: string): TierListRoastResponse {
  let cleaned = rawText.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
  }

  try {
    const parsed = JSON.parse(cleaned)
    const validated = TierListRoastResponseSchema.safeParse(parsed)
    if (validated.success) {
      return {
        ...validated.data,
        archetype: cleanQuotes(validated.data.archetype),
        roast: cleanQuotes(validated.data.roast),
        hotTake: cleanQuotes(validated.data.hotTake),
      }
    }
  } catch {
    // Игнорируем ошибку JSON-парсинга и переходим к фолбэку
  }

  return {
    archetype: 'Непостижимый эстет',
    roast: cleanQuotes(cleaned.slice(0, 300)) || 'Ваш тир-лист вызвал у ИИ-библиотекаря глубокое экзистенциальное замешательство.',
    hotTake: 'Расстановка настолько парадоксальна, что ломает даже нейросети.',
    cynicismScore: 70,
  }
}

export async function generateTierListRoast(
  input: TierListRoastRequest,
  userId?: string,
): Promise<TierListRoastResponse> {
  const userPrompt = buildTierListRoastPrompt(input)
  const messages = [{ role: 'user', content: userPrompt }]

  let fullResponse = ''
  for await (const chunk of routeAiResponse(
    messages,
    TIER_LIST_ROAST_SYSTEM_PROMPT,
    undefined,
    userId,
    undefined,
    { preferredProvider: 'deepseek' },
  )) {
    if (!chunk.done && chunk.content) {
      fullResponse += chunk.content
    }
  }

  return parseTierListRoastResponse(fullResponse)
}

