import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtPayloadSchema, type AuthTokenPayload } from "./auth.schema.js";
import { RolesService } from "../roles/roles.service.js";
import { createLogger } from "../../lib/logger.js";
import crypto from "crypto";
import { sendResetPasswordEmail, sendWelcomeEmail, sendVerifyEmail } from "./auth.mail.js";
import { isDisposableEmail } from "../../lib/disposable-email.js";
import { verifyTurnstileToken } from "../../lib/turnstile.js";
import { getVkToken, getGoogleToken, parseOAuthUserData } from "../../lib/oauth.js";

const logger = createLogger("Auth", { color: "blue" });

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  logger.error("FATAL: JWT_SECRET is not defined in your .env file");
  process.exit(1);
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  userId: number;
  username: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
  turnstileToken?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterResult {
  userId: number;
  username: string;
  email: string;
  emailVerified: boolean;
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  if (!payload.acceptedTerms) {
    throw new Error("Необходимо принять условия использования");
  }

  const domain = payload.email.split("@")[1]
  if (domain && isDisposableEmail(payload.email)) {
    logger.warn("Попытка регистрации с disposable email", { email: payload.email })
    throw new Error("Регистрация с временных почтовых адресов запрещена. Используйте постоянный email.")
  }

  if (payload.turnstileToken) {
    const isValid = await verifyTurnstileToken(payload.turnstileToken)
    if (!isValid) {
      throw new Error("Не удалось подтвердить, что вы не робот. Попробуйте ещё раз.")
    }
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const rolesService = new RolesService(prisma);
  const userRole = await rolesService.getRoleByName("user");

  if (!userRole) {
    logger.error('Роль "user" не найдена в БД');
    throw new Error("Системная ошибка: роль пользователя не найдена");
  }

  const verificationToken = generateVerificationToken();
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findFirst({
      where: {
        OR: [{ email: payload.email }, { username: payload.username }],
      },
    });

    if (existing) {
      throw new Error(
        "Пользователь с таким именем или email уже зарегистрирован. Пожалуйста, выберите другое имя пользователя или email.",
      );
    }

    return tx.user.create({
      data: {
        username: payload.username,
        email: payload.email,
        passwordHash: hashedPassword,
        roleId: userRole.id,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiresAt: tokenExpiresAt,
        acceptedTermsAt: new Date(),
      },
    });
  });

  logger.info("Пользователь зарегистрирован (ожидает подтверждения email)", {
    userId: user.id,
    email: user.email,
  });

  try {
    await sendVerifyEmail(user.email, user.username || "Пользователь", verificationToken);
    logger.info("Письмо с подтверждением email отправлено", { userId: user.id });
  } catch (error) {
    logger.error("Ошибка при отправке письма подтверждения", {
      error: (error as Error).message,
      userId: user.id,
    });
  }

  return {
    userId: user.id,
    username: user.username!,
    email: user.email,
    emailVerified: false,
  };
}

export async function verifyEmail(token: string): Promise<{ userId: number; username: string }> {
  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
  });

  if (!user) {
    throw new Error("Неверная или устаревшая ссылка подтверждения");
  }

  if (user.emailVerifiedAt) {
    return { userId: user.id, username: user.username! };
  }

  if (user.emailVerificationTokenExpiresAt && user.emailVerificationTokenExpiresAt < new Date()) {
    throw new Error("Срок действия ссылки истёк. Запросите новое письмо для подтверждения.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    },
  });

  logger.info("Email подтверждён", { userId: user.id, email: user.email });

  try {
    await sendWelcomeEmail(user.email, user.username || "Пользователь");
  } catch (error) {
    logger.error("Ошибка при отправке приветственного письма", {
      error: (error as Error).message,
      userId: user.id,
    });
  }

  return { userId: user.id, username: user.username! };
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.emailVerifiedAt) {
    return;
  }

  const verificationToken = generateVerificationToken();
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiresAt: tokenExpiresAt,
    },
  });

  try {
    await sendVerifyEmail(user.email, user.username || "Пользователь", verificationToken);
    logger.info("Письмо с подтверждением email повторно отправлено", { userId: user.id });
  } catch (error) {
    logger.error("Ошибка при повторной отправке письма подтверждения", {
      error: (error as Error).message,
      userId: user.id,
    });
  }
}

export async function login(payload: LoginPayload): Promise<AuthToken> {
  const user = await prisma.user.findUnique({
    where: { username: payload.username },
    include: { role: true },
  });

  if (!user) {
    throw new Error("Неверное имя пользователя или пароль");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Неверное имя пользователя или пароль");
  }

  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    const until = user.suspendedUntil.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    throw new Error(`Ваш аккаунт заблокирован до ${until}${user.suspensionReason ? `. Причина: ${user.suspensionReason}` : ""}`);
  }

  const tokens = generateTokenPair({
    userId: user.id,
    username: user.username!,
    role: user.role?.name || "user",
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: user.id,
    username: user.username!,
  };
}

