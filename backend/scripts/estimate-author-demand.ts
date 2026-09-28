/**
 * Оценка спроса на авторов через Yandex Wordstat → src/data/author-demand.json.
 *
 * Для каждого топового каталогового автора запрашивает показы фразы
 * «{имя} книг» (2-летний период) и сохраняет среднее число показов в месяц
 * (total / 24). Данные нужны для отбора целевых авторов под SEO-страницы
 * (selectTargetAuthors в modules/authors/authorSeo.ts).
 *
 * Авторизация: browser-бэкенд Wordstat — cookie Session_id + yandexuid
 * из WORDSTAT_SESSION_ID/WORDSTAT_YANDEXUID или
 * .opencode/skills/yandex-wordstat/config/.env (YANDEX_SESSION_ID/YANDEX_YANDEXUID).
 *
 * Запуск:
 *   cd backend && npx tsx scripts/estimate-author-demand.ts [--limit=N]
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const OUTPUT_FILE = path.resolve(ROOT, "src/data/author-demand.json");
const WORDSTAT_ENV = path.resolve(ROOT, ".opencode/skills/yandex-wordstat/config/.env");

/** Пауза между запросами Wordstat, мс (анти-рейт-лимит) */
const PAUSE_MS = 1500;
/** 2-летний период показов → среднее в месяц */
const MONTHS = 24;
/** Сколько авторов оценивать по умолчанию */
const DEFAULT_LIMIT = 400;

const prisma = new PrismaClient();

interface DemandRow {
  slug: string;
  name: string;
  showsPerMonth: number;
  bookCount: number;
}

function readWordstatCookie(): string {
  const sessionId = process.env.WORDSTAT_SESSION_ID;
  const yandexuid = process.env.WORDSTAT_YANDEXUID;
  if (sessionId && yandexuid) {
    return `Session_id=${sessionId}; yandexuid=${yandexuid}`;
  }
  if (!fs.existsSync(WORDSTAT_ENV)) {
    throw new Error(
      `Wordstat-конфиг не найден: ${WORDSTAT_ENV}. Задай WORDSTAT_SESSION_ID/WORDSTAT_YANDEXUID или создай конфиг скилла.`,
    );
  }
  const raw = fs.readFileSync(WORDSTAT_ENV, "utf-8");
  const get = (key: string): string | undefined =>
    raw
      .match(new RegExp(`^${key}="?([^"\\n]*)"?,?$`, "m"))?.[1]
      ?.trim();
  const s = get("YANDEX_SESSION_ID");
  const u = get("YANDEX_YANDEXUID");
  if (!s || !u) {
    throw new Error(
      "В .opencode/skills/yandex-wordstat/config/.env не заполнены YANDEX_SESSION_ID/YANDEX_YANDEXUID — обнови куки Wordstat.",
    );
  }
  return `Session_id=${s}; yandexuid=${u}`;
}

async function queryWordstatTotal(phrase: string, cookie: string): Promise<number> {
  const res = await fetch("https://wordstat.yandex.ru/wordstat/api/getTable", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Cookie: cookie,
    },
    body: JSON.stringify({
      currentDevice: "desktop,phone,tablet",
      dbname: "rus",
      filters: { region: "russia", tableType: "popular" },
      searchValue: phrase,
      startDate: "01.09.2024",
      endDate: "31.08.2026",
    }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Wordstat отклонил сессию (${res.status}) — обнови куки в WORDSTAT_SESSION_ID/WORDSTAT_YANDEXUID.`,
    );
  }
  if (!res.ok) {
    throw new Error(`Wordstat HTTP ${res.status}`);
  }
  const data = (await res.json()) as { totalValue?: number };
  return data.totalValue ?? 0;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseLimit(): number {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return DEFAULT_LIMIT;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT;
}

async function main() {
  const limit = parseLimit();
  const cookie = readWordstatCookie();

  console.log("🔍 Загружаю каталоговых авторов из БД...");
  const authors = await prisma.author.findMany({
    where: {
      slug: { not: null },
      books: { some: { status: "published", userId: null } },
    },
    select: {
      slug: true,
      name: true,
      books: {
        where: { status: "published", userId: null },
        select: { id: true },
      },
    },
    orderBy: { books: { _count: "desc" } },
    take: limit,
  });

  const targets = authors.filter((a): a is typeof a & { slug: string } => !!a.slug);
  console.log(`  Авторов к оценке: ${targets.length} (limit=${limit})`);

  const rows: DemandRow[] = [];
  for (let i = 0; i < targets.length; i++) {
    const author = targets[i];
    if (!author) continue;
    const phrase = `${author.name} книг`;
    try {
      const total = await queryWordstatTotal(phrase, cookie);
      const showsPerMonth = Math.round(total / MONTHS);
      rows.push({
        slug: author.slug,
        name: author.name,
        showsPerMonth,
        bookCount: author.books.length,
      });
      console.log(
        `  [${i + 1}/${targets.length}] ${author.name}: ${total.toLocaleString("ru-RU")} показов → ${showsPerMonth}/мес`,
      );
    } catch (err) {
      console.error(
        `  [${i + 1}/${targets.length}] ${author.name}: ${err instanceof Error ? err.message : err}`,
      );
      // Ошибка авторизации — дальше смысла нет
      if (err instanceof Error && /Wordstat отклонил|HTTP 4/.test(err.message)) {
        process.exitCode = 1;
        break;
      }
    }
    await sleep(PAUSE_MS);
  }

  rows.sort((a, b) => b.showsPerMonth - a.showsPerMonth);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rows, null, 2) + "\n", "utf-8");
  console.log(`\n✅ Файл записан: ${OUTPUT_FILE}`);
  console.log(`   Авторов оценено: ${rows.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Ошибка:", err);
  process.exit(1);
});
