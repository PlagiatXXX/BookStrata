import { createChatCompletionStream, checkOpenAiCompatibleStatus } from './openai-stream.js'
import type { AiProvider } from './types.js'
import type { AiChunk } from '../ai-librarian.service.js'

import { config } from "../../../config/env.js";

export const customConfig = {
  apiKey: config.CUSTOM_AI_API_KEY,
  model: config.CUSTOM_AI_MODEL,
  baseUrl: config.CUSTOM_AI_BASE_URL,
  timeoutMs: 30_000,
}

export const customProvider: AiProvider = {
  name: 'custom',
  model: customConfig.model,

  async *generate(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    signal?: AbortSignal,
    userId?: string,
  ): AsyncGenerator<AiChunk> {
    const activeConfig = userId ? { ...customConfig, user: userId } : customConfig
    yield* createChatCompletionStream({ messages, systemPrompt, config: activeConfig, signal })
  },

  async checkStatus() {
    return checkOpenAiCompatibleStatus(customConfig)
  },
}
