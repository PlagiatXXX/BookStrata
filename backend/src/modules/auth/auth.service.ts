import { prisma } from '../../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRY = '7d';

export interface AuthToken {
  accessToken: string;
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

export interface TokenPayload {
  userId: number;
  username: string;
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
    throw new Error('Пользователь с таким именем или email уже зарегистрирован. Пожалуйста, выберите другое имя пользователя или email.');
  }

  // Хешируем пароль
  const hashedPassword = await bcrypt.hash(payload.password, 10);

  // Создаем юзера
  const user = await prisma.user.create({
    data: {
      username: payload.username,
      email: payload.email,
      passwordHash: hashedPassword,
    },
  });

  // Генерируем токен
  const token = generateToken({ userId: user.id, username: user.username! });

  return {
    accessToken: token,
    userId: user.id,
    username: user.username!,
  };
}

// Вход в аккаунт
export async function login(payload: LoginPayload): Promise<AuthToken> {
  const user = await prisma.user.findUnique({
    where: { username: payload.username },
  });

  if (!user) {
    throw new Error('Неверное имя пользователя или пароль');
  }

  // Проверяем пароль
  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Неверное имя пользователя или пароль');
  }

  // Генерируем токен
  const token = generateToken({ userId: user.id, username: user.username! });

  return {
    accessToken: token,
    userId: user.id,
    username: user.username!,
  };
}

// Валидация токена
export function validateToken(token: string): TokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch {
    throw new Error('Невалидный токен');
  }
}

// Генерация токена
function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}
