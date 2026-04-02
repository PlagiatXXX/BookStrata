import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const achievements = [
    {
      id: 'first_tier_list',
      title: 'Первый шаг',
      description: 'Создайте свой первый тир-лист',
      xpValue: 20,
      isSecret: false,
    },
    {
      id: 'bibliophile_10',
      title: 'Библиофил (Ур. 1)',
      description: 'Добавьте 10 книг в свои списки',
      xpValue: 50,
      isSecret: false,
    },
    {
      id: 'bibliophile_50',
      title: 'Библиофил (Ур. 2)',
      description: 'Добавьте 50 книг в свои списки',
      xpValue: 150,
      isSecret: false,
    },
    {
      id: 'popular_author_10',
      title: 'Популярный автор',
      description: 'Получите 10 лайков на свои тир-листы',
      xpValue: 100,
      isSecret: false,
    },
    {
      id: 'explorer',
      title: 'Исследователь',
      description: 'Создайте свою версию на основе чужого списка',
      xpValue: 30,
      isSecret: false,
    },
    {
      id: 'critic',
      title: 'Книжный критик',
      description: 'Напишите свою первую рецензию к книге',
      xpValue: 40,
      isSecret: false,
    },
    {
      id: 'hidden_master',
      title: 'Тайный мастер',
      description: 'Вы нашли секретный функционал!',
      xpValue: 200,
      isSecret: true,
    }
  ];

  console.log('Seeding achievements...');

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { id: achievement.id },
      update: achievement,
      create: achievement,
    });
  }

  console.log('Achievements seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
