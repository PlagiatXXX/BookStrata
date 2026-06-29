import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import {
  createCollectionSchema,
  updateCollectionSchema,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "./collection.schema.js";

function slugify(text: string): string {
  const cyrillicToLatin: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
    и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  let slug = text
    .toLowerCase()
    .trim()
    .split("")
    .map((char) => cyrillicToLatin[char] || char)
    .join("")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  if (!slug) slug = `collection-${randomSuffix}`;
  // Add random suffix to ensure uniqueness
  slug = `${slug}-${randomSuffix}`;
  return slug;
}

type JsonValue = Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
function toJsonValue<T>(value: T | null | undefined): JsonValue {
  if (value == null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function validateCreateInput(input: unknown) {
  return createCollectionSchema.parse(input);
}

export async function validateUpdateInput(input: unknown) {
  return updateCollectionSchema.parse(input);
}

export async function getCollections(options?: {
  type?: string;
  categoryId?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;
  const skip = (page - 1) * pageSize;

  const where: Prisma.CollectionWhereInput = {};
  if (options?.type) where.type = options.type;
  if (options?.categoryId) where.categoryId = options.categoryId;
  if (options?.isPublished !== undefined) where.isPublished = options.isPublished;
  if (options?.isFeatured !== undefined) where.isFeatured = options.isFeatured;

  const [data, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      orderBy: { order: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.collection.count({ where }),
  ]);

  return {
    data,
    meta: {
      totalItems: total,
      itemCount: data.length,
      itemsPerPage: pageSize,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page,
    },
  };
}

export async function getCollectionBySlug(slug: string) {
  return prisma.collection.findUnique({ where: { slug } });
}

export async function getCollectionById(id: number) {
  return prisma.collection.findUnique({ where: { id } });
}

export async function createCollection(input: CreateCollectionInput) {
  const slug = slugify(input.title);

  return prisma.collection.create({
    data: {
      slug,
      title: input.title,
      type: input.type,
      content: input.content || null,
      excerpt: input.excerpt || null,
      categoryId: input.categoryId || null,
      coverImageUrl: input.coverImageUrl || "",
      bookCovers: input.bookCovers || [],
      tags: input.tags || [],
      isPublished: input.isPublished ?? false,
      isFeatured: input.isFeatured ?? false,
      order: input.order ?? 0,
      editorialNote: input.editorialNote || null,
      tiers: toJsonValue(input.tiers),
      tierOrder: input.tierOrder || [],
      books: toJsonValue(input.books),
      unrankedBookIds: input.unrankedBookIds || [],
    },
  });
}

export async function updateCollection(id: number, input: UpdateCollectionInput) {
  const data: Prisma.CollectionUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.type !== undefined) data.type = input.type;
  if (input.content !== undefined) data.content = input.content || null;
  if (input.excerpt !== undefined) data.excerpt = input.excerpt || null;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId || null;
  if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl || "";
  if (input.bookCovers !== undefined) data.bookCovers = input.bookCovers;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.isPublished !== undefined) data.isPublished = input.isPublished;
  if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
  if (input.order !== undefined) data.order = input.order;
  if (input.editorialNote !== undefined) data.editorialNote = input.editorialNote || null;
  if (input.tiers !== undefined) data.tiers = toJsonValue(input.tiers);
  if (input.tierOrder !== undefined) data.tierOrder = input.tierOrder;
  if (input.books !== undefined) data.books = toJsonValue(input.books);
  if (input.unrankedBookIds !== undefined) data.unrankedBookIds = input.unrankedBookIds;

  return prisma.collection.update({
    where: { id },
    data,
  });
}

export async function getCollectionBySlugAdmin(slug: string) {
  return prisma.collection.findUnique({ where: { slug } });
}

export async function deleteCollection(id: number) {
  return prisma.collection.delete({ where: { id } });
}

interface ParsedBook {
  title: string;
  author: string;
  coverImageUrl: string;
}

async function fetchBookCover(title: string, author: string): Promise<string> {
  // === Попытка 1: Open Library (быстро, часто находит англоязычные книги) ===
  try {
    const query = encodeURIComponent(`${title} ${author}`.trim());
    const resp = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=5`,
      { signal: AbortSignal.timeout(4_000) },
    );
    if (resp.ok) {
      const data = (await resp.json()) as { docs?: Array<{ cover_i?: number }> };
      if (data.docs?.length) {
        const withCover = data.docs.find(d => d.cover_i);
        if (withCover?.cover_i) {
          return `https://covers.openlibrary.org/b/id/${withCover.cover_i}-M.jpg`;
        }
      }
    }
  } catch {
    // fallback
  }

  // === Попытка 2: Google Books API ===
  const gbKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!gbKey) return "";

  const pickCover = (items: Array<{ volumeInfo?: { imageLinks?: Record<string, string> } }>): string => {
    for (const item of items) {
      const links = item.volumeInfo?.imageLinks;
      if (!links) continue;
      // Приоритет: large → medium → thumbnail
      const url = links.large || links.medium || links.thumbnail;
      if (url) {
        return url.replace("http:", "https:").replace("&edge=curl", "");
      }
    }
    return "";
  };

  const googleFetch = async (q: string): Promise<string> => {
    try {
      const resp = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&key=${gbKey}&maxResults=5`,
        { signal: AbortSignal.timeout(5_000) },
      );
      if (!resp.ok) return "";
      const d = await resp.json() as { items?: Array<{ volumeInfo?: { imageLinks?: Record<string, string> } }> };
      return d.items?.length ? pickCover(d.items) : "";
    } catch {
      return "";
    }
  };

  // 2a: точный поиск title + author
  const authorPart = author ? ` inauthor:${author}` : "";
  let cover = await googleFetch(`intitle:${title}${authorPart}`);
  if (cover) return cover;

  // 2b: широкий поиск — только title (как ручной поиск в редакторе)
  cover = await googleFetch(`intitle:${title}`);
  if (cover) return cover;

  // 2c: совсем широкий — title + author без префиксов (если автор не пуст)
  if (author) {
    cover = await googleFetch(`${title} ${author}`);
  }

  return cover;
}

export async function fetchCoversForBooks(
  books: { title: string; author: string }[],
): Promise<ParsedBook[]> {
  const results: ParsedBook[] = [];
  const concurrency = 3;
  for (let i = 0; i < books.length; i += concurrency) {
    const batch = books.slice(i, i + concurrency);
    const covers = await Promise.allSettled(
      batch.map(b => fetchBookCover(b.title, b.author)),
    );
    covers.forEach((result, j) => {
      const book = batch[j]!;
      results.push({
        title: book.title,
        author: book.author,
        coverImageUrl: result.status === "fulfilled" ? result.value : "",
      });
    });
  }
  return results;
}

const NOISE_WORDS = new Set([
  "подписка", "войти", "регистрация", "реклама", "контакты", "новости",
  "главная", "меню", "поиск", "назад", "вперёд", "страница", "сайт",
  "перейти", "читать далее", "подробнее", "загрузка", "комментарий",
  "лайвлиб", "сотрудничество", "поддержка", "livelib", "bookstrata",
  "оцените", "поделиться", "сохранить", "отзывы", "рецензии", "цитаты",
  "избранное", "прочитано", "хочет прочитать", "читает", "добавить",
  "редактировать", "удалить", "пожаловаться", "закрыть", "отмена",
  "продолжить", "сообщить", "настройки", "помощь", "правила",
  "конфиденциальность", "пользовательское соглашение", "cookies",
  "подпишитесь", "истории", "лайфхаки", "авторы", "издательства",
  "персонажи", "премии", "блоги", "рекомендации", "бесплатные книги",
  "рейтинги", "жанры", "лента", "мероприятия", "игры", "конкурсы",
  "книгообмен", "раздачи", "книжный вызов",
  // Wikipedia & wiki noise
  "править", "править код", "править вики-текст", "примечания", "ссылки",
  "литература", "источники", "смотреть также", "см. также", "сноски",
  "содержание", "оглавление", "навигация", "инструменты", "действия",
  "ещё", "поиск в википедии", "википедия", "статья", "обсуждение",
  "вклад", "создать учётную запись", "войти в систему",
]);

const NAV_PATTERNS = [
  /^(что почитать|рейтинг|топ|лучшие|список|рекомендации|подборк|новинки|обзор)/iu,
  /(перейти|читать|купить|скачать) (на сайт|в магазин|бесплатно|полностью)/iu,
  /^\d+ книг/iu, /загрузк|комментари|отзыв|рецензи/i,
  /^(введение|заключение|примечание|ссылки|источники|содержание|оглавление)/iu,
  /^(см\.? также|смотри также|приложение|сноски|литература)/iu,
  /^\d+\.\s*↑/, // Wikipedia reference links
  /^править(\s+код|\s+вики-текст)?$/i,
  /^(статья|обсуждение|чтение|просмотр|вклад|действия|ещё|навигация|инструменты)/iu,
  /списки:книги/i,
];

interface ScoredCandidate {
  text: string;
  score: number;
  /** Если true — не пытаться искать пару "название — автор" */
  noPair?: boolean;
  pairedAuthor?: string;
}

function isNoise(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.length < 4 || lower.length > 300) return true;
  if (NOISE_WORDS.has(lower)) return true;
  for (const pat of NAV_PATTERNS) if (pat.test(lower)) return true;
  // Если строка не содержит букв — шум
  if (!/[a-zа-яё]/iu.test(lower)) return true;
  return false;
}

export async function parseBooksFromUrl(url: string): Promise<ParsedBook[]> {
  const cheerio = await import("cheerio");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml",
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (fetchError) {
    throw new Error(
      `Не удалось загрузить страницу: ${fetchError instanceof Error ? fetchError.message : "таймаут или сетевой сбой"}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Сервер вернул ${response.status}${response.status === 503 ? " (сайт блокирует ботов)" : ""}`,
    );
  }

  const html = await response.text();

  // Проверяем, что HTML похож на человеческую страницу
  if (html.length < 500) {
    console.error(`[ParseURL] HTML too short: ${html.length} bytes for ${url}`);
    throw new Error(
      "Страница пустая или защищена от парсинга (Cloudflare, JS-рендеринг). Попробуйте другой источник.",
    );
  }

  let $: ReturnType<typeof cheerio.load>;
  try {
    $ = cheerio.load(html);
  } catch {
    throw new Error("Не удалось обработать HTML страницы");
  }

  // Удаляем заведомый мусор
  $("script, style, nav, header, footer, aside, iframe, noscript, svg, form, button, input, select, textarea").remove();
  $(':not(html):not(body)[class*="menu"], :not(html):not(body).sidebar, :not(html):not(body)[class*="sidebar"], :not(html):not(body)[class*="footer"], :not(html):not(body)[class*="comment"], :not(html):not(body)[class*="banner"], :not(html):not(body)[class*="advert"], :not(html):not(body)[class*="header__"], :not(html):not(body)[class*="site-header"], :not(html):not(body)[class*="page-header"], :not(html):not(body)[class*="main-header"]').remove();

  const candidates: ScoredCandidate[] = [];

  // === Стратегия 1: контентная область — все ссылки ===
  const $content = $("#mw-content-text, .mw-parser-output, #bodyContent, main, article, .content, .post-content, .entry-content").first();
  if ($content.length > 0) {
    $content.find("a[href]").each((_, el) => {
      const $a = $(el);
      const href = $a.attr("href") || "";
      const text = $a.text().trim();
      if (href.startsWith("#") || href.startsWith("javascript:")) return;
      if (text.length < 4 || text.length > 120) return;
      if (isNoise(text)) return;
      if (/^\d+$/.test(text)) return;
      candidates.push({ text, score: 1 });
    });
  }

  // === Стратегия 2: OL/LI с ссылками ===
  $("ol li, ul li").each((_, el) => {
    const $li = $(el);
    const links = $li.find("a");
    if (links.length === 0 && $li.find("img").length === 0) return;
    const text = $li.text().trim();
    if (isNoise(text)) return;
    const score = links.length * 3 + ($li.find("img").length > 0 ? 2 : 0);
    candidates.push({ text, score });
  });

  // === Стратегия 3: параграфы с " — " ===
  $("p").each((_, el) => {
    const text = $(el).text().trim();
    if (isNoise(text)) return;
    if (/[—–-]/.test(text) && text.length < 200) {
      candidates.push({ text, score: 2 });
    }
  });

  // === Стратегия 4: ссылки на книги с картинками (<img alt="Название" inside <a href="/book/show/...">) ===
  // Goodreads, Livelib и другие сайты с карточками книг
  $('a[href*="/book/show/"], a[href*="/book/"], a[href*="book"]').each((_, el) => {
    const $a = $(el);
    const $img = $a.find("img[alt]").first();
    const altText = $img.attr("alt")?.trim();
    if (!altText || altText.length < 3 || altText.length > 150) return;
    if (isNoise(altText)) return;
    if (/^\d+$/.test(altText)) return;
    // Пропускаем, если текст ссылки уже есть (не дублировать со стратегией 1)
    const linkText = $a.text().trim();
    if (linkText.length >= 4 && linkText === altText) return;
    // Высокий скор — картинка + ссылка на книгу = почти наверняка книга
    candidates.push({ text: altText, score: 5, noPair: true });
  });

  // === Стратегия 5: карточки товаров (Читай-город и др.) ===
  // Структура: <div class="article-product-card ..."> с автором и названием в дочерних элементах
  // Селектор: класс содержит "article-product-card" НО не содержит "__" (только внешние контейнеры)
  $('div[class*="article-product-card"]').filter((_, el) => {
    const cls = $(el).attr("class") || "";
    return !cls.includes("__");
  }).each((_, el) => {
    const $card = $(el);
    const $titleEl = $card.find('.article-product-card__title, [class*="product-card"] [class*="title"]').first();
    const $authorEl = $card.find('.article-product-card__author, [class*="product-card"] [class*="author"]').first();
    const $img = $card.find('img[alt]').first();

    const title = $titleEl.text().trim() || $img.attr("alt")?.trim() || "";
    const author = $authorEl.text().trim() || "";

    if (!title || title.length < 3 || title.length > 150) return;
    if (isNoise(title)) return;
    if (/^\d+$/.test(title)) return;

    candidates.push({ text: title, score: 5, noPair: true, pairedAuthor: author });
  });

  // === Делим на пары (название → автор) ===
  const pairs: { title: string; author: string }[] = [];
  const noPairItems: { title: string; author: string }[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const cur = candidates[i]!;
    // noPair идут напрямую в результат (с автором, если известен)
    if (cur.noPair) {
      noPairItems.push({ title: cur.text, author: cur.pairedAuthor || "" });
      continue;
    }
    const next = candidates[i + 1];
    // Если это пара: строка похожа на автора (ФИО), а предыдущая — название
    if (
      next &&
      !next.noPair &&
      /^[A-ZА-Я][a-zа-яё]+\s+[A-ZА-Я][a-zа-яё]+/.test(next.text) &&
      next.text.length < 50 &&
      cur.text.length > 3 &&
      !/[—–-]/.test(cur.text) &&
      !/^[A-ZА-Я][a-zа-яё]+\s+[A-ZА-Я]/.test(cur.text)
    ) {
      pairs.push({ title: cur.text, author: next.text });
      i++;
    }
  }

  // Если у нас есть надёжные книги из карточек (noPair) — используем их как основной источник
  // Иначе — пары или одиночные
  const useImgCards = noPairItems.length >= 3;
  const regularItems = useImgCards
    ? []
    : pairs.length >= 3
      ? pairs
      : candidates.filter(c => !c.noPair).map(c => ({ title: c.text, author: "" }));
  const rawItems = useImgCards ? noPairItems : [...regularItems, ...noPairItems];

  // === Финальная обработка ===
  const seen = new Set<string>();
  const books: ParsedBook[] = [];

  for (const item of rawItems) {
    if (books.length >= 100) break;

    let title = item.title;
    let author = item.author;

    // Если автор не найден — пробуем вытащить из "Название — Автор"
    if (!author) {
      const m = title.match(/^[«"“]?(.+?)[»"”]?\s*[—–\-—‑]\s*(.+)$/);
      if (m?.[1] && m[2]) {
        const maybeAuthor = m[2].trim();
        if (maybeAuthor.length < 50 && !/\d/.test(maybeAuthor)) {
          title = m[1].trim();
          author = maybeAuthor;
        }
      }
    }

    // Обратный порядок: "Автор. Название"
    if (!author) {
      const m = title.match(/^([A-ZА-Я][a-zа-яё]+\s+[A-ZА-Я][a-zа-яё]+)\.\s+(.+)$/);
      if (m?.[1] && m[2]) {
        author = m[1].trim();
        title = m[2].trim();
      }
    }

    // Финальная чистка
    title = title.replace(/\s+/g, " ").replace(/["«»„“”“\u00AB\u00BB]/g, "").trim();
    title = title.replace(/^\d+[.)]\s*/, "").trim();
    // Убираем ценники: "379 ₽ 462 ₽-18%" → ""
    title = title.replace(/\d+\s*[₽$€]\s*(\d+\s*[₽$€])?(\s*[-+]\d+%)?/g, "").trim();
    // Убираем тип обложки: "Мягкая обложка", "Твердый переплет"
    title = title.replace(/\b(Мягкая|Твердый|Твёрдый)\s+обложк[аи]\b/gi, "").trim();
    // Убираем "(илл. ...)", "(ил. ...)" и "[англ.]" и "(#N)"
    title = title.replace(/\([^)]*илл?[^)]*\)/gi, "").trim();
    title = title.replace(/\[[^\]]*\]/g, "").trim();
    title = title.replace(/\(#\d+\)/g, "").trim();
    // Убираем "комплект из N книг", "в подарочном оформлении"
    title = title.replace(/\(?комплект\s+из\s+\d+[^)]*\)?/gi, "").trim();
    title = title.replace(/\(?в\s+подарочном\s+оформлении\)?/gi, "").trim();
    // Убираем "подарочная трилогия", "подарочное издание", "формат клатчбук" и т.п.
    title = title.replace(/\([^)]*(?:подарочн|формат|эксклюзивн|мини|клатчбук|ночное|подарочное\s+оформление|подарочная)[^)]*\)/gi, "").trim();
    title = title.replace(/\(?подарочн[а-я]+\s+(?:издание|трилоги[ию]|оформление)\)?/gi, "").trim();
    // Убираем "Том N", "Вып. N"
    title = title.replace(/\b[Тт]ом\s+\d+/g, "").trim();
    title = title.replace(/\b[Вв]ып\.?\s*\d+/g, "").trim();
    // Убираем переплёт/обложку в конце строки
    title = title.replace(/(Мягкая|Твердый|Твёрдый)\s+(обложк[аи]|переплет[а-я]*)$/gi, "").trim();
    title = title.replace(/\s+(Мягкая|Твердый|Твёрдый)\s+(обложк[аи]|переплет[а-я]*)$/gi, "").trim();
    // Убираем лишние пробелы
    title = title.replace(/\s{2,}/g, " ").trim();
    author = author.replace(/\s+/g, " ").trim();

    const key = `${title}|${author}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (title.length >= 2 && !isNoise(title)) {
      books.push({ title, author, coverImageUrl: "" });
    }
  }

  return books;
}

export async function togglePublish(id: number) {
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) throw new Error("Collection not found");

  return prisma.collection.update({
    where: { id },
    data: { isPublished: !collection.isPublished },
  });
}
