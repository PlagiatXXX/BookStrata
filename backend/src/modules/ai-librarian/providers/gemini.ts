import { createChatCompletionStream, checkOpenAiCompatibleStatus } from './openai-stream.js'
import type { AiProvider } from './types.js'
import type { AiChunk } from '../ai-librarian.service.js'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'

const config = {
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  baseUrl: GEMINI_API_URL,
  timeoutMs: 15_000,
}

export const geminiProvider: AiProvider = {
  name: 'gemini',
  model: config.model,

  async *generate(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    signal?: AbortSignal,
  ): AsyncGenerator<AiChunk> {
    yield* createChatCompletionStream({ messages, systemPrompt, config, signal })
  },

  async checkStatus() {
    return checkOpenAiCompatibleStatus(config)
  },
}
