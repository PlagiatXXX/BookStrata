import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Использование: npx tsx src/scripts/admin-reset-password.ts <email> <новый_пароль>");
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error("Пароль должен быть минимум 6 символов");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Пользователь с email "${email}" не найден`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashedPassword },
  });

  console.log(`✅ Пароль для ${email} (${user.username}) сброшен`);
  console.log(`Новый пароль: ${newPassword}`);
  console.log(`Скажите пользователю войти с новым паролем`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Ошибка:", err.message);
  process.exit(1);
});
