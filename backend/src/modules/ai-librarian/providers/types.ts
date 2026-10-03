import type { AiChunk } from '../ai-librarian.service.js'

export interface AiProviderConfig {
  apiKey: string
  model: string
  baseUrl: string
  timeoutMs: number
  user?: string
}

export interface ProviderStatus {
  online: boolean
  model: string | null
  /** Причина недоступности (например, 403 от провайдера) — для диагностики. */
  error?: string
}

export interface AiProvider {
  readonly name: string
  readonly model: string
  generate(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    signal?: AbortSignal,
    userId?: string,
  ): AsyncGenerator<AiChunk>
  checkStatus(): Promise<ProviderStatus>
}
