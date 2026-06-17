import { createChatCompletionStream, checkOpenAiCompatibleStatus } from './openai-stream.js'
import type { AiProvider } from './types.js'
import type { AiChunk } from '../ai-librarian.service.js'

const baseConfig = {
  apiKey: process.env.OPENROUTER_API_KEY || '',
  model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct',
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
