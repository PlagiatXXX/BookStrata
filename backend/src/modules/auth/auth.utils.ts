import { AppError } from "../../lib/errors.js";
import { ErrorCodes } from "../../lib/api-response.js";

/** Гарантирует, что username не null. Если null — системная ошибка. */
export function assertUsername(user: { username: string }): string {
  if (!user.username) {
    throw new AppError(500, ErrorCodes.INTERNAL_ERROR, "Имя пользователя отсутствует");
  }
  return user.username;
}
