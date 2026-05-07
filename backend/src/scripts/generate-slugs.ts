import { PrismaClient } from '@prisma/client';
import { generateUniqueSlug } from '../utils/slugify.js';

const prisma = new PrismaClient();

async function main() {
  const tierLists = await prisma.tierList.findMany({
    where: { slug: null }
  });

  console.log(`Found ${tierLists.length} tier lists without slug`);

  for (const tl of tierLists) {
    const slug = generateUniqueSlug(tl.title, tl.id);
    await prisma.tierList.update({
      where: { id: tl.id },
      data: { slug }
    });
    console.log(`Updated ${tl.id} with slug: ${slug}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
