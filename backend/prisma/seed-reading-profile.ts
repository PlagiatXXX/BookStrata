// backend/prisma/seed-reading-profile.ts
// Заполнение readingProfile для 5 эталонных книг.
// Запуск: npx tsx prisma/seed-reading-profile.ts
// Требует подключённой БД с уже существующими книгами (seed.ts).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Reading DNA для эталонных книг. */
const PROFILES: Record<string, {
  storyFocus: number;
  emotionalWeight: number;
  pace: number;
  darkness: number;
  confidence: {
    storyFocus: number;
    emotionalWeight: number;
    pace: number;
    darkness: number;
  };
}> = {
  "Гарри Поттер и философский камень": {
    storyFocus: 25,
    emotionalWeight: 20,
    pace: 30,
    darkness: 15,
    confidence: { storyFocus: 0.95, emotionalWeight: 0.95, pace: 0.9, darkness: 0.95 },
  },
  "1984": {
    storyFocus: 45,
    emotionalWeight: 85,
    pace: 45,
    darkness: 90,
    confidence: { storyFocus: 0.9, emotionalWeight: 0.95, pace: 0.85, darkness: 0.95 },
  },
  "Цветы для Элджернона": {
    storyFocus: 65,
    emotionalWeight: 90,
    pace: 40,
    darkness: 60,
    confidence: { storyFocus: 0.9, emotionalWeight: 0.95, pace: 0.85, darkness: 0.9 },
  },
  "Маленькая жизнь": {
    storyFocus: 60,
    emotionalWeight: 95,
    pace: 55,
    darkness: 80,
    confidence: { storyFocus: 0.85, emotionalWeight: 0.95, pace: 0.8, darkness: 0.9 },
  },
  "В поисках утраченного времени": {
    storyFocus: 95,
    emotionalWeight: 55,
    pace: 90,
    darkness: 40,
    confidence: { storyFocus: 0.95, emotionalWeight: 0.85, pace: 0.9, darkness: 0.85 },
  },
};

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [title, profile] of Object.entries(PROFILES)) {
    const book = await prisma.book.findFirst({
      where: { title, userId: null }, // только каталог
      select: { id: true, title: true },
    });

    if (!book) {
      console.log(`⚠️  Книга не найдена: «${title}» — пропускаем`);
      skipped++;
      continue;
    }

    await prisma.book.update({
      where: { id: book.id },
      data: {
        readingProfile: {
          ...profile,
          source: "calibrated",
        },
      },
    });

    console.log(`✅ «${book.title}» (id=${book.id}): storyFocus=${profile.storyFocus}, weight=${profile.emotionalWeight}, pace=${profile.pace}, darkness=${profile.darkness}`);
    updated++;
  }

  console.log(`\nГотово: ${updated} обновлено, ${skipped} пропущено`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
