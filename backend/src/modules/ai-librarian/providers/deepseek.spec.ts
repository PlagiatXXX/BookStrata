import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AiChunk } from "../ai-librarian.service.js";

const cfg = vi.hoisted(() => ({
  HMS_API_KEY: "test-hms-key",
  DEEPSEEK_API_KEY: "",
  HMS_MODEL: "deepseek-v4.1-flash-free",
  HMS_BASE_URL: "https://100milionseek.top/v1",
}));

vi.mock("../../../config/env.js", () => ({ config: cfg }));

const createChatCompletionStream = vi.hoisted(() => vi.fn());
const checkOpenAiCompatibleStatus = vi.hoisted(() => vi.fn());
vi.mock("./openai-stream.js", () => ({
  createChatCompletionStream,
  checkOpenAiCompatibleStatus,
}));

async function* okStream(): AsyncGenerator<AiChunk> {
  yield { content: "test", done: false };
  yield { content: "", done: true };
}

async function loadProvider() {
  vi.resetModules();
  const { deepseekProvider } = await import("./deepseek.js");
  return deepseekProvider;
}

const messages = [{ role: "user", content: "Привет" }];

describe("deepseekProvider", () => {
  beforeEach(() => {
    cfg.HMS_API_KEY = "test-hms-key";
    cfg.DEEPSEEK_API_KEY = "";
    createChatCompletionStream.mockReset().mockImplementation(() => okStream());
    checkOpenAiCompatibleStatus.mockReset().mockResolvedValue({ online: true, model: "deepseek-v4.1-flash-free" });
  });

  it("вызывает createChatCompletionStream с правильным конфигом при наличии ключа", async () => {
    const provider = await loadProvider();
    const chunks: string[] = [];

    for await (const chunk of provider.generate(messages, "system prompt", undefined, "user-123")) {
      if (chunk.content) chunks.push(chunk.content);
    }

    expect(chunks).toEqual(["test"]);
    expect(createChatCompletionStream).toHaveBeenCalledWith({
      messages,
      systemPrompt: "system prompt",
      config: expect.objectContaining({
        apiKey: "test-hms-key",
        model: "deepseek-v4.1-flash-free",
        baseUrl: "https://100milionseek.top/v1",
        user: "user-123",
      }),
      signal: undefined,
    });
  });

  it("выбрасывает ошибку, если ключ не задан", async () => {
    cfg.HMS_API_KEY = "";
    cfg.DEEPSEEK_API_KEY = "";
    const provider = await loadProvider();

    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of provider.generate(messages, "system prompt")) {
        // empty
      }
    }).rejects.toThrow("HMS_API_KEY (или DEEPSEEK_API_KEY) не настроен");
  });

  it("checkStatus делегирует вызов в checkOpenAiCompatibleStatus", async () => {
    const provider = await loadProvider();
    const status = await provider.checkStatus();

    expect(status).toEqual({ online: true, model: "deepseek-v4.1-flash-free" });
    expect(checkOpenAiCompatibleStatus).toHaveBeenCalled();
  });
});
