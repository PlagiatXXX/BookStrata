/**
 * Нарезает уменьшенные версии шаблонных изображений.
 *
 * Читает все WebP из public/images/templates/, создаёт версии
 * с шириной 730px (достаточно для retina на всех брейкпоинтах).
 *
 * Готовая картинка: scifi.webp (1408×768) → scifi@730.webp (730×...)
 *
 * Запуск: node scripts/resize-templates.mjs
 * (однократно, при добавлении новых шаблонов)
 */

import { readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, parse } from "node:path";
import sharp from "sharp";

const TEMPLATES_DIR = new URL(
  "../public/images/templates/",
  import.meta.url,
).pathname;

const TARGET_WIDTH = 730;
const SUFFIX = "@730.webp";

async function main() {
  const files = readdirSync(TEMPLATES_DIR).filter(
    (f) => f.endsWith(".webp") && !f.includes("@"),
  );

  if (files.length === 0) {
    console.log("Нет файлов для обработки");
    return;
  }

  console.log(`Найдено ${files.length} файлов`);
  let ok = 0;
  let skip = 0;

  for (const file of files) {
    const inputPath = join(TEMPLATES_DIR, file);
    const outputName = `${parse(file).name}${SUFFIX}`;
    const outputPath = join(TEMPLATES_DIR, outputName);

    // Пропускаем, если уже есть (не перезаписываем)
    try {
      await readFile(outputPath);
      skip++;
      continue;
    } catch {
      // нет файла — создаём
    }

    const input = sharp(inputPath);
    const metadata = await input.metadata();

    if (!metadata.width || metadata.width <= TARGET_WIDTH) {
      // Картинка уже не больше целевой — просто копируем
      const buf = await readFile(inputPath);
      await writeFile(outputPath, buf);
      console.log(`  ${file}: ${metadata.width}×${metadata.height} — без изменений → ${outputName}`);
    } else {
      const buf = await input
        .resize(TARGET_WIDTH, undefined, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      await writeFile(outputPath, buf);
      const ratio = ((buf.length / 1024).toFixed(0));
      console.log(`  ${file}: ${metadata.width}×${metadata.height} → ${TARGET_WIDTH}px (${ratio} KB) → ${outputName}`);
    }
    ok++;
  }

  console.log(`\nГотово: ${ok} создано, ${skip} пропущено`);
}

main().catch((err) => {
  console.error("Ошибка:", err);
  process.exit(1);
});
