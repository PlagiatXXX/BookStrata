#!/usr/bin/env node

/**
 * Скрипт для поиска и скачивания обложек книг.
 *
 * Использование:
 *   node scripts/fetch-covers.mjs --slug top-fantasy --file books.json
 *   node scripts/fetch-covers.mjs --slug top-fantasy --books '[
 *     {"title":"Project Hail Mary","author":"Andy Weir"}
 *   ]'
 *   node scripts/fetch-covers.mjs --url https://... --name 01-mycoolbook
 *
 * Формат JSON-файла:
 *   {
 *     "slug": "top-fantasy",
 *     "books": [
 *       { "title": "...", "author": "..." },
 *       { "title": "...", "author": "..." }
 *     ]
 *   }
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const IMAGES_DIR = join(PROJECT_ROOT, "public", "images");
const CURATED_DIR = join(IMAGES_DIR, "collections", "curated");

const OPENLIBRARY_SEARCH = "https://openlibrary.org/search.json";
const COVERS_URL = "https://covers.openlibrary.org/b";

// ---- Helpers ----

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Ищет книгу на OpenLibrary, возвращает cover_i или null */
async function findCoverId(title, author) {
  const query = [`title:${title}`, author ? `author:${author}` : ""]
    .filter(Boolean)
    .join(" AND ");

  const url = `${OPENLIBRARY_SEARCH}?q=${encodeURIComponent(query)}&limit=5`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "BookStrata/1.0 (cover-fetcher)" },
  });

  if (!resp.ok) {
    console.warn(`  [WARN] OpenLibrary вернул ${resp.status} для "${title}"`);
    return null;
  }

  const data = await resp.json();
  const docs = data.docs || [];

  // Ищем книгу с обложкой, предпочитаем точное совпадение названия
  const titleLower = title.toLowerCase();
  let best = null;

  for (const doc of docs) {
    if (!doc.cover_i) continue;
    const docTitle = (doc.title || "").toLowerCase();

    // Точное совпадение — сразу берём
    if (docTitle === titleLower) {
      return doc.cover_i;
    }

    // Частичное совпадение — запоминаем как fallback
    if (!best && docTitle.includes(titleLower) || titleLower.includes(docTitle)) {
      best = doc.cover_i;
    }
  }

  if (!best && docs.length > 0 && docs[0].cover_i) {
    best = docs[0].cover_i;
  }

  return best || null;
}

/** Скачивает обложку по ID, конвертирует в WebP, сохраняет */
async function downloadCover(coverId, outputPath) {
  // Пробуем Large, если нет — Medium
  for (const size of ["L", "M"]) {
    const url = `${COVERS_URL}/id/${coverId}-${size}.jpg`;
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "BookStrata/1.0 (cover-fetcher)" },
      });

      if (!resp.ok) continue;
      const buffer = Buffer.from(await resp.arrayBuffer());

      // Проверяем, что это реальное изображение (не заглушка)
      if (buffer.length < 1000) continue;

      // Конвертируем и сохраняем
      await sharp(buffer)
        .webp({ quality: 85 })
        .toFile(outputPath);

      return true;
    } catch {
      continue;
    }
  }

  return false;
}

/** Скачивает обложку по прямому URL, конвертирует в WebP */
async function downloadFromUrl(url, outputPath) {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "BookStrata/1.0 (cover-fetcher)",
        "Referer": "https://www.litres.ru/",
      },
    });

    if (!resp.ok) {
      console.warn(`  [WARN] URL вернул ${resp.status}`);
      return false;
    }

    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length < 1000) {
      console.warn(`  [WARN] Слишком маленький файл: ${buffer.length} bytes`);
      return false;
    }

    await sharp(buffer)
      .webp({ quality: 85 })
      .toFile(outputPath);

    return true;
  } catch (err) {
    console.warn(`  [WARN] Ошибка скачивания: ${err.message}`);
    return false;
  }
}

// ---- Main ----

