/**
 * Генерация SEO-описаний целевых авторов через LLM (custom AI provider).
 *
 * Берёт author-demand.json (estimate-author-demand.ts), отбирает авторов
 * selectTargetAuthors (показы ≥1000/мес и ≥3 книг), генерирует seoDescription
 * (100–150 символов) и сохраняет в Author.seoDescription.
 * Авторы с уже заполненным seoDescription пропускаются (скрипт идемпотентен).
 *
 * Запуск (нужен .env с CUSTOM_AI_* / OPENAI_* для customProvider):
 *   cd backend && npx tsx scripts/generate-author-seos.ts --dry-run
 *   cd backend && npx tsx scripts/generate-author-seos.ts --limit=50
 *
 * Флаги:
 *   --dry-run      — только показать результат, без записи в БД;
 *   --limit=N      — обработать не более N авторов (после отбора).
 *
 * Ошибка одного автора логируется и не прерывает прогон.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { customProvider } from "../src/modules/ai-librarian/providers/custom.js";
import {
  selectTargetAuthors,
  buildSeoPrompt,
  type DemandRow,
} from "../src/modules/authors/authorSeo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const DEMAND_FILE = path.resolve(ROOT, "src/data/author-demand.json");

/** Допустимая длина seoDescription (промпт целится в 100–150) */
const SEO_LEN_MIN = 80;
const SEO_LEN_MAX = 160;

const SYSTEM_PROMPT =
  "Ты — SEO-редактор книжного каталога. Отвечай строго валидным JSON без markdown-обёрток и пояснений.";

const prisma = new PrismaClient();

function parseFlags(): { dryRun: boolean; limit: number | null } {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
  return { dryRun, limit: limit && Number.isFinite(limit) ? limit : null };
}

/** Собирает текст ответа LLM, накапливая чанки стрима */
async function generateText(prompt: string): Promise<string> {
  let text = "";
  for await (const chunk of customProvider.generate(
    [{ role: "user", content: prompt }],
    SYSTEM_PROMPT,
  )) {
    text += chunk.content;
  }
  return text;
}

/** Убирает markdown-обёртки ```json ... ``` и парсит */
function parseJsonResponse(raw: string): { seoDescription?: unknown; articleLead?: unknown } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

interface GeneratedSeo {
  seoDescription: string;
  articleLead: string;
}

function validateSeo(parsed: { seoDescription?: unknown; articleLead?: unknown }): GeneratedSeo {
  const seoDescription =
    typeof parsed.seoDescription === "string" ? parsed.seoDescription.trim() : "";
  const articleLead =
    typeof parsed.articleLead === "string" ? parsed.articleLead.trim() : "";
  if (seoDescription.length < SEO_LEN_MIN || seoDescription.length > SEO_LEN_MAX) {
    throw new Error(
      `seoDescription длиной ${seoDescription.length} симв. вне диапазона ${SEO_LEN_MIN}–${SEO_LEN_MAX}`,
    );
  }
  if (!articleLead) throw new Error("articleLead пуст");
  return { seoDescription, articleLead };
}

async function main() {
  const { dryRun, limit } = parseFlags();

  if (!fs.existsSync(DEMAND_FILE)) {
    throw new Error(
      `Нет файла ${DEMAND_FILE} — сначала запусти scripts/estimate-author-demand.ts`,
    );
  }
  const demand = JSON.parse(fs.readFileSync(DEMAND_FILE, "utf-8")) as DemandRow[];
  const targets = selectTargetAuthors(demand);
  const queue = limit ? targets.slice(0, limit) : targets;
  console.log(
    `🎯 Целевых авторов: ${targets.length} (из ${demand.length}), в этом прогоне: ${queue.length}${dryRun ? ", dry-run" : ""}`,
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, row] of queue.entries()) {
    const prefix = `[${i + 1}/${queue.length}] ${row.name}`;
    try {
      const author = await prisma.author.findUnique({
        where: { slug: row.slug },
        select: { id: true, seoDescription: true, name: true },
      });
      if (!author) {
        console.log(`  ⏭️  ${prefix}: автор не найден в БД`);
        skipped++;
        continue;
      }
      if (author.seoDescription) {
        console.log(`  ⏭️  ${prefix}: seoDescription уже заполнен`);
        skipped++;
        continue;
      }

      const books = await prisma.book.findMany({
        where: { authorId: author.id, status: "published", userId: null },
        orderBy: [{ rating: "desc" }, { publishedYear: "desc" }],
        take: 10,
        select: { title: true, genre: true },
      });
      if (books.length === 0) {
        console.log(`  ⏭️  ${prefix}: нет опубликованных книг`);
        skipped++;
        continue;
      }

      const genre = books.find((b) => b.genre)?.genre ?? null;
      const prompt = buildSeoPrompt({
        name: author.name,
        bookTitles: books.map((b) => b.title),
        bookCount: row.bookCount,
        genre,
      });

      const raw = await generateText(prompt);
      const seo = validateSeo(parseJsonResponse(raw));

      if (dryRun) {
        console.log(`  📝  ${prefix}: ${seo.seoDescription}`);
      } else {
        await prisma.author.update({
          where: { id: author.id },
          data: { seoDescription: seo.seoDescription },
        });
        console.log(`  ✅  ${prefix}: записано (${seo.seoDescription.length} симв.)`);
      }
      ok++;
    } catch (err) {
      failed++;
      console.error(`  ❌  ${prefix}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(
    `\nИтог: обработано ${ok}${dryRun ? " (dry-run)" : ""}, пропущено ${skipped}, ошибок ${failed}`,
  );
  await prisma.$disconnect();
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("❌ Ошибка:", err);
  process.exit(1);
});
