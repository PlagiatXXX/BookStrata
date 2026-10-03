// Тесты параметров запроса к OpenAI-совместимому API (streaming).
import { describe, it, expect, vi, afterEach } from "vitest";
import { createChatCompletionStream } from "./openai-stream.js";
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
