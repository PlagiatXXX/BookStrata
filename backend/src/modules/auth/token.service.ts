import jwt from "jsonwebtoken";
import { config } from "../../config/env.js";
import { redis } from "../../lib/redis.js";
import { createLogger } from "../../lib/logger.js";
import { jwtPayloadSchema, type AuthTokenPayload } from "./auth.schema.js";
import { AuthenticationError } from "../../lib/errors.js";

const logger = createLogger("Token", { color: "cyan" });

const ACCESS_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY = "14d";

const REFRESH_VERSION_PREFIX = "auth:refresh_version:";
const REFRESH_VERSION_TTL = 30 * 24 * 60 * 60; // 30 дней (чистим мусор)

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  userId: number;
  username: string;
}

async function getRefreshVersion(userId: number): Promise<number> {
  try {
    const val = await redis.get(`${REFRESH_VERSION_PREFIX}${userId}`);
    return val ? parseInt(val, 10) : 0;
  } catch {
    logger.warn("Redis unavailable, refresh version check skipped");
    return 0;
  }
}

export async function incrementRefreshVersion(userId: number): Promise<void> {
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

function generateToken(payload: Partial<AuthTokenPayload>): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(payload: Partial<AuthTokenPayload>): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function validateToken(token: string): AuthTokenPayload {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    return jwtPayloadSchema.parse(payload);
  } catch {
    throw new AuthenticationError("Невалидный токен");
  }
}

export async function validateRefreshToken(token: string): Promise<AuthTokenPayload> {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const decoded = jwtPayloadSchema.parse(payload);

    // Проверяем версию refresh-токена (обратная совместимость: старые токены без refreshVersion пропускаем)
    if (decoded.refreshVersion !== undefined) {
      const currentVersion = await getRefreshVersion(decoded.userId);
      if (decoded.refreshVersion !== currentVersion) {
        throw new AuthenticationError("Refresh token has been revoked");
      }
    }

    return decoded;
  } catch (error) {
    if (error instanceof Error && error.message === "Refresh token has been revoked") {
      throw error;
    }
    throw new AuthenticationError("Невалидный refresh токен");
  }
}

export async function logout(userId: number): Promise<void> {
  // Refresh-токен хранится в httpOnly Secure SameSite=Strict cookie —
  // украсть через XSS нельзя. Клиент сам чистит куку при logout,
  // поэтому серверу не нужно инвалидировать refreshVersion.
  // Инвалидация refreshVersion всё ещё используется при смене пароля
  // для отзыва всех сессий (в password-reset.service.ts).
  logger.info("Пользователь вышел (refresh-токен остаётся валидным до истечения срока)", { userId });
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