async function main() {
  const args = process.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--slug" && args[i + 1]) params.slug = args[++i];
    if (args[i] === "--file" && args[i + 1]) params.file = args[++i];
    if (args[i] === "--books" && args[i + 1]) params.books = args[++i];
    if (args[i] === "--url" && args[i + 1]) params.url = args[++i];
    if (args[i] === "--name" && args[i + 1]) params.name = args[++i];
  }

  let slug = params.slug || "default";
  let books = [];

  // Режим прямого URL
  if (params.url) {
    const name = params.name || "cover";
    const outDir = join(CURATED_DIR, slug);
    await mkdir(outDir, { recursive: true });

    const ext = "webp";
    const fileName = `${name}.${ext}`;
    const outputPath = join(outDir, fileName);

    console.log(`\n📥 Скачивание: ${params.url}`);
    const ok = await downloadFromUrl(params.url, outputPath);
    if (ok) {
      const stats = await stat(outputPath);
      console.log(`  ✅ Сохранено: ${fileName} (${(stats.size / 1024).toFixed(0)} KB)`);
    } else {
      console.log(`  ❌ Не удалось скачать`);
    }
    return;
  }

  // Чтение книг
  if (params.file) {
    const content = await readFile(params.file, "utf-8");
    const data = JSON.parse(content);
    slug = data.slug || slug;
    books = data.books || [];
  } else if (params.books) {
    try {
      books = JSON.parse(params.books);
    } catch {
      books = [{ title: params.books }];
    }
  } else {
    console.error("Укажите --file или --books");
    process.exit(1);
  }

  if (!Array.isArray(books) || books.length === 0) {
    console.error("Нет книг для обработки");
    process.exit(1);
  }

  // Создаём папку коллекции
  const outDir = join(CURATED_DIR, slug);
  await mkdir(outDir, { recursive: true });

  console.log(`\n📚 Коллекция: ${slug}`);
  console.log(`📁 Папка: ${outDir}`);
  console.log(`📖 Книг: ${books.length}\n`);

  const results = { found: 0, notFound: 0, errors: 0 };
  const notFoundList = [];

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const num = String(i + 1).padStart(2, "0");
    const nameSlug = slugify(book.title || `book-${num}`);
    const fileName = `${num}-${nameSlug}.webp`;
    const outputPath = join(outDir, fileName);

    // Если уже есть — пропускаем
    try {
      await stat(outputPath);
      console.log(`  ${num}. ⏭️  ${book.title} — уже есть`);
      results.found++;
      continue;
    } catch {
      // нет файла — скачиваем
    }

    process.stdout.write(`  ${num}. 🔍 ${book.title}... `);

    try {
      // Ищем на OpenLibrary
      const coverId = await findCoverId(book.title, book.author);

      if (coverId) {
        process.stdout.write(`cover #${coverId}, скачивание... `);
        const ok = await downloadCover(coverId, outputPath);
        if (ok) {
          const stats = await stat(outputPath);
          console.log(`✅ ${(stats.size / 1024).toFixed(0)} KB`);
          results.found++;
        } else {
          console.log(`❌ не удалось скачать`);
          results.errors++;
          notFoundList.push(`${book.title} (${book.author || ""})`);
        }
      } else {
        console.log(`❌ не найдено`);
        results.notFound++;
        notFoundList.push(`${book.title} (${book.author || ""})`);
      }
    } catch (err) {
      console.log(`❌ ошибка: ${err.message}`);
      results.errors++;
      notFoundList.push(`${book.title} (${book.author || ""})`);
    }

    // Задержка между запросами к OpenLibrary
    await delay(600);
  }

  // Итог
  console.log(`\n━━━ Итог ━━━`);
  console.log(`✅ Найдено и скачано: ${results.found}`);
  console.log(`❌ Не найдено: ${results.notFound}`);
  console.log(`⚠️  Ошибки: ${results.errors}`);

  if (notFoundList.length > 0) {
    console.log(`\n📋 Не найденные книги:`);
    for (const book of notFoundList) {
      console.log(`   • ${book}`);
    }
  }

  console.log();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
