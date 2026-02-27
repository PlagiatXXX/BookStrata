const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.tierList.count({ where: { isPublic: true } });
  console.log('Public tier lists count:', total);
  const sample = await prisma.tierList.findMany({ where: { isPublic: true }, take: 10, select: { id: true, title: true, isPublic: true, isTemplate: true } });
  console.log('Sample (up to 10):', sample);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
