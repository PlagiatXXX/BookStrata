import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Usage: tsx scripts/e2e-promote-admin.ts <username>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });

  if (!user) {
    console.error(`User "${username}" not found`);
    process.exit(1);
  }

  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  if (!adminRole) {
    console.error('Role "admin" not found — run prisma db seed first');
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { roleId: adminRole.id },
  });

  console.log(`User "${username}" (id=${user.id}) promoted to admin`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
