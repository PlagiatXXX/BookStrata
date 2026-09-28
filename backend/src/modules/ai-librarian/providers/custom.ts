import { createChatCompletionStream, checkOpenAiCompatibleStatus } from './openai-stream.js'
import type { AiProvider } from './types.js'
import type { AiChunk } from '../ai-librarian.service.js'

import { config } from "../../../config/env.js";

export const customConfig = {
  apiKey: config.CUSTOM_AI_API_KEY,
  apiKeyFallback: config.CUSTOM_AI_API_KEY_2,
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

    // Ошибка на старте (429/квоты/сгоревший ключ) → одна повторная попытка
    // с запасным ключом. После первого отданного чанка не ретраим —
    // иначе в ответе будут дубли стрима.
    let started = false
    try {
      for await (const chunk of createChatCompletionStream({ messages, systemPrompt, config: activeConfig, signal })) {
        started = true
        yield chunk
      }
    } catch (error) {
      const hasFallback = customConfig.apiKeyFallback && customConfig.apiKeyFallback !== customConfig.apiKey
      if (started || !hasFallback) throw error
      yield* createChatCompletionStream({
        messages,
        systemPrompt,
        config: { ...activeConfig, apiKey: customConfig.apiKeyFallback },
        signal,
      })
    }
  },

  async checkStatus() {
    return checkOpenAiCompatibleStatus(customConfig)
  },
}
