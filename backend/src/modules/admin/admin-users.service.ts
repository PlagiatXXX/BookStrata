import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import { incrementRefreshVersion } from "../auth/token.service.js";
import { NotFoundError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";

const logger = createLogger("AdminUsers", { color: "yellow" });

export async function adminResetPassword(
  userId: number,
  newPassword: string,
): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });

  if (!user) {
    throw new NotFoundError("Пользователь не найден");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Отзываем все refresh-токены после смены пароля
  await incrementRefreshVersion(userId);

  logger.info("Админ сбросил пароль пользователя", {
    targetUserId: userId,
    targetUsername: user.username,
  });

  return { message: `Пароль пользователя ${user.username} успешно сброшен` };
}
