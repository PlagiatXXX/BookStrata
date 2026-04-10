import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Моки для Prisma — должны быть ДО импорта сервиса
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    passwordResetToken: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("./auth.mail.js", () => ({
  sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

// Импортируем после vi.mock
import * as authService from "./auth.service.js";
import { prisma } from "../../lib/prisma.js";
import { RolesService } from "../roles/roles.service.js";

describe("Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Мок для RolesService.getRoleByName
  let mockGetRoleByName: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetRoleByName = vi.fn<
      (name: string) => Promise<{
        id: number;
        name: string;
        description: string | null;
      } | null>
    >();
    // @ts-expect-error - Vitest mock type inference issue
    vi.spyOn(RolesService.prototype, "getRoleByName").mockImplementation(
      mockGetRoleByName,
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

    it("должен зарегистрировать нового пользователя", async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockCreatedUser);

      const result = await authService.register(mockRegisterPayload);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: mockRegisterPayload.email },
            { username: mockRegisterPayload.username },
          ],
        },
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: mockRegisterPayload.username,
          email: mockRegisterPayload.email,
          passwordHash: expect.any(String),
          roleId: mockUserRole.id,
        },
      });

      expect(result).toMatchObject({
        userId: 1,
        username: "newuser",
      });
      expect(result.accessToken).toBeDefined();
    });

    it("должен бросить ошибку если пользователь с email уже существует", async () => {
      (prisma.user.findFirst as any).mockResolvedValue({
        id: 999,
        email: mockRegisterPayload.email,
      });

      await expect(authService.register(mockRegisterPayload)).rejects.toThrow(
        "Пользователь с таким именем или email уже зарегистрирован",
      );
    });

    it("должен бросить ошибку если пользователь с username уже существует", async () => {
      (prisma.user.findFirst as any).mockResolvedValue({
        id: 999,
        username: mockRegisterPayload.username,
      });

      await expect(authService.register(mockRegisterPayload)).rejects.toThrow(
        "Пользователь с таким именем или email уже зарегистрирован",
      );
    });

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

    it("должен сгенерировать JWT токен после регистрации", async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockCreatedUser);

      const result = await authService.register(mockRegisterPayload);

      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe("string");

      // Проверяем что токен валидный
      const decoded = jwt.verify(result.accessToken, "test-secret-key") as any;
      expect(decoded.userId).toBe(1);
      expect(decoded.username).toBe("newuser");
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
    };

    beforeEach(async () => {
      (mockUser as any).passwordHash = await bcrypt.hash("password123", 10);
    });

    it("должен войти пользователя с корректными данными", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await authService.login(mockLoginPayload);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: mockLoginPayload.username },
        include: {
          role: true,
        },
      });

      expect(result).toMatchObject({
        userId: 1,
        username: "existinguser",
      });
      expect(result.accessToken).toBeDefined();
    });

    it("должен бросить ошибку если пользователь не найден", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(authService.login(mockLoginPayload)).rejects.toThrow(
        "Неверное имя пользователя или пароль",
      );
    });

    it("должен бросить ошибку при неверном пароле", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const wrongPasswordPayload = {
        ...mockLoginPayload,
        password: "wrongpassword",
      };

      await expect(authService.login(wrongPasswordPayload)).rejects.toThrow(
        "Неверное имя пользователя или пароль",
      );
    });

    it("должен сгенерировать JWT токен при успешном входе", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await authService.login(mockLoginPayload);

      expect(result.accessToken).toBeDefined();

      const decoded = jwt.verify(result.accessToken, "test-secret-key") as any;
      expect(decoded.userId).toBe(1);
      expect(decoded.username).toBe("existinguser");
    });

    it("должен использовать одинаковый формат токена для login и register", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const loginResult = await authService.login(mockLoginPayload);

      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({ ...mockUser, id: 2 });
      mockGetRoleByName.mockResolvedValue({
        id: 1,
        name: "user",
        description: "Regular user",
      });

      const registerResult = await authService.register({
        username: "newuser2",
        email: "newuser2@example.com",
        password: "password123",
      });

      // Оба токена должны валидироваться
      const loginDecoded = jwt.verify(
        loginResult.accessToken,
        "test-secret-key",
      ) as any;
      const registerDecoded = jwt.verify(
        registerResult.accessToken,
        "test-secret-key",
      ) as any;

      expect(loginDecoded).toHaveProperty("userId");
      expect(loginDecoded).toHaveProperty("username");
      expect(registerDecoded).toHaveProperty("userId");
      expect(registerDecoded).toHaveProperty("username");
    });
  });

  describe("generateToken (internal)", () => {
    it("должен создать токен с правильным payload", () => {
      const payload = { userId: 42, username: "testuser" };
      const token = jwt.sign(payload, "test-secret-key", { expiresIn: "7d" });

      const decoded = jwt.verify(token, "test-secret-key") as any;

      expect(decoded.userId).toBe(42);
      expect(decoded.username).toBe("testuser");
      expect(decoded.exp).toBeDefined();
    });

    it("должен создать токен с экспирацией 7 дней", () => {
      const payload = { userId: 1, username: "user" };
      const token = jwt.sign(payload, "test-secret-key", { expiresIn: "7d" });
      const decoded: any = jwt.verify(token, "test-secret-key");

      const now = Math.floor(Date.now() / 1000);
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      const expectedExp = now + sevenDaysInSeconds;

      expect(decoded.exp).toBeGreaterThanOrEqual(now);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 10);
    });
  });

  describe("TokenPayload interface", () => {
    it("должен иметь правильную структуру токена", () => {
      const payload = { userId: 123, username: "user123" };
      const token = jwt.sign(payload, "test-secret-key", { expiresIn: "1h" });
      const decoded = jwt.verify(token, "test-secret-key") as any;

      expect(decoded.userId).toBe(123);
      expect(decoded.username).toBe("user123");
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });
  });

  describe("requestPasswordReset (New Implementation)", () => {
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
