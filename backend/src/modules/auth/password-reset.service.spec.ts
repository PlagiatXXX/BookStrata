// Порядок «токен ↔ отправка письма» в requestPasswordReset.
// Прод, 16.10: SMTP лежал, но токен уже был записан, а прежние удалены —
// пользователь остался без письма И без рабочей старой ссылки.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  sendResetPasswordEmail: vi.fn(),
  incrementRefreshVersion: vi.fn(),
}));

vi.mock("./auth.mail.js", () => ({
  sendResetPasswordEmail: mocks.sendResetPasswordEmail,
}));

vi.mock("./token.service.js", () => ({
  incrementRefreshVersion: mocks.incrementRefreshVersion,
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    passwordResetToken: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma.js";
import { requestPasswordReset } from "./password-reset.service.js";

const userMock = () => prisma.user.findUnique as ReturnType<typeof vi.fn>;
const tokenCreate = () => prisma.passwordResetToken.create as ReturnType<typeof vi.fn>;
const tokenDelete = () => prisma.passwordResetToken.delete as ReturnType<typeof vi.fn>;
const tokenDeleteMany = () => prisma.passwordResetToken.deleteMany as ReturnType<typeof vi.fn>;

const USER = { id: 50, email: "rabo.k@mail.ru", username: "rabo" };

describe("requestPasswordReset: порядок токена и письма", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userMock().mockResolvedValue(USER);
    tokenCreate().mockResolvedValue({ id: 1, token: "token-1", userId: USER.id });
    tokenDelete().mockResolvedValue({});
    tokenDeleteMany().mockResolvedValue({ count: 0 });
    mocks.sendResetPasswordEmail.mockResolvedValue(undefined);
  });

  it("при успешной отправке гасит прежние токены только после письма", async () => {
    await requestPasswordReset(USER.email);

    expect(mocks.sendResetPasswordEmail).toHaveBeenCalledWith(
      USER.email,
      USER.username,
      expect.any(String),
    );
    expect(tokenCreate()).toHaveBeenCalledTimes(1);
    expect(tokenDeleteMany()).toHaveBeenCalledWith({
      where: { userId: USER.id, id: { not: 1 } },
    });
    expect(tokenDelete()).not.toHaveBeenCalled();

    // Письмо уходит раньше, чем исчезают прежние ссылки
    const mailOrder = mocks.sendResetPasswordEmail.mock.invocationCallOrder[0]!;
    const cleanupOrder = tokenDeleteMany().mock.invocationCallOrder[0]!;
    expect(mailOrder).toBeLessThan(cleanupOrder);
  });

  it("при сбое отправки откатывает новый токен и не трогает прежние", async () => {
    tokenCreate().mockResolvedValue({ id: 7, token: "token-7", userId: USER.id });
    mocks.sendResetPasswordEmail.mockRejectedValue(new Error("535 authentication failed"));

    await expect(requestPasswordReset(USER.email)).rejects.toThrow(
      "Не удалось отправить письмо для сброса пароля",
    );

    expect(tokenDelete()).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(tokenDeleteMany()).not.toHaveBeenCalled();
  });

  it("несуществующий email — ни токена, ни письма", async () => {
    userMock().mockResolvedValue(null);

    await requestPasswordReset("nobody@example.com");

    expect(mocks.sendResetPasswordEmail).not.toHaveBeenCalled();
    expect(tokenCreate()).not.toHaveBeenCalled();
  });

  it("сбой отката не скрывает исходную ошибку отправки", async () => {
    tokenCreate().mockResolvedValue({ id: 9, token: "token-9", userId: USER.id });
    tokenDelete().mockRejectedValue(new Error("db down"));
    mocks.sendResetPasswordEmail.mockRejectedValue(new Error("535 authentication failed"));

    await expect(requestPasswordReset(USER.email)).rejects.toThrow(
      "Не удалось отправить письмо для сброса пароля",
    );
  });
});
