// Тесты параметров запроса к OpenAI-совместимому API (streaming) и статуса провайдера.
import { describe, it, expect, vi, afterEach } from "vitest";
import { createChatCompletionStream, checkOpenAiCompatibleStatus } from "./openai-stream.js";
import type { AiProviderConfig } from "./types.js";

const config: AiProviderConfig = {
  apiKey: "test-key",
  model: "test-model",
  baseUrl: "http://ai.test",
  timeoutMs: 1000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createChatCompletionStream — тело запроса", () => {
  it("temperature 0.7 и max_tokens 4096 (reasoning-модели жрут бюджет)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => "error",
    });
    vi.stubGlobal("fetch", fetchMock);

    const gen = createChatCompletionStream({
      messages: [{ role: "user", content: "привет" }],
      systemPrompt: "sys",
      config,
    });
    // ok: false → генератор бросает ошибку после вызова fetch
    await expect(gen.next()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(4096);
    expect(body.model).toBe("test-model");
    expect(body.stream).toBe(true);
  });
});

describe("checkOpenAiCompatibleStatus — проба реальной генерации", () => {
  it("проба прошла → online true, модель из конфига, а не models[0] из каталога", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const status = await checkOpenAiCompatibleStatus(config);

    expect(status).toEqual({ online: true, model: "test-model" });
  });

  it("403 от провайдера (тариф/ключ) → online false + текст ошибки", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => '{"error":{"message":"Модель не входит в бесплатный тариф"}}',
    });
    vi.stubGlobal("fetch", fetchMock);

    const status = await checkOpenAiCompatibleStatus(config);

    expect(status.online).toBe(false);
    expect(status.model).toBeNull();
    expect(status.error).toContain("403");
    expect(status.error).toContain("бесплатный тариф");
  });

  it("сеть недоступна → online false + error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);

    const status = await checkOpenAiCompatibleStatus(config);

    expect(status.online).toBe(false);
    expect(status.error).toContain("ECONNREFUSED");
  });

  it("проба — POST /chat/completions с max_tokens:1 и stream:false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await checkOpenAiCompatibleStatus(config);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://ai.test/chat/completions");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.stream).toBe(false);
    expect(body.max_tokens).toBe(1);
    expect(body.model).toBe("test-model");
  });

  it("длинный ответ ошибки провайдера обрезается", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "x".repeat(5000),
    });
    vi.stubGlobal("fetch", fetchMock);

    const status = await checkOpenAiCompatibleStatus(config);

    expect(status.error!.length).toBeLessThanOrEqual(300);
  });
});
