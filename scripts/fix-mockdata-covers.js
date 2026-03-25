#!/usr/bin/env node

/**
 * Скрипт для замены Unsplash URL на локальные пути в mockData.ts
 *
 * Использование:
 * node scripts/fix-mockdata-covers.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDataPath = path.join(__dirname, "..", "src", "data", "mockData.ts");

// Читаем файл
let content = fs.readFileSync(mockDataPath, "utf-8");

// Считаем количество замен
let replaceCount = 0;

// Заменяем все Unsplash URL на /images/books/placeholder.webp
content = content.replace(
  /https:\/\/images\.unsplash\.com\/photo-[^\s"]+/g,
  () => {
    replaceCount++;
    return "/images/books/placeholder.webp";
  },
);

// Записываем файл обратно
fs.writeFileSync(mockDataPath, content, "utf-8");

console.log(
  `✅ Заменено ${replaceCount} URL на /images/books/placeholder.webp`,
);
console.log("");
console.log("📝 Следующие шаги:");
console.log("1. Добавь обложки книг в public/images/books/");
console.log("2. Переименуй placeholder.webp в реальные названия");
console.log("3. Обнови пути в src/data/mockData.ts");
