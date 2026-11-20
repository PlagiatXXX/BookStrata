/**
 * Скрипт автоматической разметки возрастного ценза (ageRating) для книг.
 * Анализирует официальные маркировки 436-ФЗ в аннотации, жанры, теги,
 * Google Books API (maturityRating: "MATURE") и опционально LLM/AI.
 *
 * Полностью автономен — работает как в dev, так и в slim Docker-контейнере.
 *
 * Запуск:
 *   cd backend && npx tsx scripts/backfill-age-ratings.ts
 * Опции:
 *   --dry-run   (только вывод в консоль, без записи в БД)
 *   --limit=100 (ограничение количества обрабатываемых книг)
 *   --all       (обрабатывать даже книги, у которых уже стоит ageRating)
 *   --ai        (использовать LLM/AI для книг, не распознанных по метаданным)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AgeRatingResult {
  rating: "0+" | "6+" | "12+" | "16+" | "18+";
  reason: string;
}

const VALID_RATINGS = new Set(["0+", "6+", "12+", "16+", "18+"]);

/**
 * Извлекает прямую маркировку 436-ФЗ из текста (аннотации или тегов).
 */
export function extractDirectAgeMarking(text: string | null | undefined): AgeRatingResult | null {
  if (!text) return null;

  // 1. Нецензурная брань / ненормативная лексика — строго 18+ по 436-ФЗ
  if (/(?:содержит|включает|присутствует)\s+(?:нецензурную\s+брань|ненормативную\s+лексику)/i.test(text)) {
    return { rating: "18+", reason: "нецензурная брань (436-ФЗ)" };
  }

  // 2. Строгие формулировки 18+
  if (/(?:не\s+рекомендуется\s+лицам\s+до\s*18|только\s+для\s+совершеннолетних|строго\s*18\+)/i.test(text)) {
    return { rating: "18+", reason: "маркировка 18+" };
  }

  // 3. Формулировки: «Возрастное ограничение: 16+», «Маркировка: 18+», «Знак информационной продукции: 12+»
  const officialMatch = text.match(
    /(?:возрастное\s+ограничение|возрастной\s+ценз|маркировка|знак\s+информационной\s+продукции)[:\s]*(18\+|16\+|12\+|6\+|0\+)/i,
  );
  if (officialMatch && officialMatch[1]) {
    const raw = officialMatch[1].toUpperCase() as AgeRatingResult["rating"];
    if (VALID_RATINGS.has(raw)) {
      return { rating: raw, reason: `маркировка ${raw}` };
    }
  }

  // 4. Формулировки: «для читателей старше 18 лет», «для детей старше 12 лет»
  const readersMatch = text.match(/(?:для\s+(?:читателей|детей)?\s*(?:старше|от))\s*(18|16|12|6)\s*(?:лет|\+)/i);
  if (readersMatch && readersMatch[1]) {
    const num = readersMatch[1];
    const targetRating = `${num}+` as AgeRatingResult["rating"];
    const label = Number(num) >= 16 ? "лиц" : "детей";
    return { rating: targetRating, reason: `для ${label} старше ${num} лет` };
  }

  // 5. Отдельно стоящие бейджи: [18+], (16+), или 18+ отдельным токеном
  const standaloneMatch = text.match(/(?:^|[([\s\n.,;])(18\+|16\+|12\+|6\+|0\+)(?=[)\]\s\n.,;]|$)/i);
  if (standaloneMatch && standaloneMatch[1]) {
    const raw = standaloneMatch[1].toUpperCase() as AgeRatingResult["rating"];
    if (VALID_RATINGS.has(raw)) {
      return { rating: raw, reason: `маркировка ${raw}` };
    }
  }

  return null;
}

const sortByLengthDesc = (arr: string[]) => [...arr].sort((a, b) => b.length - a.length);

const ADULT_KEYWORDS = sortByLengthDesc([
  "эротика",
  "erotica",
  "эротический роман",
  "эротическая проза",
  "dark romance",
  "дарк романс",
  "дарк-романс",
  "тёмная романтика",
  "темная романтика",
  "сплаттерпанк",
  "splatterpunk",
  "боди-хоррор",
  "body horror",
  "хентай",
  "hentai",
  "порнография",
  "бдсм",
  "bdsm",
  "adult fiction",
  "откровенные сцены",
  "постельные сцены",
  "сцены насилия",
  "буллинг",
  "абьюз",
]);

