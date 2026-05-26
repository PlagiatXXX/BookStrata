import type { AiChunk } from '../ai-librarian.service.js'

export interface AiProviderConfig {
  apiKey: string
  model: string
  baseUrl: string
  timeoutMs: number
}

export interface AiProvider {
  readonly name: string
  readonly model: string
  generate(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    signal?: AbortSignal,
  ): AsyncGenerator<AiChunk>
  checkStatus(): Promise<{ online: boolean; model: string | null }>
}
