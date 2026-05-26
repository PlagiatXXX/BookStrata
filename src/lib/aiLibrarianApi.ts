import { API_BASE_URL } from './config'
import { getAuthHeader } from './authApi'
import { createLogger } from './logger'
import { apiClient } from './api-client'

const logger = createLogger('AiLibrarianApi', { color: 'cyan' })

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type SseEvent =
  | { type: 'token'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface AiStatusResponse {
  online: boolean
  model: string | null
}

export async function checkAiStatus(): Promise<AiStatusResponse> {
  try {
    return await apiClient.get<AiStatusResponse>('/ai/librarian/status')
  } catch {
    return { online: false, model: null }
  }
}

export async function streamAiChat(
  messages: ChatMessage[],
  onEvent: (event: SseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ai/librarian/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok) {
    let errorMessage = 'Ошибка соединения с AI-библиотекарем'
    try {
      const errData = await response.json()
      errorMessage = errData?.error?.message || errData?.error || errorMessage
    } catch {
      // ignore parse error
    }
    if (response.status === 403) {
      throw new Error('ИИ-библиотекарь доступен только для Pro подписки')
    }
    throw new Error(errorMessage)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body stream')
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
        try {
          const event = JSON.parse(data) as SseEvent
          onEvent(event)
          if (event.type === 'done' || event.type === 'error') return
        } catch {
          logger.warn('Failed to parse SSE event', { data })
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
