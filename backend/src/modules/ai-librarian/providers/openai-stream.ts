import type { AiChunk } from '../ai-librarian.service.js'
import type { AiProviderConfig } from './types.js'

export interface OpenAiStreamOptions {
  messages: Array<{ role: string; content: string }>
  systemPrompt: string
  config: AiProviderConfig
  signal?: AbortSignal | undefined
}

export async function* createChatCompletionStream(
  options: OpenAiStreamOptions,
): AsyncGenerator<AiChunk> {
  const { messages, systemPrompt, config, signal } = options

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    // 0.7 — reasoning-модели (gpt-oss и т.п.) зацикливаются на низкой температуре;
    // 4096 — reasoning-блок жрёт основной бюджет токенов max_tokens.
    temperature: 0.7,
    max_tokens: 4096,
  }

  if (config.user) {
    body.user = config.user
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const timeoutSignal = AbortSignal.timeout(config.timeoutMs)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: combinedSignal,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`${config.baseUrl} error: ${response.status} ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('AI API returned no body stream')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          yield { content: '', done: true }
          return
        }

        try {
          const parsed = JSON.parse(data)
          const content = parsed?.choices?.[0]?.delta?.content || ''
          if (content) {
            yield { content, done: false }
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { content: '', done: true }
}

const PROBE_TIMEOUT_MS = 5000
const PROBE_ERROR_MAX_LENGTH = 300

function truncateProbeError(text: string): string {
  if (text.length <= PROBE_ERROR_MAX_LENGTH) return text
  return `${text.slice(0, PROBE_ERROR_MAX_LENGTH - 1)}…`
}

/**
 * Реальная проба генерации: POST /chat/completions с max_tokens:1.
 * GET /models недостаточно — модель может быть в каталоге, но недоступна
 * по тарифу/ключу (тогда провайдер отдаёт 403 только на chat/completions).
 */
export async function probeChatCompletion(
  config: AiProviderConfig,
): Promise<{ ok: boolean; error?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        stream: false,
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })

    if (response.ok) return { ok: true }

    const errorText = await response.text().catch(() => '')
    return { ok: false, error: truncateProbeError(`HTTP ${response.status} ${errorText}`) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: truncateProbeError(message) }
  }
}

export async function checkOpenAiCompatibleStatus(
  config: AiProviderConfig,
): Promise<{ online: boolean; model: string | null; error?: string }> {
  const probe = await probeChatCompletion(config)
  if (!probe.ok) {
    return { online: false, model: null, error: probe.error }
  }
  return { online: true, model: config.model }
}
