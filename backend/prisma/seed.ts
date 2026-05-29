import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function envOrFallback(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

async function main() {
  const admin1Email = envOrFallback("SEED_ADMIN1_EMAIL", "Fedor-Pasyada@yandex.ru")
  const admin1Username = envOrFallback("SEED_ADMIN1_USERNAME", "fedor")
  const admin1Password = envOrFallback("SEED_ADMIN1_PASSWORD", "planchik94")

  const admin2Email = envOrFallback("SEED_ADMIN2_EMAIL", "slyusaralina.slyusar@yandex.ru")
  const admin2Username = envOrFallback("SEED_ADMIN2_USERNAME", "alina")
  const admin2Password = envOrFallback("SEED_ADMIN2_PASSWORD", "110520")

  const mod1Email = envOrFallback("SEED_MOD1_EMAIL", "fedorvasin68@gmail.com")
  const mod1Username = envOrFallback("SEED_MOD1_USERNAME", "Федор")
  const mod1Password = envOrFallback("SEED_MOD1_PASSWORD", "planchik94")

  const mod2Email = envOrFallback("SEED_MOD2_EMAIL", "fedorpasyada@gmail.com")
  const mod2Username = envOrFallback("SEED_MOD2_USERNAME", "Алина")
  const mod2Password = envOrFallback("SEED_MOD2_PASSWORD", "1234")

  // === Полная очистка БД (в обратном порядке зависимостей) ===
  await prisma.userAchievement.deleteMany()
  // ContentFlag: сначала null resolvedById (нет cascade), потом удаляем
  await prisma.contentFlag.updateMany({ where: { resolvedById: { not: null } }, data: { resolvedById: null } })
  await prisma.contentFlag.deleteMany()
  // UserWarning: сначала null moderatorId у тех, кого удалим (нет cascade)
  await prisma.userWarning.deleteMany()
  await prisma.templateLike.deleteMany()
  await prisma.tierListLike.deleteMany()
  await prisma.battleVote.deleteMany()
  await prisma.battleApplication.deleteMany()
  await prisma.battleParticipant.deleteMany()
  await prisma.battle.deleteMany()
  await prisma.discussionMessage.deleteMany()
  await prisma.discussion.deleteMany()
  await prisma.bookPlacement.deleteMany()
  await prisma.bookRating.deleteMany()
  await prisma.book.deleteMany()
  await prisma.tierList.deleteMany()
  // Template: сначала отвязываем author, потом удаляем (нет cascade)
  await prisma.template.updateMany({ where: { authorId: { not: null } }, data: { authorId: null } })
  await prisma.template.deleteMany()
  await prisma.newsArticle.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.donor.deleteMany()
  await prisma.user.deleteMany()
  await prisma.achievement.deleteMany()
  await prisma.role.deleteMany()

  console.log("Database cleaned")

  // === Создаём роли ===
  const adminRole = await prisma.role.create({ data: { name: "admin", description: "Администратор платформы" } })
  const moderatorRole = await prisma.role.create({ data: { name: "moderator", description: "Модератор контента" } })
  await prisma.role.create({ data: { name: "user", description: "Обычный пользователь" } })

  console.log("Roles created")

  // === Создаём админов и модераторов ===
  const hash = (pw: string) => bcrypt.hash(pw, 10)

  const admin1 = await prisma.user.create({
    data: {
      email: admin1Email,
      username: admin1Username,
      passwordHash: await hash(admin1Password),
      roleId: adminRole.id,
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
    },
  })

  const admin2 = await prisma.user.create({
    data: {
      email: admin2Email,
      username: admin2Username,
      passwordHash: await hash(admin2Password),
      roleId: adminRole.id,
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
    },
  })

  const mod1 = await prisma.user.create({
    data: {
      email: mod1Email,
      username: mod1Username,
      passwordHash: await hash(mod1Password),
      roleId: moderatorRole.id,
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
    },
  })

  await prisma.user.create({
    data: {
      email: mod2Email,
      username: mod2Username,
      passwordHash: await hash(mod2Password),
      roleId: moderatorRole.id,
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
    },
  })

  console.log("Users created:", { admin1: admin1.username, admin2: admin2.username, mod1: mod1.username, mod2: mod2Username })

  // === Создаём начальные новости ===
  const newsData = [
    {
      title: "Новые возможности платформы",
      content: `Мы рады сообщить о запуске новых функций платформы BookStrata Pro!

Теперь вы можете:
- Создавать неограниченное количество тир-листов
- Использовать шаблоны для быстрого старта
- Делиться своими рейтингами с сообществом
- Загружать обложки книг через drag-and-drop

Следите за обновлениями!`,
      excerpt: "Обзор новых функций платформы BookStrata Pro",
      tags: ["новинки", "обновления"],
    },
    {
      title: "Как создать идеальный тир-лист",
      content: `Советы по созданию качественных тир-листов:

1. Определите критерии оценки
2. Выберите подходящую категорию книг
3. Используйте шаблоны для экономии времени
4. Не бойтесь экспериментировать с уровнями

Помните, что ваш рейтинг — это субъективное мнение, и оно имеет право на существование!`,
      excerpt: "Руководство для начинающих",
      tags: ["гайды", "советы"],
    },
    {
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
      tags: ["подборки", "рекомендации"],
    },
  ]

  for (const news of newsData) {
    await prisma.newsArticle.create({
      data: { ...news, authorId: admin1.id, isPublished: true },
    })
  }

  console.log("News created: 3 articles")
  console.log("Seed done!")
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
