import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function envOrFallback(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

async function main() {
  const admin1Email = envOrFallback("SEED_ADMIN1_EMAIL", "Fedor-Pasyada@yandex.ru")
  const admin1Username = envOrFallback("SEED_ADMIN1_USERNAME", "fedor")
  const admin1Password = envOrFallback("SEED_ADMIN1_PASSWORD", "")

  const admin2Email = envOrFallback("SEED_ADMIN2_EMAIL", "slyusaralina.slyusar@yandex.ru")
  const admin2Username = envOrFallback("SEED_ADMIN2_USERNAME", "alina")
  const admin2Password = envOrFallback("SEED_ADMIN2_PASSWORD", "")

  const mod1Email = envOrFallback("SEED_MOD1_EMAIL", "fedorvasin68@gmail.com")
  const mod1Username = envOrFallback("SEED_MOD1_USERNAME", "Федор")
  const mod1Password = envOrFallback("SEED_MOD1_PASSWORD", "")

  const mod2Email = envOrFallback("SEED_MOD2_EMAIL", "fedorpasyada@gmail.com")
  const mod2Username = envOrFallback("SEED_MOD2_USERNAME", "Алина")
  const mod2Password = envOrFallback("SEED_MOD2_PASSWORD", "")

  // === Роли (upsert: всегда существуют) ===
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin", description: "Администратор платформы" },
  })
  const moderatorRole = await prisma.role.upsert({
    where: { name: "moderator" },
    update: {},
    create: { name: "moderator", description: "Модератор контента" },
  })
  await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: { name: "user", description: "Обычный пользователь" },
  })

  console.log("Roles ensured")

  // === Админы и модераторы (upsert по email) ===
  const hash = (pw: string) => bcrypt.hash(pw, 10)

  const hp1 = await hash(admin1Password)
  const hp2 = await hash(admin2Password)
  const hp3 = await hash(mod1Password)
  const hp4 = await hash(mod2Password)

  const admin1 = await prisma.user.upsert({
    where: { email: admin1Email },
    update: { passwordHash: hp1 },
    create: {
      email: admin1Email,
      username: admin1Username,
      passwordHash: hp1,
      roleId: adminRole.id,
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
    },
  })

  await prisma.user.upsert({
    where: { email: admin2Email },
    update: { passwordHash: hp2 },
    create: {
      email: admin2Email,
      username: admin2Username,
      passwordHash: hp2,
      roleId: adminRole.id,
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
    },
  })

  await prisma.user.upsert({
    where: { email: mod1Email },
    update: { passwordHash: hp3 },
    create: {
      email: mod1Email,
      username: mod1Username,
      passwordHash: hp3,
      roleId: moderatorRole.id,
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
    },
  })

  await prisma.user.upsert({
    where: { email: mod2Email },
    update: { passwordHash: hp4 },
    create: {
      email: mod2Email,
      username: mod2Username,
      passwordHash: hp4,
      roleId: moderatorRole.id,
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
    },
  })

  console.log("Users ensured:", { admin1: admin1.username, admin2: admin2Username, mod1: mod1Username, mod2: mod2Username })

  // Новости, коллекции и прочий контент создаются/обновляются через админку —
  // сид контента больше не используется (см. AUDIT_FILES_GUIDE.md).

  console.log("Seed done!")
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
