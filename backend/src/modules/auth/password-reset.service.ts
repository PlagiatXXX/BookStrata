import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendResetPasswordEmail } from "./auth.mail.js";
import { AuthenticationError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { incrementRefreshVersion } from "./token.service.js";

const logger = createLogger("PasswordReset", { color: "yellow" });

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    }),
  ]);

  try {
    await sendResetPasswordEmail(user.email, user.username, token);
    logger.info("Ссылка для сброса пароля отправлена", { userId: user.id });
  } catch (error) {
    logger.error("Ошибка при отправке ссылки сброса пароля", {
      error: (error as Error).message,
      userId: user.id,
    });
    throw new Error("Не удалось отправить письмо для сброса пароля. Попробуйте позже.");
  }
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    throw new AuthenticationError("Токен недействителен или истёк");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: hashedPassword },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  // Отзываем все refresh-токены после смены пароля
  await incrementRefreshVersion(resetToken.userId);

  logger.info("Пароль успешно сброшен, refresh-токены отозваны", { userId: resetToken.userId });
}
