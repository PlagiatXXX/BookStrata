import { prisma } from "../../lib/prisma.js";
import { ConflictError } from "../../lib/errors.js";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { RolesService } from "../roles/roles.service.js";
import { createLogger } from "../../lib/logger.js";
import crypto from "crypto";
import { isReservedUsername } from "../../constants/reserved-usernames.js";
import { getVkToken, getGoogleToken, parseOAuthUserData } from "../../lib/oauth.js";
import { eventBus } from "../../lib/event-emitter.js";
import { generateTokenPair, type AuthToken } from "./token.service.js";
import { assertUsername } from "./auth.utils.js";

const logger = createLogger("OAuth", { color: "magenta" });

const rolesService = new RolesService(prisma);

interface OAuthProviderConfig {
  tokenFetcher: (code: string) => Promise<string>;
  providerField: "vkId" | "googleId";
  usernamePrefix: string;
  emailDomain: string;
  label: string;
}

async function createOrUpdateOAuthUser(
  code: string,
  config: OAuthProviderConfig,
): Promise<AuthToken> {
  const rawData = await config.tokenFetcher(code);
  const oauthUser = parseOAuthUserData(rawData);

  // 1. Быстрый путь — находим существующего пользователя
  let user = await prisma.user.findFirst({
    where: { OR: [{ [config.providerField]: oauthUser.id }, { email: oauthUser.email }] },
    include: { role: true },
  });

  if (user) {
    // Привязываем OAuth ID, если его ещё не было
    if (!user[config.providerField] && oauthUser.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          [config.providerField]: oauthUser.id,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
        },
      });
    }
  } else {
    // 2. Пользователь не найден — создаём нового
    const userRole = await rolesService.getRoleByName("user");
    if (!userRole) throw new Error("Системная ошибка: роль пользователя не найдена");

    let username = oauthUser.username
      .replace(/[^a-zA-Zа-яА-Я0-9_]/g, "_")
      .substring(0, 30);

    if (!username || isReservedUsername(username)) {
      username = `${config.usernamePrefix}${oauthUser.id}`;
    }

    try {
      user = await prisma.user.create({
        data: {
          [config.providerField]: oauthUser.id,
          email: oauthUser.email || `${oauthUser.id}${config.emailDomain}`,
          username: username || `${config.usernamePrefix}${oauthUser.id}`,
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
          roleId: userRole.id,
          emailVerifiedAt: oauthUser.email ? new Date() : null,
          avatarUrl: oauthUser.avatarUrl,
          acceptedTermsAt: new Date(),
        },
        include: { role: true },
      });

      // Пользователь успешно создан — эмитим событие
      eventBus.emit("user:registered", { userId: user.id }).catch((err) => {
        logger.error(`Ошибка при эмите события регистрации ${config.label}`, { error: err });
      });
    } catch (err: unknown) {
      // 3. Race condition: два одновременных OAuth callback'а
      // Первый create прошёл, второй упал с P2002 (уникальность vkId/googleId/email)
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        logger.info(`OAuth race condition — повторное чтение пользователя (${config.label})`, {
          [config.providerField]: oauthUser.id,
        });

        user = await prisma.user.findFirst({
          where: {
            [config.providerField]: oauthUser.id,
          },
          include: { role: true },
        });

        if (!user) {
          // Крайний случай: P2002, но пользователь не найден — невозможная ситуация
          throw new ConflictError(
            `Не удалось создать пользователя через ${config.label}. Попробуйте ещё раз.`,
          );
        }
        // Не эмитим user:registered — пользователь уже создан первым запросом
      } else {
        throw err;
      }
    }
  }

  const tokens = await generateTokenPair({
    userId: user.id,
    username: assertUsername(user),
    role: user.role?.name || "user",
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: user.id,
    username: assertUsername(user),
  };
}

export function oauthVk(code: string): Promise<AuthToken> {
  return createOrUpdateOAuthUser(code, {
    tokenFetcher: getVkToken,
    providerField: "vkId",
    usernamePrefix: "vk_",
    emailDomain: "@vk.oauth",
    label: "VK",
  });
}

export function oauthGoogle(code: string): Promise<AuthToken> {
  return createOrUpdateOAuthUser(code, {
    tokenFetcher: getGoogleToken,
    providerField: "googleId",
    usernamePrefix: "google_",
    emailDomain: "@google.oauth",
    label: "Google",
  });
}
