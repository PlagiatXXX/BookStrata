// Тесты статуса провайдеров: TTL-кэш и диагностика ошибок.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const checkStatusMock = vi.hoisted(() => vi.fn());

vi.mock("./providers/custom.js", () => ({
  customProvider: {
    name: "custom",
    model: "custom-model",
    checkStatus: checkStatusMock,
    generate: vi.fn(),
  },
}));

vi.mock("./providers/openrouter.js", () => ({
  openrouterProvider: {
    name: "openrouter",
    model: "openrouter-model",
    checkStatus: checkStatusMock,
    generate: vi.fn(),
  },
}));

async function loadRouter() {
  vi.resetModules();
  return await import("./router.js");
}

beforeEach(() => {
  checkStatusMock.mockReset().mockResolvedValue({ online: true, model: "custom-model" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkAllProvidersStatus — TTL-кэш 60с", () => {
  it("повторный вызов в пределах 60с не ходит к провайдерам повторно", async () => {
    const { checkAllProvidersStatus } = await loadRouter();

    await checkAllProvidersStatus();
    await checkAllProvidersStatus();

    // 2 провайдера × 1 проверка, а не × 2 (эндпоинт статуса публичный)
    expect(checkStatusMock).toHaveBeenCalledTimes(2);
  });

  it("после истечения 60с проверка выполняется заново", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-03T12:00:00Z"));
    const { checkAllProvidersStatus } = await loadRouter();

    await checkAllProvidersStatus();
    vi.setSystemTime(new Date("2026-10-03T12:01:01Z"));
    await checkAllProvidersStatus();

    expect(checkStatusMock).toHaveBeenCalledTimes(4);
  });

  it("кэш возвращает результат первого вызова", async () => {
    checkStatusMock.mockResolvedValueOnce({ online: true, model: "custom-model" });
    const { checkAllProvidersStatus } = await loadRouter();

    const first = await checkAllProvidersStatus();
    checkStatusMock.mockResolvedValue({ online: false, model: null });
    const second = await checkAllProvidersStatus();

    expect(second).toEqual(first);
  });
});

describe("checkAllProvidersStatus — диагностика", () => {
  it("прокидывает error провайдера (почему offline)", async () => {
    checkStatusMock.mockResolvedValue({
      online: false,
      model: null,
      error: "403 Модель не входит в бесплатный тариф",
    });
    const { checkAllProvidersStatus } = await loadRouter();

    const status = await checkAllProvidersStatus();

    expect(status.online).toBe(false);
    expect(status.activeModel).toBeNull();
    expect(status.providers[0].error).toContain("403");
  });

  it("model берётся из конфига провайдера, а не из каталога /models", async () => {
    checkStatusMock.mockResolvedValue({ online: true, model: "configured-model" });
    const { checkAllProvidersStatus } = await loadRouter();

    const status = await checkAllProvidersStatus();

    expect(status.activeModel).toBe("configured-model");
  });
});
