import { describe, it, expect, vi, beforeEach } from "vitest";
import { isPrivateIP, assertSafeImageUrl } from "./safe-fetch.js";

// Мокаем DNS — не ходим в сеть из тестов
vi.mock("node:dns", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:dns")>();
  return {
    ...actual,
    promises: {
      ...actual.promises,
      resolve4: vi.fn(async (hostname: string) => {
        // Тестовые DNS-ответы: livelib → публичный IP, evil.com → private
        if (hostname === "public.example.com") return ["93.184.216.34"];
        if (hostname === "internal.example.com") return ["10.0.0.5"];
        if (hostname === "metadata.example.com") return ["169.254.169.254"];
        return [];
      }),
    },
  };
});

describe("isPrivateIP", () => {
  it("блокирует RFC1918, loopback и link-local", () => {
    expect(isPrivateIP("10.1.2.3")).toBe(true);
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("192.168.1.1")).toBe(true);
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("169.254.169.254")).toBe(true);
  });

  it("пропускает публичные IP", () => {
    expect(isPrivateIP("93.184.216.34")).toBe(false);
    expect(isPrivateIP("8.8.8.8")).toBe(false);
  });
});

describe("assertSafeImageUrl (SSRF-гвард)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("принимает https-URL из allowlist с публичным DNS", async () => {
    await expect(
      assertSafeImageUrl("https://public.example.com/cover.jpg"),
    ).resolves.not.toThrow();
  });

  it("отклоняет http-URL вне allowlist (строгий https-only по умолчанию)", async () => {
    await expect(
      assertSafeImageUrl("http://nefarious.dev/pixel.png"),
    ).rejects.toThrow(/Запрещён|недопуст/i);
  });

  it("отклоняет URL на private IP после DNS-resolve", async () => {
    await expect(
      assertSafeImageUrl("https://internal.example.com/cover.jpg"),
    ).rejects.toThrow(/Запрещён|недопуст/i);
  });

  it("отклоняет URL на AWS metadata IP", async () => {
    await expect(
      assertSafeImageUrl("https://metadata.example.com/token"),
    ).rejects.toThrow(/Запрещён|недопуст/i);
  });

  it("отклоняет literal private IP", async () => {
    await expect(
      assertSafeImageUrl("http://169.254.169.254/latest/meta-data"),
    ).rejects.toThrow();
    await expect(
      assertSafeImageUrl("http://10.0.0.1:8080/admin"),
    ).rejects.toThrow();
  });

  it("отклоняет не-URL мусор", async () => {
    await expect(assertSafeImageUrl("javascript:alert(1)")).rejects.toThrow();
    await expect(assertSafeImageUrl("not a url")).rejects.toThrow();
    await expect(assertSafeImageUrl("")).rejects.toThrow();
  });

  it("отклоняет IPv6 loopback", async () => {
    await expect(assertSafeImageUrl("http://[::1]:8080/")).rejects.toThrow();
    await expect(assertSafeImageUrl("http://[fe80::1]/")).rejects.toThrow();
  });
});