const MATURE_16_GENRES_AND_TAGS = sortByLengthDesc([
  "триллер",
  "психологический триллер",
  "детектив",
  "ужасы",
  "хоррор",
  "мистика",
  "темное фэнтези",
  "дарк фэнтези",
  "криминальный роман",
  "боевик",
  "new adult",
  "young adult",
  "янг эдалт",
  "ya-романтика",
  "ya-фэнтези",
  "молодёжная литература",
  "современная зарубежная проза",
  "современная проза",
  "зарубежная проза",
  "современный роман",
  "любовный роман",
  "современный любовный роман",
  "романтическая проза",
  "антиутопия",
  "киберпанк",
  "психологический роман",
  "драма",
  "психология отношений",
  "true crime",
]);

const CHILD_0_GENRES_AND_TAGS = sortByLengthDesc([
  "детские книги",
  "детская литература",
  "для самых маленьких",
  "для малышей",
  "сказки для малышей",
  "книжка-картинка",
  "книжка-малышка",
  "стихи для детей",
  "сказки",
]);

const CHILD_6_GENRES_AND_TAGS = sortByLengthDesc([
  "детские приключения",
  "детская фантастика",
  "для начальной школы",
  "младший школьный возраст",
  "младшие школьники",
]);

const TEEN_12_GENRES_AND_TAGS = sortByLengthDesc([
  "young adult",
  "подростковая литература",
  "для подростков",
  "подростковое фэнтези",
  "ya фэнтези",
  "детский детектив",
]);

const ADULT_AUTHORS = sortByLengthDesc([
  "стивен кинг",
  "stephen king",
  "ричард бахман",
  "richard bachman",
  "чак паланик",
  "chuck palahniuk",
  "чарльз буковски",
  "charles bukowski",
  "ирвин уэлш",
  "irvine welsh",
  "клайв баркер",
  "clive barker",
  "владимир сорокин",
  "эдуард лимонов",
  "маркиз де сад",
  "поппи брайт",
  "пенелопа дуглас",
  "penelope douglas",
  "ана хуан",
  "ana huang",
]);

/**
 * Детектирует возрастной ценз по метаданным (аннотация, жанр, теги).
 */
export function detectAgeRatingFromMetadata(book: {
  author?: string | null;
  genre?: string | null;
  tags?: string[];
  description?: string | null;
}): AgeRatingResult | null {
  const { author, genre, tags = [], description } = book;

  // Шаг 1. Прямая маркировка в описании или в тегах
  if (description) {
    const directFromDesc = extractDirectAgeMarking(description);
    if (directFromDesc) return directFromDesc;
  }

  for (const tag of tags) {
    const directFromTag = extractDirectAgeMarking(tag);
    if (directFromTag) return directFromTag;
  }

  const authorLower = author?.toLowerCase() ?? "";
  const tagList = tags.map((t) => t.toLowerCase());
  const genreLower = genre?.toLowerCase() ?? "";
  const descLower = description?.toLowerCase() ?? "";

  // Шаг 2. Авторы взрослой литературы 18+ (Стивен Кинг, Паланик, Буковски и др.)
  for (const a of ADULT_AUTHORS) {
    if (authorLower.includes(a)) {
      return { rating: "18+", reason: `автор 18+: ${author ?? a}` };
    }
  }

  // Шаг 2. Взрослый контент (18+)
  for (const kw of ADULT_KEYWORDS) {
    if (genreLower.includes(kw) || tagList.some((t) => t.includes(kw))) {
      return { rating: "18+", reason: `жанр/тег: ${kw}` };
    }
    if (descLower.includes(kw)) {
      return { rating: "18+", reason: `описание: ${kw}` };
    }
  }

  // Шаг 3. 16+ (триллеры, детективы, ужасы, темное фэнтези, new adult)
  for (const kw of MATURE_16_GENRES_AND_TAGS) {
    if (genreLower.includes(kw) || tagList.some((t) => t.includes(kw))) {
      return { rating: "16+", reason: `жанр/тег: ${kw}` };
    }
  }

  // Шаг 4. Детская литература 0+ (СТРОГО по жанру или тегам, никогда не по случайному слову в описании!)
  for (const kw of CHILD_0_GENRES_AND_TAGS) {
    if (genreLower.includes(kw) || tagList.some((t) => t.includes(kw))) {
      return { rating: "0+", reason: "детский жанр/тег" };
    }
  }

  // Шаг 5. Младшие школьники 6+
  for (const kw of CHILD_6_GENRES_AND_TAGS) {
    if (genreLower.includes(kw) || tagList.some((t) => t.includes(kw))) {
      return { rating: "6+", reason: `жанр/тег: ${kw}` };
    }
  }

  // Шаг 6. Подростки 12+ (Young Adult)
  for (const kw of TEEN_12_GENRES_AND_TAGS) {
    if (genreLower.includes(kw) || tagList.some((t) => t.includes(kw))) {
      return { rating: "12+", reason: `жанр/тег: ${kw}` };
    }
  }

  return null;
}

