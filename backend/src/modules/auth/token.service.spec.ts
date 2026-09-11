import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/env.js", () => ({
  config: {
    JWT_SECRET: "test-secret-test-secret-test-secret-32ch",
    NODE_ENV: "test",
  },
}));

vi.mock("../../lib/redis.js", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    expire: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    pipeline: vi.fn(() => ({
      incr: vi.fn(),
      expire: vi.fn(),
      exec: vi.fn().mockResolvedValue([]),
    })),
    set: vi.fn().mockResolvedValue("OK"),
  },
}));

vi.mock("../../lib/logger.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import jwt from "jsonwebtoken";
import { generateTokenPair, logout } from "./token.service.js";
import { redis } from "../../lib/redis.js";

const TEST_SECRET = "test-secret-test-secret-test-secret-32ch";

describe("JWT: короткий access-токен", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("access-токен живёт не дольше 60 минут", async () => {
    const { accessToken } = await generateTokenPair({
      userId: 1,
      username: "testuser",
      role: "user",
    });

    const decoded = jwt.verify(accessToken, TEST_SECRET) as {
      exp: number;
      iat: number;
    };
    const lifetimeSec = decoded.exp - decoded.iat;

    // 7-дневный access = заблокированный пользователь работает неделю.
    // Максимум 60 минут (3600с) + небольшой запас на clock skew.
    expect(lifetimeSec).toBeLessThanOrEqual(3660);
  });

  it("refresh-токен остаётся долгоживущим (14 дней)", async () => {
    const { refreshToken } = await generateTokenPair({
      userId: 1,
      username: "testuser",
      role: "user",
    });

    const decoded = jwt.verify(refreshToken, TEST_SECRET) as {
      exp: number;
      iat: number;
    };
    const lifetimeSec = decoded.exp - decoded.iat;

    expect(lifetimeSec).toBeGreaterThanOrEqual(13 * 24 * 3600);
  });

  it("logout отзывaет refresh-токены через incrementRefreshVersion", async () => {
    await logout(42);

    // После logout refresh-версия инкрементируется → все refresh-токены
    // пользователя отозваны (раньше logout был no-op — только лог)
    const pipelineCalls = vi.mocked(redis.pipeline).mock.calls.length;
    expect(pipelineCalls).toBeGreaterThan(0);
  });
});
