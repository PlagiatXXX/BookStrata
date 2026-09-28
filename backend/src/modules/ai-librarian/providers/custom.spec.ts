import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AiChunk } from "../ai-librarian.service.js";

const cfg = vi.hoisted(() => ({
  CUSTOM_AI_API_KEY: "primary-key",
  CUSTOM_AI_API_KEY_2: "fallback-key",
  CUSTOM_AI_MODEL: "test-model",
  CUSTOM_AI_BASE_URL: "https://api.test/v1",
}));

vi.mock("../../../config/env.js", () => ({ config: cfg }));

const createChatCompletionStream = vi.hoisted(() => vi.fn());
vi.mock("./openai-stream.js", () => ({
  createChatCompletionStream,
  checkOpenAiCompatibleStatus: vi.fn(),
}));

async function* chunks(...items: AiChunk[]): AsyncGenerator<AiChunk> {
  for (const item of items) yield item;
}
/** Ошибка на старте — до первого yield (как 401/429 от провайдера). */
async function* failBeforeYield(): AsyncGenerator<AiChunk> {
  throw new Error("429 rate limit");
}
/** Ошибка в середине стрима — первый чанк уже отдан. */
async function* failMidStream(): AsyncGenerator<AiChunk> {
  yield { content: "a", done: false };
  throw new Error("connection lost");
}

async function loadProvider() {
  vi.resetModules();
  const { customProvider } = await import("./custom.js");
  return customProvider;
}

const messages = [{ role: "user", content: "hi" }];

describe("customProvider — fallback-ключ", () => {
  beforeEach(() => {
    cfg.CUSTOM_AI_API_KEY = "primary-key";
    cfg.CUSTOM_AI_API_KEY_2 = "fallback-key";
    createChatCompletionStream.mockReset();
  });

  it("ошибка основного ключа до первого чанка → повтор с CUSTOM_AI_API_KEY_2", async () => {
    createChatCompletionStream
      .mockImplementationOnce(() => failBeforeYield())
      .mockImplementationOnce(() => chunks({ content: "ok", done: true }));

    const provider = await loadProvider();
    const out: AiChunk[] = [];
    for await (const chunk of provider.generate(messages, "sys")) out.push(chunk);

    expect(out).toEqual([{ content: "ok", done: true }]);
    expect(createChatCompletionStream).toHaveBeenCalledTimes(2);
    expect(createChatCompletionStream.mock.calls[0][0].config.apiKey).toBe("primary-key");
    expect(createChatCompletionStream.mock.calls[1][0].config.apiKey).toBe("fallback-key");
  });

  it("без fallback-ключа — ошибка наружу без повторной попытки", async () => {
    cfg.CUSTOM_AI_API_KEY_2 = "";
    createChatCompletionStream.mockImplementationOnce(() => failBeforeYield());

    const provider = await loadProvider();
    await expect(
      (async () => {
        for await (const _ of provider.generate(messages, "sys")) {
          // consume
        }
      })(),
    ).rejects.toThrow("429");
    expect(createChatCompletionStream).toHaveBeenCalledTimes(1);
  });

  it("ошибка после первого чанка не ретраится (нет дублей стрима)", async () => {
    createChatCompletionStream.mockImplementationOnce(() => failMidStream());

    const provider = await loadProvider();
    const out: AiChunk[] = [];
    await expect(
      (async () => {
        for await (const chunk of provider.generate(messages, "sys")) out.push(chunk);
      })(),
    ).rejects.toThrow("connection lost");

    expect(out).toEqual([{ content: "a", done: false }]);
    expect(createChatCompletionStream).toHaveBeenCalledTimes(1);
  });
});
