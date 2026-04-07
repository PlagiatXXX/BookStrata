import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtPayloadSchema, type AuthTokenPayload } from "./auth.schema.js";
import { RolesService } from "../roles/roles.service.js";
import { createLogger } from "../../lib/logger.js";
import { sendNewPasswordEmail, sendPasswordResetEmail, sendWelcomeEmail } from "./auth.mail.js";

const logger = createLogger("Auth", { color: "blue" });

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  logger.error("FATAL: JWT_SECRET is not defined in your .env file");
  process.exit(1);
}

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 минут для access токена
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 дней для refresh токена

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
}

export interface LoginPayload {
  username: string;
  password: string;
}

// Регистрация нового пользователя
export async function register(payload: RegisterPayload): Promise<AuthToken> {
  // Проверка дублей
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: payload.email }, { username: payload.username }],
    },
  });

  if (existing) {
    throw new Error(
      "Пользователь с таким именем или email уже зарегистрирован. Пожалуйста, выберите другое имя пользователя или email.",
    );
  }

  // Хешируем пароль
  const hashedPassword = await bcrypt.hash(payload.password, 10);

  // Получаем роль 'user'
  const rolesService = new RolesService(prisma);
  const userRole = await rolesService.getRoleByName("user");

  if (!userRole) {
    logger.error('Роль "user" не найдена в БД');
    throw new Error("Системная ошибка: роль пользователя не найдена");
  }

  // Создаем юзера с ролью 'user'
  const user = await prisma.user.create({
    data: {
      username: payload.username,
      email: payload.email,
      passwordHash: hashedPassword,
      roleId: userRole.id,
    },
  });

  logger.info("Пользователь зарегистрирован", {
    userId: user.id,
    email: user.email,
    role: "user",
  });

  // Отправляем приветственное письмо
  try {
    await sendWelcomeEmail(user.email, user.username || "Пользователь");
    logger.info("Приветственное письмо отправлено", { userId: user.id });
  } catch (error) {
    // Не прерываем регистрацию, если письмо не отправилось, но логируем
    logger.error("Ошибка при отправке приветственного письма", { 
      error: (error as Error).message, 
      userId: user.id 
    });
  }

  // Генерируем пару токенов
  const tokens = generateTokenPair({
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

// Вход в аккаунт
export async function login(payload: LoginPayload): Promise<AuthToken> {
  const user = await prisma.user.findUnique({
    where: { username: payload.username },
    include: {
      role: true,
    },
  });

  if (!user) {
    throw new Error("Неверное имя пользователя или пароль");
  }

  // Проверяем пароль
  const isPasswordValid = await bcrypt.compare(
    payload.password,
    user.passwordHash,
  );
  if (!isPasswordValid) {
    throw new Error("Неверное имя пользователя или пароль");
  }

  // Генерируем пару токенов с ролью
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

// Валидация токена
export function validateToken(token: string): AuthTokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return jwtPayloadSchema.parse(payload);
  } catch {
    throw new Error("Невалидный токен");
  }
}

// Генерация токена
function generateToken(payload: Partial<AuthTokenPayload>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

// Генерация refresh токена
function generateRefreshToken(payload: Partial<AuthTokenPayload>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

// Валидация refresh токена
export function validateRefreshToken(token: string): AuthTokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return jwtPayloadSchema.parse(payload);
  } catch {
    throw new Error("Невалидный refresh токен");
  }
}

// Генерация пары токенов
export function generateTokenPair(payload: Partial<AuthTokenPayload>): {
  accessToken: string;
  refreshToken: string;
} {
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
}

/**
 * Запрос на восстановление пароля (автогенерация нового)
 */

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return;
  }

  // Generate a secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  try {
    await sendPasswordResetEmail(user.email, user.username || "Пользователь", token);
    logger.info("Ссылка для сброса пароля отправлена", { userId: user.id });
  } catch (error) {
    logger.error("Ошибка при отправке письма сброса", { error: (error as Error).message, userId: user.id });
    throw new Error("Не удалось отправить письмо. Попробуйте позже.");
  }
}

/**
 * Подтверждение сброса пароля
 *
 */
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

  logger.info("Пароль успешно сброшен через токен", { userId: resetToken.userId });
}
