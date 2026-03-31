import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtPayloadSchema, type AuthTokenPayload } from "./auth.schema.js";
import { RolesService } from "../roles/roles.service.js";
import { createLogger } from "../../lib/logger.js";

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

import nodemailer from "nodemailer";
import crypto from "crypto";

// Настройка почтового транспорта (рекомендуется вынести в env)
const mailConfig = {
  host: process.env.SMTP_HOST || "smtp.mailtrap.io",
  port: parseInt(process.env.SMTP_PORT || "2525"),
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
};

const transporter = nodemailer.createTransport(mailConfig);

/**
 * Запрос на восстановление пароля
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // В целях безопасности не говорим, что пользователя нет
    return;
  }

  // Генерируем токен
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 час жизни

  // Сохраняем в БД
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  // Отправляем письмо
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: '"BookStrata Pro" <noreply@bookstrata.pro>',
      to: email,
      subject: "Восстановление пароля",
      html: `
        <h1>Восстановление пароля</h1>
        <p>Вы получили это письмо, потому что запросили сброс пароля для вашего аккаунта в BookStrata Pro.</p>
        <p>Нажмите на ссылку ниже, чтобы установить новый пароль:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Ссылка действительна в течение 1 часа.</p>
        <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
      `,
    });
    logger.info("Письмо для сброса пароля отправлено", { userId: user.id });
  } catch (error) {
    logger.error(error as Error, { action: "sendResetEmail", userId: user.id });
    throw new Error("Не удалось отправить письмо для восстановления пароля");
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

  // Хешируем новый пароль
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Обновляем пароль и удаляем все токены пользователя
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