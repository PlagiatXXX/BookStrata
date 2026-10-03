import { createChatCompletionStream, checkOpenAiCompatibleStatus } from './openai-stream.js'
import type { AiProvider } from './types.js'
import type { AiChunk } from '../ai-librarian.service.js'
import { config } from '../../../config/env.js'

const baseConfig = {
  apiKey: config.ABLITERATION_API_KEY,
  model: config.ABLITERATION_MODEL,
  baseUrl: 'https://api.abliteration.ai/v1',
  timeoutMs: 30_000,
}

export const abliterationProvider: AiProvider = {
  name: 'abliteration',
  model: baseConfig.model,

  async *generate(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    signal?: AbortSignal,
    userId?: string,
  ): AsyncGenerator<AiChunk> {
    const activeConfig = userId ? { ...baseConfig, user: userId } : baseConfig

    if (!activeConfig.apiKey) {
      throw new Error('ABLITERATION_API_KEY не настроен')
    }

    yield* createChatCompletionStream({ messages, systemPrompt, config: activeConfig, signal })
  },

  async checkStatus() {
    return checkOpenAiCompatibleStatus(baseConfig)
  },
}
