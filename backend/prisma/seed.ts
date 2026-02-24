import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  // 2. Создаем книги отдельно, чтобы получить их ID
  const bookHobbit = await prisma.book.create({ data: { title: 'The Hobbit', author: 'Tolkien', coverImageUrl: 'url_1' } });
  const bookHarryPotter = await prisma.book.create({ data: { title: 'Harry Potter', author: 'J.K. Rowling', coverImageUrl: 'url_2' } });
  const bookPercyJackson = await prisma.book.create({ data: { title: 'Percy Jackson', author: 'Rick Riordan', coverImageUrl: 'url_3' } });
  const bookDune = await prisma.book.create({ data: { title: 'Dune', author: 'Frank Herbert', coverImageUrl: 'url_4' } });
  const bookSherlock = await prisma.book.create({ data: { title: 'Sherlock Holmes', author: 'Arthur Conan Doyle', coverImageUrl: 'url_5' } });
  
  // 3. Создаем пользователей
  const fedor = await prisma.user.create({ data: { email: 'fedor@example.com', passwordHash: '123456' } });
  const alina = await prisma.user.create({ data: { email: 'alina@example.com', passwordHash: 'password' } });

  // 4. Создаем TierList №1 для Федора ("Top Fantasy Books")
  const fantasyTierList = await prisma.tierList.create({
    data: {
      title: 'Top Fantasy Books',
      userId: fedor.id,
      // Сразу создаем тиры
      tiers: {
        create: [
          { title: 'S', rank: 1, color: '#FFD700' },
          { title: 'A', rank: 2, color: '#C0C0C0' },
        ],
      },
    },
    include: { tiers: true }, // Включаем тиры, чтобы получить их ID
  });

  // 5. Создаем BookPlacements для TierList №1
  const tierS_fantasy = fantasyTierList.tiers.find(t => t.title === 'S')!;
  const tierA_fantasy = fantasyTierList.tiers.find(t => t.title === 'A')!;

  // -- Книги в тире 'S'
  await prisma.bookPlacement.create({ data: { tierListId: fantasyTierList.id, bookId: bookHobbit.id, tierId: tierS_fantasy.id, rank: 1 } });
  await prisma.bookPlacement.create({ data: { tierListId: fantasyTierList.id, bookId: bookHarryPotter.id, tierId: tierS_fantasy.id, rank: 2 } });
  
  // -- Книга в тире 'A'
  await prisma.bookPlacement.create({ data: { tierListId: fantasyTierList.id, bookId: bookPercyJackson.id, tierId: tierA_fantasy.id, rank: 1 } });

  // -- Нераспределенная книга
  await prisma.bookPlacement.create({ data: { tierListId: fantasyTierList.id, bookId: bookDune.id, tierId: null, rank: 1 } });


  // 6. Создаем TierList №2 для Федора ("Top Sci-Fi Books") - простой, без книг
  await prisma.tierList.create({
    data: {
      title: 'Top Sci-Fi Books',
      userId: fedor.id,
      tiers: { create: [{ title: 'S', rank: 1, color: '#00FFFF' }, { title: 'A', rank: 2, color: '#00FF00' }] },
    },
  });


  // 7. Создаем TierList №3 для Алины ("Best Mystery Novels")
  const mysteryTierList = await prisma.tierList.create({
    data: {
      title: 'Best Mystery Novels',
      userId: alina.id,
      tiers: { create: [{ title: 'S', rank: 1, color: '#FF4500' }, { title: 'A', rank: 2, color: '#FF8C00' }] },
    },
  });

  // -- Нераспределенная книга для Алины
  await prisma.bookPlacement.create({ data: { tierListId: mysteryTierList.id, bookId: bookSherlock.id, tierId: null, rank: 1 } });

  console.log('Seed done!');
  const fedorLists = await prisma.tierList.findMany({ where: { userId: fedor.id }});
  const alinaLists = await prisma.tierList.findMany({ where: { userId: alina.id }});
  console.log('Fedor TierList IDs:', fedorLists.map(tl => tl.id));
  console.log('Alina TierList IDs:', alinaLists.map(tl => tl.id));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
