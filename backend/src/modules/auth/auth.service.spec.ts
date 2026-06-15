import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    passwordResetToken: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((cb: any) => cb(tx)),
  };
  return { prisma: tx };
});

vi.mock("./auth.mail.js", () => ({
  sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/redis.js", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("../../lib/disposable-email.js", () => ({
  isDisposableEmail: vi.fn().mockReturnValue(false),
}));

// vi.mock("../../lib/smartcaptcha.js", () => ({ // captcha — закомментировано
//   verifySmartCaptchaToken: vi.fn().mockResolvedValue(true),
// }));

vi.mock("../../lib/oauth.js", () => ({
  getVkToken: vi.fn(),
  getGoogleToken: vi.fn(),
  parseOAuthUserData: vi.fn(),
  getVkAuthUrl: vi.fn(),
  getGoogleAuthUrl: vi.fn(),
}));

import * as authService from "./auth.service.js";
import { prisma } from "../../lib/prisma.js";
import { RolesService } from "../roles/roles.service.js";
import { isDisposableEmail } from "../../lib/disposable-email.js";
// import { verifySmartCaptchaToken } from "../../lib/smartcaptcha.js"; // captcha — закомментировано
import { getVkToken, getGoogleToken, parseOAuthUserData } from "../../lib/oauth.js";

