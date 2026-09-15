import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const E2E_USERS = [
  { username: "e2e_chief", password: "StrongPass1!" },
  { username: "e2e_member", password: "StrongPass2!" },
];

async function main() {
  for (const { username, password } of E2E_USERS) {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });

    if (user) {
      const hash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash },
      });
      console.log(`Password reset for "${username}" (id=${user.id})`);
    } else {
      console.log(`User "${username}" not found — skipping`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
