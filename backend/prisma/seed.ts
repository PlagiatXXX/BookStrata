import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Создаем роли (если не существуют)
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin", description: "Администратор платформы" },
  });
  const moderatorRole = await prisma.role.upsert({
    where: { name: "moderator" },
    update: {},
    create: { name: "moderator", description: "Модератор контента" },
  });
  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: { name: "user", description: "Обычный пользователь" },
  });

  console.log("Roles created:", { adminRole, moderatorRole, userRole });

  // 2. Создаем книги отдельно, чтобы получить их ID
  const bookHobbit = await prisma.book.create({
    data: { title: "The Hobbit", author: "Tolkien", coverImageUrl: "url_1" },
  });
  const bookHarryPotter = await prisma.book.create({
    data: {
      title: "Harry Potter",
      author: "J.K. Rowling",
      coverImageUrl: "url_2",
    },
  });
  const bookPercyJackson = await prisma.book.create({
    data: {
      title: "Percy Jackson",
      author: "Rick Riordan",
      coverImageUrl: "url_3",
    },
  });
  const bookDune = await prisma.book.create({
    data: { title: "Dune", author: "Frank Herbert", coverImageUrl: "url_4" },
  });
  const bookSherlock = await prisma.book.create({
    data: {
      title: "Sherlock Holmes",
      author: "Arthur Conan Doyle",
      coverImageUrl: "url_5",
    },
  });

  // 3. Создаем пользователей (если не существуют)
  const fedor = await prisma.user.upsert({
    where: { email: "fedor@example.com" },
    update: { roleId: adminRole.id },
    create: {
      email: "fedor@example.com",
      passwordHash: "123456",
      roleId: adminRole.id,
    },
  });
  const alina = await prisma.user.upsert({
    where: { email: "alina@example.com" },
    update: { roleId: userRole.id },
    create: {
      email: "alina@example.com",
      passwordHash: "password",
      roleId: userRole.id,
    },
  });

  // 4. Создаем TierList №1 для Федора ("Top Fantasy Books")
  const fantasyTierList = await prisma.tierList.create({
    data: {
      title: "Top Fantasy Books",
      userId: fedor.id,
      // Сразу создаем тиры
      tiers: {
        create: [
          { title: "S", rank: 1, color: "#FFD700" },
          { title: "A", rank: 2, color: "#C0C0C0" },
        ],
      },
    },
    include: { tiers: true }, // Включаем тиры, чтобы получить их ID
  });

  // 5. Создаем BookPlacements для TierList №1
  const tierS_fantasy = fantasyTierList.tiers.find((t) => t.title === "S")!;
  const tierA_fantasy = fantasyTierList.tiers.find((t) => t.title === "A")!;

  // -- Книги в тире 'S'
  await prisma.bookPlacement.create({
    data: {
      tierListId: fantasyTierList.id,
      bookId: bookHobbit.id,
      tierId: tierS_fantasy.id,
      rank: 1,
    },
  });
  await prisma.bookPlacement.create({
    data: {
      tierListId: fantasyTierList.id,
      bookId: bookHarryPotter.id,
      tierId: tierS_fantasy.id,
      rank: 2,
    },
  });

  // -- Книга в тире 'A'
  await prisma.bookPlacement.create({
    data: {
      tierListId: fantasyTierList.id,
      bookId: bookPercyJackson.id,
      tierId: tierA_fantasy.id,
      rank: 1,
    },
  });

  // -- Нераспределенная книга
  await prisma.bookPlacement.create({
    data: {
      tierListId: fantasyTierList.id,
      bookId: bookDune.id,
      tierId: null,
      rank: 1,
    },
  });

  // 6. Создаем TierList №2 для Федора ("Top Sci-Fi Books") - простой, без книг
  await prisma.tierList.create({
    data: {
      title: "Top Sci-Fi Books",
      userId: fedor.id,
      tiers: {
        create: [
          { title: "S", rank: 1, color: "#00FFFF" },
          { title: "A", rank: 2, color: "#00FF00" },
        ],
      },
    },
  });

  // 7. Создаем TierList №3 для Алины ("Best Mystery Novels")
  const mysteryTierList = await prisma.tierList.create({
    data: {
      title: "Best Mystery Novels",
      userId: alina.id,
      tiers: {
        create: [
          { title: "S", rank: 1, color: "#FF4500" },
          { title: "A", rank: 2, color: "#FF8C00" },
        ],
      },
    },
  });

  // -- Нераспределенная книга для Алины
  await prisma.bookPlacement.create({
    data: {
      tierListId: mysteryTierList.id,
      bookId: bookSherlock.id,
      tierId: null,
      rank: 1,
    },
  });

  // 8. Создаем тестовые новости
  const news1 = await prisma.newsArticle.create({
    data: {
      title: "Новые возможности платформы",
      content: `Мы рады сообщить о запуске новых функций платформы TierMaker Pro!

Теперь вы можете:
- Создавать неограниченное количество тир-листов
- Использовать шаблоны для быстрого старта
- Делиться своими рейтингами с сообществом
- Загружать обложки книг через drag-and-drop

Следите за обновлениями!`,
      excerpt: "Обзор новых функций платформы TierMaker Pro",
      imageUrl: null,
      tags: ["новинки", "обновления"],
      authorId: fedor.id,
      isPublished: true,
    },
  });

  const news2 = await prisma.newsArticle.create({
    data: {
      title: "Как создать идеальный тир-лист",
      content: `Советы по созданию качественных тир-листов:

1. Определите критерии оценки
2. Выберите подходящую категорию книг
3. Используйте шаблоны для экономии времени
4. Не бойтесь экспериментировать с уровнями

Помните, что ваш рейтинг — это субъективное мнение, и оно имеет право на существование!`,
      excerpt: "Руководство для начинающих",
      imageUrl: null,
      tags: ["гайды", "советы"],
      authorId: fedor.id,
      isPublished: true,
    },
  });

  const news3 = await prisma.newsArticle.create({
    data: {
      title: "Топ книг месяца",
      content: `Подборка популярных книг этого месяца по версии нашего сообщества:

📚 **Фантастика:**
- "Dune" — Frank Herbert
- "The Hobbit" — J.R.R. Tolkien

📖 **Фэнтези:**
- "Harry Potter" — J.K. Rowling
- "Percy Jackson" — Rick Riordan

🔍 **Детективы:**
- "Sherlock Holmes" — Arthur Conan Doyle

А какие книги в вашем топе?`,
      excerpt: "Ежемесячная подборка лучших книг",
      imageUrl: null,
      tags: ["подборки", "рекомендации"],
      authorId: fedor.id,
      isPublished: true,
    },
  });

  console.log("News created:", { news1, news2, news3 });

  console.log("Seed done!");
  const fedorLists = await prisma.tierList.findMany({
    where: { userId: fedor.id },
  });
  const alinaLists = await prisma.tierList.findMany({
    where: { userId: alina.id },
  });
  console.log(
    "Fedor TierList IDs:",
    fedorLists.map((tl) => tl.id),
  );
  console.log(
    "Alina TierList IDs:",
    alinaLists.map((tl) => tl.id),
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
