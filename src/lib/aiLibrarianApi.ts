import { API_BASE_URL } from './config'
import { apiClient } from './api-client'
import { getAuthHeader, refreshAccessToken, handleUnauthorized } from './authApi'
import { createLogger } from './logger'

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

export interface AiLibrarianContext {
  pageType: 'rankings' | 'collection' | 'book-description' | 'celebrity'
  slug?: string
}

export async function generateBookDescription(
  title: string,
  author: string,
  signal?: AbortSignal,
): Promise<string> {
  const message = author
    ? `Напиши описание для книги «${title}» (${author})`
    : `Напиши описание для книги «${title}»`

  return new Promise<string>((resolve, reject) => {
    const messages: ChatMessage[] = [{ role: 'user', content: message }]
    let fullResponse = ''
    let settled = false

    streamAiChat(
      messages,
      (event) => {
        if (settled) return
        switch (event.type) {
          case 'token':
            fullResponse += event.content
            break
          case 'done':
            settled = true
            resolve(fullResponse.trim())
            break
          case 'error':
            settled = true
            reject(new Error(event.message))
            break
        }
      },
      signal,
      { pageType: 'book-description' },
    ).catch((err) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    })
  })
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
  context?: AiLibrarianContext,
): Promise<void> {
  const body: Record<string, unknown> = { messages }
  if (context) {
    body.context = context
  }

  let response = await fetch(`${API_BASE_URL}/ai/librarian/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(body),
    signal,
  })

  if (response.status === 401) {
    try {
      await refreshAccessToken()
      response = await fetch(`${API_BASE_URL}/ai/librarian/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(body),
        signal,
      })
    } catch {
      handleUnauthorized()
      throw new Error('Требуется авторизация. Пожалуйста, войдите в систему.')
    }
  }

  if (!response.ok) {
    let errorMessage = 'Ошибка соединения с AI-библиотекарем'
    try {
      const errData = await response.json()
      errorMessage = errData?.error?.message || errData?.error || errorMessage
    } catch {
      // ignore parse error
    }
    if (response.status === 403) {
      throw new Error('Букстраж доступен только для Pro подписки')
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
      if (done) {
        // Если стрим закрылся без события done/error — отправляем done принудительно
        onEvent({ type: 'done' })
        break
      }

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
