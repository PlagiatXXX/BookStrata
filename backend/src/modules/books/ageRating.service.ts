// backend/src/modules/books/ageRating.service.ts
import { customProvider } from "../ai-librarian/providers/custom.js";

export interface AgeRatingResult {
  rating: "0+" | "6+" | "12+" | "16+" | "18+";
  reason: string;
}

export interface BookMetadataInput {
  title?: string;
  author?: string | null;
  genre?: string | null;
  tags?: string[];
  description?: string | null;
  externalId?: string | null;
  source?: string | null;
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
  "dark romance",
  "дарк романс",
  "дарк-романс",
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

/**
 * Детектирует возрастной ценз по метаданным (аннотация, жанр, теги).
 */
export function detectAgeRatingFromMetadata(book: {
  genre?: string | null;
  tags?: string[];
  description?: string | null;
}): AgeRatingResult | null {
  const { genre, tags = [], description } = book;

  // Шаг 1. Прямая маркировка в описании или в тегах
  if (description) {
    const directFromDesc = extractDirectAgeMarking(description);
    if (directFromDesc) return directFromDesc;
  }

  for (const tag of tags) {
    const directFromTag = extractDirectAgeMarking(tag);
    if (directFromTag) return directFromTag;
  }

  const tagList = tags.map((t) => t.toLowerCase());
  const genreLower = genre?.toLowerCase() ?? "";
  const descLower = description?.toLowerCase() ?? "";

  // Шаг 2. Взрослый контент (18+)
  for (const kw of ADULT_KEYWORDS) {
    if (genreLower.includes(kw) || tagList.some((t) => t.includes(kw))) {
      return { rating: "18+", reason: `жанр/тег: ${kw}` };
    }
    // Если в описании есть явные маркеры эротики/сплаттерпанка
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
  "Ты — библиотекарь-эксперт. Определи возрастной ценз книги по российскому законодательству (ФЗ-436): 0+, 6+, 12+, 16+ или 18+. Отвечай строго валидным JSON без markdown: {\"rating\": \"16+\", \"reason\": \"краткая причина\"}";

/**
 * Определяет возрастной ценз через LLM (customProvider).
 */
export async function detectAgeRatingWithAi(book: {
  title: string;
  author?: string | null;
  genre?: string | null;
  description?: string | null;
}): Promise<AgeRatingResult | null> {
  try {
    const prompt = `Книга: «${book.title}»
Автор: ${book.author ?? "не указан"}
Жанр: ${book.genre ?? "не указан"}
Аннотация: ${book.description ? book.description.slice(0, 800) : "нет описания"}

Выбери один из рейтингов: 0+, 6+, 12+, 16+, 18+.`;

    let responseText = "";
    for await (const chunk of customProvider.generate(
      [{ role: "user", content: prompt }],
      AI_SYSTEM_PROMPT,
    )) {
      responseText += chunk.content;
    }

    const cleaned = responseText
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
    // При ошибке AI или отсутствии ключа возвращаем null
  }
  return null;
}
