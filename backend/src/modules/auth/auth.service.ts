import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtPayloadSchema, type AuthTokenPayload } from "./auth.schema.js";
import { RolesService } from "../roles/roles.service.js";
import { createLogger } from "../../lib/logger.js";
import crypto from "crypto";
import { redis } from "../../lib/redis.js";
import { sendResetPasswordEmail } from "./auth.mail.js";
import { isDisposableEmail } from "../../lib/disposable-email.js";
import { isReservedUsername } from "../../constants/reserved-usernames.js";
// import { verifySmartCaptchaToken } from "../../lib/smartcaptcha.js"; // captcha — закомментировано, готово к подключению
import { getVkToken, getGoogleToken, parseOAuthUserData } from "../../lib/oauth.js";
import { eventBus } from "../../lib/event-emitter.js";

const logger = createLogger("Auth", { color: "blue" });

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  logger.error("FATAL: JWT_SECRET is not defined in your .env file");
  process.exit(1);
}

const ACCESS_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY = "14d";

const REFRESH_VERSION_PREFIX = "auth:refresh_version:";
const REFRESH_VERSION_TTL = 30 * 24 * 60 * 60; // 30 дней (чистим мусор)

async function getRefreshVersion(userId: number): Promise<number> {
  try {
    const val = await redis.get(`${REFRESH_VERSION_PREFIX}${userId}`);
    return val ? parseInt(val, 10) : 0;
  } catch {
    logger.warn("Redis unavailable, refresh version check skipped");
    return 0;
  }
}

async function incrementRefreshVersion(userId: number): Promise<void> {
  try {
    const key = `${REFRESH_VERSION_PREFIX}${userId}`;
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, REFRESH_VERSION_TTL);
    await pipeline.exec();
  } catch {
    logger.warn("Redis unavailable, refresh version increment failed", { userId });
  }
}

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
  captchaToken?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export async function register(payload: RegisterPayload): Promise<AuthToken> {
  if (!payload.acceptedTerms) {
    throw new Error("Необходимо принять условия использования");
  }

  const domain = payload.email.split("@")[1]
  if (domain && isDisposableEmail(payload.email)) {
    logger.warn("Попытка регистрации с disposable email", { email: payload.email })
    throw new Error("Регистрация с временных почтовых адресов запрещена. Используйте постоянный email.")
  }

  if (isReservedUsername(payload.username)) {
    logger.warn("Попытка регистрации с зарезервированным username", { username: payload.username })
    throw new Error("Это имя пользователя зарезервировано системой. Пожалуйста, выберите другое имя.")
  }

  // captcha — закомментировано, готово к подключению
  // if (payload.captchaToken) {
  //   const isValid = await verifySmartCaptchaToken(payload.captchaToken)
  //   if (!isValid) {
  //     throw new Error("Не удалось подтвердить, что вы не робот. Попробуйте ещё раз.")
  //   }
  // }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const rolesService = new RolesService(prisma);
  const userRole = await rolesService.getRoleByName("user");

  if (!userRole) {
    logger.error('Роль "user" не найдена в БД');
    throw new Error("Системная ошибка: роль пользователя не найдена");
  }

  const user = await prisma.$transaction(async (tx) => {
    const emailTaken = await tx.user.findFirst({
      where: { email: { equals: payload.email, mode: 'insensitive' } },
    });

    if (emailTaken) {
      throw new Error(
        "Пользователь с таким email уже зарегистрирован. Пожалуйста, используйте другой email.",
      );
    }

    const usernameTaken = await tx.user.findFirst({
      where: { username: { equals: payload.username, mode: 'insensitive' } },
    });

    if (usernameTaken) {
      throw new Error(
        "Пользователь с таким именем уже зарегистрирован. Пожалуйста, выберите другое имя пользователя.",
      );
    }

    return tx.user.create({
      data: {
        username: payload.username,
        email: payload.email,
        passwordHash: hashedPassword,
        roleId: userRole.id,
        emailVerifiedAt: new Date(),
        acceptedTermsAt: new Date(),
      },
    });
  });

  logger.info("Пользователь зарегистрирован", { userId: user.id, email: user.email });

  eventBus.emit("user:registered", { userId: user.id }).catch((err) => {
    logger.error("Ошибка при эмите события регистрации", { error: err });
  });

  const tokens = await generateTokenPair({
    userId: user.id,
    username: user.username!,
    role: "user",
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: user.id,
    username: user.username!,
  };
}

export async function login(payload: LoginPayload): Promise<AuthToken> {
  const user = await prisma.user.findFirst({
    where: { username: { equals: payload.username, mode: 'insensitive' } },
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

  eventBus.emit("user:login", { userId: user.id }).catch((err) => {
    logger.error("Ошибка при эмите события логина", { error: err });
  });

  const tokens = await generateTokenPair({
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

export async function validateRefreshToken(token: string): Promise<AuthTokenPayload> {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const decoded = jwtPayloadSchema.parse(payload);

    // Проверяем версию refresh-токена (обратная совместимость: старые токены без refreshVersion пропускаем)
    if (decoded.refreshVersion !== undefined) {
      const currentVersion = await getRefreshVersion(decoded.userId);
      if (decoded.refreshVersion !== currentVersion) {
        throw new Error("Refresh token has been revoked");
      }
    }

    return decoded;
  } catch (error) {
    if (error instanceof Error && error.message === "Refresh token has been revoked") {
      throw error;
    }
    throw new Error("Невалидный refresh токен");
  }
}

export async function logout(userId: number): Promise<void> {
  await incrementRefreshVersion(userId);
  logger.info("Пользователь вышел, refresh-токены отозваны", { userId });
}

export async function generateTokenPair(payload: Partial<AuthTokenPayload>): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const accessToken = generateToken(payload);
  const refreshVersion = await getRefreshVersion(payload.userId!);
  const refreshToken = generateRefreshToken({ ...payload, refreshVersion });
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

  // Отзываем все refresh-токены после смены пароля
  await incrementRefreshVersion(resetToken.userId);

  logger.info("Пароль успешно сброшен, refresh-токены отозваны", { userId: resetToken.userId });
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

    let username = oauthUser.username
      .replace(/[^a-zA-Zа-яА-Я0-9_]/g, "_")
      .substring(0, 30)

    if (!username || isReservedUsername(username)) {
      username = `vk_${oauthUser.id}`
    }

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

    eventBus.emit("user:registered", { userId: user.id }).catch((err) => {
      logger.error("Ошибка при эмите события регистрации VK", { error: err })
    })
  }

  const tokens = await generateTokenPair({
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

    let username = oauthUser.username
      .replace(/[^a-zA-Zа-яА-Я0-9_]/g, "_")
      .substring(0, 30)

    if (!username || isReservedUsername(username)) {
      username = `google_${oauthUser.id}`
    }

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

    eventBus.emit("user:registered", { userId: user.id }).catch((err) => {
      logger.error("Ошибка при эмите события регистрации Google", { error: err })
    })
  }

  const tokens = await generateTokenPair({
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


