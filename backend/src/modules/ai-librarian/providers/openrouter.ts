import { createChatCompletionStream, checkOpenAiCompatibleStatus } from './openai-stream.js'
import type { AiProvider } from './types.js'
import type { AiChunk } from '../ai-librarian.service.js'
import { config } from '../../../config/env.js'

const baseConfig = {
  apiKey: config.OPENROUTER_API_KEY,
  model: config.OPENROUTER_MODEL,
  baseUrl: 'https://openrouter.ai/api/v1',
  timeoutMs: 30_000,
}

export const openrouterProvider: AiProvider = {
  name: 'openrouter',
  model: baseConfig.model,

  async *generate(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    signal?: AbortSignal,
    userId?: string,
  ): AsyncGenerator<AiChunk> {
    const config = userId ? { ...baseConfig, user: userId } : baseConfig

    if (!config.apiKey) {
      throw new Error('OPENROUTER_API_KEY не настроен')
    }

    yield* createChatCompletionStream({ messages, systemPrompt, config, signal })
  },

  async checkStatus() {
    const status = await checkOpenAiCompatibleStatus(baseConfig)
    if (!status.online) return status

    return {
      online: true,
      model: baseConfig.model,
    }
  },
}