/**
 * Проверяет Google Books API на флаг maturityRating: "MATURE" (18+).
 */
export async function checkGoogleBooksMaturity(volumeId: string): Promise<AgeRatingResult | null> {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${volumeId}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { volumeInfo?: { maturityRating?: string } };
    if (json.volumeInfo?.maturityRating === "MATURE") {
      return { rating: "18+", reason: "Google Books: MATURE" };
    }
  } catch {
    // Сетевая ошибка — пропускаем
  }
  return null;
}

const AI_SYSTEM_PROMPT =
  "Ты — библиотекарь-эксперт. Определи возрастной ценз книги по российскому законодательству (ФЗ-436): 0+, 6+, 12+, 16+ или 18+. Важно: категории 0+ и 6+ применяются ТОЛЬКО для явно детской литературы (сказки для малышей, книжки-картинки, детские стихи). Для любовных романов, прозы, молодежной литературы и при нехватке данных безопасный стандарт — 16+ (или 18+ при наличии откровенного контента/насилия). Отвечай строго валидным JSON без markdown: {\"rating\": \"16+\", \"reason\": \"краткая причина\"}";

/**
 * Определяет возрастной ценз через LLM (OpenAI-совместимый API через env).
 */
export async function detectAgeRatingWithAi(book: {
  title: string;
  author?: string | null;
  genre?: string | null;
  description?: string | null;
}): Promise<AgeRatingResult | null> {
  const apiKey = process.env.CUSTOM_AI_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.CUSTOM_AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.CUSTOM_AI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return null;
  }

  try {
    const prompt = `Книга: «${book.title}»
Автор: ${book.author ?? "не указан"}
Жанр: ${book.genre ?? "не указан"}
Аннотация: ${book.description ? book.description.slice(0, 800) : "нет описания"}

Выбери один из рейтингов: 0+, 6+, 12+, 16+, 18+.`;

    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const parsed = JSON.parse(cleaned) as { rating?: string; reason?: string };
    if (parsed.rating && VALID_RATINGS.has(parsed.rating)) {
      return {
        rating: parsed.rating as AgeRatingResult["rating"],
        reason: parsed.reason ? `AI: ${parsed.reason}` : "AI-классификация",
      };
    }
  } catch {
    // Сетевая ошибка или парсинг
  }
  return null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const processAll = process.argv.includes("--all");
  const useAi = process.argv.includes("--ai");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  console.log(
    `Запуск разметки ageRating... [dryRun=${dryRun}, all=${processAll}, ai=${useAi}, limit=${limit}]`,
  );

  const books = await prisma.book.findMany({
    where: processAll ? {} : { ageRating: null },
    select: {
      id: true,
      title: true,
      author: true,
      genre: true,
      tags: true,
      description: true,
      externalId: true,
      source: true,
      ageRating: true,
    },
    take: Number.isFinite(limit) ? limit : undefined,
    orderBy: { id: "asc" },
  });

  console.log(`Найдено книг для анализа: ${books.length}\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  const stats: Record<string, number> = {
    "18+": 0,
    "16+": 0,
    "12+": 0,
    "6+": 0,
    "0+": 0,
  };

  for (const book of books) {
    let result: AgeRatingResult | null = detectAgeRatingFromMetadata(book);

    // Если метаданные не дали рейтинг, но есть Google Books ID — опрашиваем Google Books API
    if (!result && book.source === "google_books" && book.externalId) {
      result = await checkGoogleBooksMaturity(book.externalId);
    }

    // Если всё ещё нет рейтинга и включен AI-режим (--ai) — опрашиваем LLM
    if (!result && useAi) {
      result = await detectAgeRatingWithAi({
        title: book.title,
        author: book.author,
        genre: book.genre,
        description: book.description,
      });
    }

    if (!result) {
      skippedCount++;
      continue;
    }

    stats[result.rating] = (stats[result.rating] || 0) + 1;
    updatedCount++;

    console.log(
      `[${result.rating}] #${book.id}: «${book.title}» (${book.author ?? "нет автора"}) — ${result.reason}`,
    );

    if (!dryRun) {
      await prisma.book.update({
        where: { id: book.id },
        data: { ageRating: result.rating },
      });
    }
  }

  console.log("\n================ Итоги разметки ================");
  console.log(`Всего размечено: ${updatedCount}`);
  for (const [rating, count] of Object.entries(stats)) {
    if (count > 0) {
      console.log(`  • ${rating}: ${count}`);
    }
  }
  console.log(`Пропущено (без явных признаков): ${skippedCount}`);
  if (dryRun) {
    console.log("\n(Запуск был в режиме --dry-run, изменения в БД не записаны)");
  }
}

main()
  .catch((e) => {
    console.error("Ошибка при разметке:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
