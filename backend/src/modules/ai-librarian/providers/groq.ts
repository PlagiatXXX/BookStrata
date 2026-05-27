import { createChatCompletionStream, checkOpenAiCompatibleStatus } from './openai-stream.js'
import type { AiProvider } from './types.js'
import type { AiChunk } from '../ai-librarian.service.js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1'

const config = {
  apiKey: process.env.GROQ_API_KEY || '',
  model: process.env.GROQ_MODEL || 'llama3-70b-8192',
  baseUrl: GROQ_API_URL,
  timeoutMs: 15_000,
}

export const groqProvider: AiProvider = {
  name: 'groq',
  model: config.model,

  async *generate(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    signal?: AbortSignal,
    _userId?: string,
  ): AsyncGenerator<AiChunk> {
    yield* createChatCompletionStream({ messages, systemPrompt, config, signal })
  },

  async checkStatus() {
    return checkOpenAiCompatibleStatus(config)
  },
}
