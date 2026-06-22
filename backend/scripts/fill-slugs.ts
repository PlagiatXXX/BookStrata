import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(text: string): string {
  const cyrillicToLatin: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
    ж: "zh", з: "z", и: "i", й: "j", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };

  return text
    .toLowerCase()
    .trim()
    .split("")
    .map((char) => cyrillicToLatin[char] || char)
    .join("")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function generateUniqueSlug(title: string): string {
  const baseSlug = slugify(title);
  const shortId = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${shortId}`;
}

async function main() {
  const tierLists = await prisma.tierList.findMany({
    where: { slug: null },
    select: { id: true, title: true },
  });

  console.log(`Найдено ${tierLists.length} тир-листов без slug`);

  for (const tl of tierLists) {
    let slug = generateUniqueSlug(tl.title);

    // На случай коллизии — добавляем ещё символ, пока не станет уникальным
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.tierList.findUnique({ where: { slug } });
      if (!existing) break;
      slug = `${slugify(tl.title)}-${Math.random().toString(36).substring(2, 10)}`;
      attempts++;
    }

    await prisma.tierList.update({
      where: { id: tl.id },
      data: { slug },
    });

    console.log(`  ✓ ${tl.title} → ${slug}`);
  }

  console.log("Готово!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
