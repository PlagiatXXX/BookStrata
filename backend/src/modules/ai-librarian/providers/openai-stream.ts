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

  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 2048,
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

export async function checkOpenAiCompatibleStatus(
  config: AiProviderConfig,
): Promise<{ online: boolean; model: string | null }> {
  try {
    const headers: Record<string, string> = {}
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const response = await fetch(`${config.baseUrl}/models`, {
      headers,
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return { online: false, model: null }

    const data = (await response.json()) as { data?: Array<{ id: string }> }
    const models = data?.data?.map((m) => m.id) || []

    return {
      online: models.length > 0,
      model: models[0] || null,
    }
  } catch {
    return { online: false, model: null }
  }
}
