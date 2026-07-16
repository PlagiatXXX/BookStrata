import { prisma } from "../../lib/prisma.js";
import { ValidationError, ConflictError, AuthenticationError } from "../../lib/errors.js";
import bcrypt from "bcryptjs";
import { RolesService } from "../roles/roles.service.js";
import { createLogger } from "../../lib/logger.js";
import { isDisposableEmail } from "../../lib/disposable-email.js";
import { isReservedUsername } from "../../constants/reserved-usernames.js";
// import { verifySmartCaptchaToken } from "../../lib/smartcaptcha.js"; // captcha — закомментировано, готово к подключению
import { eventBus } from "../../lib/event-emitter.js";
import { generateTokenPair, type AuthToken } from "./token.service.js";
import { assertUsername } from "./auth.utils.js";

const logger = createLogger("Auth", { color: "blue" });

const rolesService = new RolesService(prisma);

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
    throw new ValidationError("Необходимо принять условия использования");
  }

  const domain = payload.email.split("@")[1]
  if (domain && isDisposableEmail(payload.email)) {
    logger.warn("Попытка регистрации с disposable email", { email: payload.email })
    throw new ValidationError("Регистрация с временных почтовых адресов запрещена. Используйте постоянный email.")
  }

  if (isReservedUsername(payload.username)) {
    logger.warn("Попытка регистрации с зарезервированным username", { username: payload.username })
    throw new ValidationError("Это имя пользователя зарезервировано системой. Пожалуйста, выберите другое имя.")
  }

  // captcha — закомментировано, готово к подключению
  // if (payload.captchaToken) {
  //   const isValid = await verifySmartCaptchaToken(payload.captchaToken)
  //   if (!isValid) {
  //     throw new Error("Не удалось подтвердить, что вы не робот. Попробуйте ещё раз.")
  //   }
  // }

  // Сначала быстрые проверки, потом дорогое bcrypt
  const emailTaken = await prisma.user.findFirst({
    where: { email: { equals: payload.email, mode: 'insensitive' } },
  });
  if (emailTaken) {
    throw new ConflictError(
      "Пользователь с таким email уже зарегистрирован. Пожалуйста, используйте другой email.",
    );
  }

  const usernameTaken = await prisma.user.findFirst({
    where: { username: { equals: payload.username, mode: 'insensitive' } },
  });
  if (usernameTaken) {
    throw new ConflictError(
      "Пользователь с таким именем уже зарегистрирован. Пожалуйста, выберите другое имя пользователя.",
    );
  }

  const userRole = await rolesService.getRoleByName("user");
  if (!userRole) {
    logger.error('Роль "user" не найдена в БД');
    throw new Error("Системная ошибка: роль пользователя не найдена");
  }

  // Только теперь — дорогое хеширование
  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const user = await prisma.$transaction(async (tx) => {
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
    username: assertUsername(user),
    role: "user",
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: user.id,
    username: assertUsername(user),
  };
}

export async function login(payload: LoginPayload): Promise<AuthToken> {
  const user = await prisma.user.findFirst({
    where: { username: { equals: payload.username, mode: 'insensitive' } },
    include: { role: true },
  });

  if (!user) {
    throw new AuthenticationError("Неверное имя пользователя или пароль");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AuthenticationError("Неверное имя пользователя или пароль");
  }

  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    const until = user.suspendedUntil.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    throw new AuthenticationError(`Ваш аккаунт заблокирован до ${until}${user.suspensionReason ? `. Причина: ${user.suspensionReason}` : ""}`);
  }

  eventBus.emit("user:login", { userId: user.id }).catch((err) => {
    logger.error("Ошибка при эмите события логина", { error: err });
  });

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

// Реэкспорт из подмодулей для обратной совместимости (тесты, роуты)
export type { AuthToken } from "./token.service.js";
export { validateToken, validateRefreshToken, generateTokenPair, logout } from "./token.service.js";
export { requestPasswordReset, confirmPasswordReset } from "./password-reset.service.js";
export { oauthVk, oauthGoogle } from "./oauth.service.js";
