import { createChatCompletionStream, checkOpenAiCompatibleStatus } from './openai-stream.js'
import type { AiProvider } from './types.js'
import type { AiChunk } from '../ai-librarian.service.js'

const CUSTOM_AI_BASE_URL = process.env.CUSTOM_AI_BASE_URL || 'https://api.neuraldeep.ru/v1'

const baseConfig = {
  apiKey: process.env.CUSTOM_AI_API_KEY || '',
  model: process.env.CUSTOM_AI_MODEL || 'gpt-oss-120b',
  baseUrl: CUSTOM_AI_BASE_URL,
  timeoutMs: 15_000,
}

export const customProvider: AiProvider = {
  name: 'custom',
  model: baseConfig.model,

  async *generate(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    signal?: AbortSignal,
    userId?: string,
  ): AsyncGenerator<AiChunk> {
    const config = userId ? { ...baseConfig, user: userId } : baseConfig
    yield* createChatCompletionStream({ messages, systemPrompt, config, signal })
  },

  async checkStatus() {
    return checkOpenAiCompatibleStatus(baseConfig)
  },
}