export function validateToken(token: string): AuthTokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return jwtPayloadSchema.parse(payload);
  } catch {
    throw new Error("Невалидный токен");
  }
}

function generateToken(payload: Partial<AuthTokenPayload>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(payload: Partial<AuthTokenPayload>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function validateRefreshToken(token: string): AuthTokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return jwtPayloadSchema.parse(payload);
  } catch {
    throw new Error("Невалидный refresh токен");
  }
}

export function generateTokenPair(payload: Partial<AuthTokenPayload>): {
  accessToken: string;
  refreshToken: string;
} {
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
}

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
    await sendResetPasswordEmail(user.email, user.username || "Пользователь", token);
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
    throw new Error("Токен недействителен или истёк");
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

  logger.info("Пароль успешно сброшен", { userId: resetToken.userId });
}

export async function getUserVerificationStatus(userId: number): Promise<{
  emailVerified: boolean;
  email: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true, email: true },
  });

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  return {
    emailVerified: user.emailVerifiedAt !== null,
    email: user.email,
  };
}

// OAuth
export async function oauthVk(code: string): Promise<AuthToken> {
  const rawData = await getVkToken(code)
  const oauthUser = parseOAuthUserData(rawData)

  let user = await prisma.user.findFirst({
    where: { OR: [{ vkId: oauthUser.id }, { email: oauthUser.email }] },
    include: { role: true },
  })

  if (user) {
    if (!user.vkId && oauthUser.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { vkId: oauthUser.id, emailVerifiedAt: user.emailVerifiedAt || new Date() },
      })
    }
  } else {
    const rolesService = new RolesService(prisma)
    const userRole = await rolesService.getRoleByName("user")
    if (!userRole) throw new Error("Системная ошибка: роль пользователя не найдена")

    const username = oauthUser.username
      .replace(/[^a-zA-Zа-яА-Я0-9_]/g, "_")
      .substring(0, 30)

    user = await prisma.user.create({
      data: {
        vkId: oauthUser.id,
        email: oauthUser.email || `${oauthUser.id}@vk.oauth`,
        username: username || `vk_${oauthUser.id}`,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        roleId: userRole.id,
        emailVerifiedAt: oauthUser.email ? new Date() : null,
        avatarUrl: oauthUser.avatarUrl,
        acceptedTermsAt: new Date(),
      },
      include: { role: true },
    })
  }

  const tokens = generateTokenPair({
    userId: user.id,
    username: user.username!,
    role: user.role?.name || "user",
  })

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: user.id,
    username: user.username!,
  }
}

export async function oauthGoogle(code: string): Promise<AuthToken> {
  const rawData = await getGoogleToken(code)
  const oauthUser = parseOAuthUserData(rawData)

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: oauthUser.id }, { email: oauthUser.email }] },
    include: { role: true },
  })

  if (user) {
    if (!user.googleId && oauthUser.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { googleId: oauthUser.id, emailVerifiedAt: user.emailVerifiedAt || new Date() },
      })
    }
  } else {
    const rolesService = new RolesService(prisma)
    const userRole = await rolesService.getRoleByName("user")
    if (!userRole) throw new Error("Системная ошибка: роль пользователя не найдена")

    const username = oauthUser.username
      .replace(/[^a-zA-Zа-яА-Я0-9_]/g, "_")
      .substring(0, 30)

    user = await prisma.user.create({
      data: {
        googleId: oauthUser.id,
        email: oauthUser.email || `${oauthUser.id}@google.oauth`,
        username: username || `google_${oauthUser.id}`,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        roleId: userRole.id,
        emailVerifiedAt: oauthUser.email ? new Date() : null,
        avatarUrl: oauthUser.avatarUrl,
        acceptedTermsAt: new Date(),
      },
      include: { role: true },
    })
  }

  const tokens = generateTokenPair({
    userId: user.id,
    username: user.username!,
    role: user.role?.name || "user",
  })

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: user.id,
    username: user.username!,
  }
}

export async function cleanupUnverifiedAccounts(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const result = await prisma.user.deleteMany({
    where: {
      emailVerifiedAt: null,
      emailVerificationTokenExpiresAt: { lt: cutoff },
    },
  })

  if (result.count > 0) {
    logger.info(`Очищено неподтверждённых аккаунтов: ${result.count}`)
  }

  return result.count
}
