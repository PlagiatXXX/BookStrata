// Тесты статуса провайдеров: TTL-кэш и диагностика ошибок.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const checkStatusMock = vi.hoisted(() => vi.fn());
const generateMocks = vi.hoisted(() => ({
  custom: vi.fn(),
  abliteration: vi.fn(),
  openrouter: vi.fn(),
}));

vi.mock("./providers/custom.js", () => ({
  customProvider: {
    name: "custom",
    model: "custom-model",
    checkStatus: checkStatusMock,
    generate: generateMocks.custom,
  },
}));

vi.mock("./providers/abliteration.js", () => ({
  abliterationProvider: {
    name: "abliteration",
    model: "abliteration-model",
    checkStatus: checkStatusMock,
    generate: generateMocks.abliteration,
  },
}));

vi.mock("./providers/openrouter.js", () => ({
  openrouterProvider: {
    name: "openrouter",
    model: "openrouter-model",
    checkStatus: checkStatusMock,
    generate: generateMocks.openrouter,
  },
}));

async function loadRouter() {
  vi.resetModules();
  return await import("./router.js");
}

/** Успешный стрим: один чанк + done. */
function okStream() {
  return (async function* () {
    yield { content: "ok", done: false };
    yield { content: "", done: true };
  })();
}

beforeEach(() => {
  checkStatusMock.mockReset().mockResolvedValue({ online: true, model: "custom-model" });
  for (const mock of Object.values(generateMocks)) {
    mock.mockReset().mockImplementation(() => okStream());
  }
  process.env.CUSTOM_AI_API_KEY = "custom-key";
  process.env.ABLITERATION_API_KEY = "";
  process.env.OPENROUTER_API_KEY = "";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkAllProvidersStatus — TTL-кэш 60с", () => {
  it("повторный вызов в пределах 60с не ходит к провайдерам повторно", async () => {
    const { checkAllProvidersStatus } = await loadRouter();

    await checkAllProvidersStatus();
    await checkAllProvidersStatus();

    // 3 провайдера × 1 проверка, а не × 2 (эндпоинт статуса публичный)
    expect(checkStatusMock).toHaveBeenCalledTimes(3);
  });

  it("после истечения 60с проверка выполняется заново", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-03T12:00:00Z"));
    const { checkAllProvidersStatus } = await loadRouter();

    await checkAllProvidersStatus();
    vi.setSystemTime(new Date("2026-10-03T12:01:01Z"));
    await checkAllProvidersStatus();

    expect(checkStatusMock).toHaveBeenCalledTimes(6);
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

describe("routeAiResponse — порядок и пропуск провайдеров", () => {
  const messages = [{ role: "user", content: "привет" }];
  const systemPrompt = "system";

  async function collect(route: ReturnType<Awaited<ReturnType<typeof loadRouter>>["routeAiResponse"]>) {
    for await (const _chunk of route) {
      // собираем стрим до конца
    }
  }

  it("без ключа провайдер пропускается — вызываются только провайдеры с ключом", async () => {
    process.env.ABLITERATION_API_KEY = "";
    const { routeAiResponse } = await loadRouter();

    await collect(routeAiResponse(messages, systemPrompt));

    expect(generateMocks.custom).toHaveBeenCalledTimes(1);
    expect(generateMocks.abliteration).not.toHaveBeenCalled();
    expect(generateMocks.openrouter).not.toHaveBeenCalled();
  });

  it("abliteration с ключом встаёт в цепочку между custom и openrouter", async () => {
    process.env.ABLITERATION_API_KEY = "abl-key";
    process.env.OPENROUTER_API_KEY = "or-key";
    // Все падают — роутер пройдёт цепочку до конца, порядок виден по очереди вызовов
    const order: string[] = [];
    for (const [name, mock] of Object.entries(generateMocks)) {
      mock.mockImplementation(() => {
        order.push(name);
        return (async function* () {
          throw new Error(`${name} down`);
        })();
      });
    }
    const { routeAiResponse } = await loadRouter();

    await expect(collect(routeAiResponse(messages, systemPrompt))).rejects.toThrow();

    expect(order).toEqual(["custom", "abliteration", "openrouter"]);
  });

  it("падение custom переводит запрос на abliteration", async () => {
    process.env.ABLITERATION_API_KEY = "abl-key";
    generateMocks.custom.mockImplementation(async function* () {
      throw new Error("neuraldeep down");
    });
    const { routeAiResponse } = await loadRouter();

    await collect(routeAiResponse(messages, systemPrompt));

    expect(generateMocks.custom).toHaveBeenCalledTimes(1);
    expect(generateMocks.abliteration).toHaveBeenCalledTimes(1);
    expect(generateMocks.openrouter).not.toHaveBeenCalled();
  });

  it("без ключей всех провайдеров — AiRouterError", async () => {
    process.env.CUSTOM_AI_API_KEY = "";
    const { routeAiResponse, AiRouterError } = await loadRouter();

    await expect(collect(routeAiResponse(messages, systemPrompt))).rejects.toThrow(AiRouterError);
  });
});