describe("Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  let mockGetRoleByName: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetRoleByName = vi.fn<
      (name: string) => Promise<{
        id: number;
        name: string;
        description: string | null;
      } | null>
    >();
    vi.spyOn(RolesService.prototype, "getRoleByName").mockImplementation(
      mockGetRoleByName as any,
    );
  });

  describe("validateToken", () => {
    const JWT_SECRET = "test-secret-key";

    it("должен валидировать корректный токен", () => {
      const payload = { userId: 1, username: "testuser" };
      const token = jwt.sign(payload, JWT_SECRET);

      const decoded = jwt.verify(token, JWT_SECRET) as typeof payload;

      expect(decoded.userId).toBe(1);
      expect(decoded.username).toBe("testuser");
    });

    it("должен бросить ошибку для невалидного токена", () => {
      const invalidToken = "invalid.token.here";

      expect(() => {
        jwt.verify(invalidToken, JWT_SECRET);
      }).toThrow();
    });

    it("должен бросить ошибку для просроченного токена", () => {
      const payload = { userId: 1, username: "testuser" };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "-1s" });

      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).toThrow();
    });

    it('должен бросить ошибку с сообщением "Невалидный токен"', () => {
      expect(() => {
        authService.validateToken("invalid.token");
      }).toThrow("Невалидный токен");
    });
  });

  describe("Password hashing (bcrypt)", () => {
    it("должен хешировать пароль корректно", async () => {
      const password = "mySecurePassword123";
      const hash = await bcrypt.hash(password, 10);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("должен подтверждать корректный пароль", async () => {
      const password = "mySecurePassword123";
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it("не должен подтверждать некорректный пароль", async () => {
      const password = "mySecurePassword123";
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare("wrongPassword", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("register", () => {
    const mockRegisterPayload = {
      username: "newuser",
      email: "newuser@example.com",
      password: "password123",
      acceptedTerms: true,
    };

    const mockCreatedUser = {
      id: 1,
      username: "newuser",
      email: "newuser@example.com",
      passwordHash: "hashed-password",
    };

    const mockUserRole = {
      id: 1,
      name: "user",
      description: "Regular user",
    };

    beforeEach(() => {
      mockGetRoleByName.mockResolvedValue(mockUserRole);
    });

    it("должен зарегистрировать нового пользователя и вернуть токены", async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockCreatedUser);

      const result = await authService.register(mockRegisterPayload);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: mockRegisterPayload.username,
          email: mockRegisterPayload.email,
          passwordHash: expect.any(String),
          roleId: mockUserRole.id,
          emailVerifiedAt: expect.any(Date),
          acceptedTermsAt: expect.any(Date),
        }),
      });

      expect(result).toMatchObject({
        userId: 1,
        username: "newuser",
      });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("должен бросить ошибку если не приняты условия", async () => {
      await expect(
        authService.register({ ...mockRegisterPayload, acceptedTerms: false }),
      ).rejects.toThrow("Необходимо принять условия использования");
    });

    it("должен бросить ошибку для disposable email", async () => {
      (isDisposableEmail as any).mockReturnValueOnce(true);

      await expect(authService.register(mockRegisterPayload)).rejects.toThrow(
        "Регистрация с временных почтовых адресов запрещена",
      );
    });

    // captcha — закомментировано (тесты будут раскомментированы при включении)
    // it("должен бросить ошибку если SmartCaptcha не пройдена", ...)
    // it("должен пропускать SmartCaptcha если токен не передан", ...)

    it("должен захешировать пароль перед сохранением", async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockCreatedUser);

      await authService.register(mockRegisterPayload);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: expect.any(String),
          }),
        }),
      );
    });
  });

  describe("login", () => {
    const mockLoginPayload = {
      username: "existinguser",
      password: "password123",
    };

    const mockUser = {
      id: 1,
      username: "existinguser",
      email: "user@example.com",
      passwordHash: "",
      role: {
        name: "user",
      },
      suspendedUntil: null,
      suspensionReason: null,
    };

    beforeEach(async () => {
      (mockUser as any).passwordHash = await bcrypt.hash("password123", 10);
    });

    it("должен войти пользователя с корректными данными", async () => {
      (prisma.user.findFirst as any).mockResolvedValue(mockUser);

      const result = await authService.login(mockLoginPayload);

      expect(result).toMatchObject({
        userId: 1,
        username: "existinguser",
      });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("должен войти пользователя независимо от регистра username", async () => {
      (prisma.user.findFirst as any).mockResolvedValue(mockUser);

      const result = await authService.login({
        username: "ExistingUser",
        password: "password123",
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: { equals: "ExistingUser", mode: "insensitive" } },
        include: { role: true },
      });
      expect(result.userId).toBe(1);
    });

    it("должен бросить ошибку если пользователь не найден", async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);

      await expect(authService.login(mockLoginPayload)).rejects.toThrow(
        "Неверное имя пользователя или пароль",
      );
    });

    it("должен бросить ошибку при неверном пароле", async () => {
      (prisma.user.findFirst as any).mockResolvedValue(mockUser);

      await expect(
        authService.login({ ...mockLoginPayload, password: "wrongpassword" }),
      ).rejects.toThrow("Неверное имя пользователя или пароль");
    });

    it("должен бросить ошибку если аккаунт заблокирован", async () => {
      (prisma.user.findFirst as any).mockResolvedValue({
        ...mockUser,
        suspendedUntil: new Date(Date.now() + 86400000),
        suspensionReason: "Нарушение правил",
      });

      await expect(authService.login(mockLoginPayload)).rejects.toThrow(
        "заблокирован",
      );
      await expect(authService.login(mockLoginPayload)).rejects.toThrow(
        "Нарушение правил",
      );
    });
  });

  describe("OAuth VK", () => {
    const VK_ID = "12345";

    const mockOAuthUser = {
      id: VK_ID,
      email: "vkuser@example.com",
      username: "VK User",
      avatarUrl: "https://vk.com/photo.jpg",
    };

    const mockExistingUser = {
      id: 1,
      username: "existinguser",
      email: "vkuser@example.com",
      passwordHash: "hash",
      vkId: null,
      emailVerifiedAt: new Date(),
      role: { name: "user" },
    };

    it("должен создать нового пользователя через VK", async () => {
      (getVkToken as any).mockResolvedValue(JSON.stringify(mockOAuthUser));
      (parseOAuthUserData as any).mockReturnValue(mockOAuthUser);
      (prisma.user.findFirst as any).mockResolvedValue(null);
      mockGetRoleByName.mockResolvedValue({ id: 1, name: "user", description: null });
      (prisma.user.create as any).mockResolvedValue({
        id: 2,
        username: "VK_User",
        email: "vkuser@example.com",
        vkId: VK_ID,
        role: { name: "user" },
        emailVerifiedAt: new Date(),
      });

      const result = await authService.oauthVk("valid-code");

      expect(result.userId).toBe(2);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("должен привязать VK к существующему пользователю по email", async () => {
      (getVkToken as any).mockResolvedValue(JSON.stringify(mockOAuthUser));
      (parseOAuthUserData as any).mockReturnValue(mockOAuthUser);
      (prisma.user.findFirst as any).mockResolvedValue(mockExistingUser);
      (prisma.user.update as any).mockResolvedValue({ ...mockExistingUser, vkId: VK_ID });

      const result = await authService.oauthVk("valid-code");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ vkId: VK_ID }),
      });
      expect(result.userId).toBe(1);
    });

    it("должен создать пользователя без email если VK не вернул email", async () => {
      (getVkToken as any).mockResolvedValue(JSON.stringify({ ...mockOAuthUser, email: "" }));
      (parseOAuthUserData as any).mockReturnValue({ ...mockOAuthUser, email: "" });
      (prisma.user.findFirst as any).mockResolvedValue(null);
      mockGetRoleByName.mockResolvedValue({ id: 1, name: "user", description: null });
      (prisma.user.create as any).mockResolvedValue({
        id: 3,
        username: `vk_${VK_ID}`,
        email: `${VK_ID}@vk.oauth`,
        vkId: VK_ID,
        role: { name: "user" },
        emailVerifiedAt: null,
      });

      const result = await authService.oauthVk("valid-code");

      expect(result.userId).toBe(3);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: `${VK_ID}@vk.oauth`,
            emailVerifiedAt: null,
          }),
        }),
      );
    });
  });

  describe("OAuth Google", () => {
    const mockOAuthUser = {
      id: "google12345",
      email: "googleuser@gmail.com",
      username: "Google User",
      avatarUrl: "https://google.com/photo.jpg",
    };

    const mockExistingUser = {
      id: 1,
      username: "existinguser",
      email: "googleuser@gmail.com",
      passwordHash: "hash",
      googleId: null,
      emailVerifiedAt: new Date(),
      role: { name: "user" },
    };

    it("должен создать нового пользователя через Google", async () => {
      (getGoogleToken as any).mockResolvedValue(JSON.stringify(mockOAuthUser));
      (parseOAuthUserData as any).mockReturnValue(mockOAuthUser);
      (prisma.user.findFirst as any).mockResolvedValue(null);
      mockGetRoleByName.mockResolvedValue({ id: 1, name: "user", description: null });
      (prisma.user.create as any).mockResolvedValue({
        id: 2,
        username: "Google_User",
        email: "googleuser@gmail.com",
        googleId: "google12345",
        role: { name: "user" },
        emailVerifiedAt: new Date(),
      });

      const result = await authService.oauthGoogle("valid-code");

      expect(result.userId).toBe(2);
      expect(result.accessToken).toBeDefined();
    });

    it("должен привязать Google к существующему пользователю по email", async () => {
      (getGoogleToken as any).mockResolvedValue(JSON.stringify(mockOAuthUser));
      (parseOAuthUserData as any).mockReturnValue(mockOAuthUser);
      (prisma.user.findFirst as any).mockResolvedValue(mockExistingUser);
      (prisma.user.update as any).mockResolvedValue({ ...mockExistingUser, googleId: "google12345" });

      const result = await authService.oauthGoogle("valid-code");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ googleId: "google12345" }),
      });
      expect(result.userId).toBe(1);
    });
  });

  describe("generateTokenPair", () => {
    it("должен создать пару access + refresh токенов", async () => {
      const tokens = await authService.generateTokenPair({
        userId: 1,
        username: "testuser",
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe("string");
      expect(typeof tokens.refreshToken).toBe("string");

      const decoded = jwt.verify(tokens.accessToken, "test-secret-key") as any;
      expect(decoded.userId).toBe(1);
    });
  });

  describe("validateRefreshToken", () => {
    it("должен валидировать корректный refresh токен", async () => {
      const { generateTokenPair } = authService;
      const tokens = await generateTokenPair({ userId: 1, username: "testuser" });

      const decoded = await authService.validateRefreshToken(tokens.refreshToken);
      expect(decoded.userId).toBe(1);
    });

    it("должен бросить ошибку для невалидного refresh токена", async () => {
      await expect(async () => {
        await authService.validateRefreshToken("bad-refresh-token");
      }).rejects.toThrow("Невалидный refresh токен");
    });
  });

  describe("requestPasswordReset", () => {
    it("должен сгенерировать новый пароль и вызвать отправку письма", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
      };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockResolvedValue(mockUser);
      (prisma.passwordResetToken.deleteMany as any).mockResolvedValue({
        count: 0,
      });
      (prisma.$transaction as any).mockResolvedValue([]);

      await authService.requestPasswordReset("test@example.com");

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("не должен бросать ошибку если пользователь не найден (security)", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        authService.requestPasswordReset("nonexistent@example.com"),
      ).resolves.not.toThrow();
    });
  });
});
