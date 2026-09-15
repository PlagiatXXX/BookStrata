import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn() },
}));

vi.mock("../auth/token.service.js", () => ({
  incrementRefreshVersion: vi.fn(),
}));

import { adminResetPassword } from "./admin-users.service.js";
import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import { incrementRefreshVersion } from "../auth/token.service.js";

describe("adminResetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("сбрасывает пароль и инвалидирует refresh-токены", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 42, username: "testuser" } as any);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed_password" as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    vi.mocked(incrementRefreshVersion).mockResolvedValue(undefined);

    const result = await adminResetPassword(42, "newPassword123");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 42 }, select: { id: true, username: true } });
    expect(bcrypt.hash).toHaveBeenCalledWith("newPassword123", 10);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 42 }, data: { passwordHash: "hashed_password" } });
    expect(incrementRefreshVersion).toHaveBeenCalledWith(42);
    expect(result).toEqual({ message: "Пароль пользователя testuser успешно сброшен" });
  });

  it("бросает ошибку если пользователь не найден", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(adminResetPassword(999, "password")).rejects.toThrow("Пользователь не найден");
  });
});
