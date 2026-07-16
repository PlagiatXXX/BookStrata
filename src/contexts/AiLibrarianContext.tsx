import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import {
  streamAiChat,
  checkAiStatus,
  type ChatMessage,
  type SseEvent,
  type AiLibrarianContext as AiLibrarianPageContext,
} from '@/lib/aiLibrarianApi'
import { AiLibrarianReactContext, type AiStatus } from './aiLibrarian.context'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AiLibrarianProvider', { color: 'cyan' })

const SESSION_STORAGE_KEY = 'ai_librarian_sessions'

function loadSessions(): Record<string, ChatMessage[]> {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as Record<string, ChatMessage[]>
  } catch {
    return {}
  }
}

function saveSessions(sessions: Record<string, ChatMessage[]>) {
  try {
    // Ограничим до 20 сессий, чтобы не превысить квоту sessionStorage (~5 MB)
    const keys = Object.keys(sessions)
    if (keys.length > 20) {
      const trimmed: Record<string, ChatMessage[]> = {}
      for (const key of keys.slice(-20)) {
        trimmed[key] = sessions[key]
      }
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(trimmed))
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions))
    }
  } catch {
    logger.warn('Failed to save sessions to sessionStorage')
  }
}

export function AiLibrarianProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, ChatMessage[]>>(loadSessions)
  const [activeSessionKey, setActiveSessionKey] = useState<string>('__global')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<AiStatus>('checking')
  const abortRef = useRef<AbortController | null>(null)
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

  // Сохраняем сессии в sessionStorage при изменениях
  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  const refreshStatus = useCallback(async () => {
    setStatus('checking')
    try {
      const result = await checkAiStatus()
      setStatus(result.online ? 'online' : 'offline')
    } catch {
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__PRERENDER__) return
    refreshStatus()
  }, [refreshStatus])

  const switchSession = useCallback((sessionKey: string) => {
    setActiveSessionKey(sessionKey)
    setError(null)
    setStreamingContent('')
    abortRef.current?.abort()
  }, [])

  // Текущие сообщения из активной сессии
  const messages = sessions[activeSessionKey] ?? []

  const updateSessionMessages = useCallback(
    (sessionKey: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setSessions((prev) => {
        const current = prev[sessionKey] ?? []
        return { ...prev, [sessionKey]: updater(current) }
      })
    },
    [],
  )

  const sendMessage = useCallback(
    async (content: string, context?: AiLibrarianPageContext) => {
      if (!content.trim() || isStreaming || status !== 'online') return

      setError(null)

      abortRef.current?.abort()
      abortRef.current = new AbortController()
      const timeoutId = setTimeout(() => abortRef.current?.abort(), 65_000)

      const userMessage: ChatMessage = { role: 'user', content: content.trim() }

      // Фиксируем ключ сессии на момент отправки
      const currentSessionKey = activeSessionKey

      updateSessionMessages(currentSessionKey, (prev) => [...prev, userMessage])
      setIsStreaming(true)
      setStreamingContent('')

      let fullResponse = ''
      let assistantAdded = false

      const handleEvent = (event: SseEvent) => {
        switch (event.type) {
          case 'token':
            fullResponse += event.content
            setStreamingContent(fullResponse)
            break
          case 'done':
            if (!assistantAdded) {
              assistantAdded = true
              updateSessionMessages(currentSessionKey, (prev) => [
                ...prev,
                { role: 'assistant', content: fullResponse },
              ])
            }
            setStreamingContent('')
            setIsStreaming(false)
            break
          case 'error':
            if (!assistantAdded) {
              setError(event.message)
            }
            setIsStreaming(false)
            setStreamingContent('')
            break
        }
      }

      // Отправляем всю историю текущей сессии + новое сообщение
      const sessionMessages = sessionsRef.current[currentSessionKey] ?? []

      try {
        await streamAiChat(
          [...sessionMessages, userMessage],
          handleEvent,
          abortRef.current.signal,
          context,
        )
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (fullResponse === '') {
            setError('Сервер не ответил вовремя. Попробуйте позже.')
          }
          setIsStreaming(false)
          setStreamingContent('')
          return
        }
        const message = err instanceof Error ? err.message : 'Произошла ошибка'
        logger.error(err instanceof Error ? err : new Error(String(err)), {
          action: 'sendMessage',
        })
        setError(message)
        setIsStreaming(false)
        setStreamingContent('')
      } finally {
        clearTimeout(timeoutId)
      }
    },
    [activeSessionKey, isStreaming, status, updateSessionMessages],
  )

  const clearMessages = useCallback(() => {
    setSessions((prev) => ({ ...prev, [activeSessionKey]: [] }))
    setStreamingContent('')
    setError(null)
    abortRef.current?.abort()
  }, [activeSessionKey])

  return (
    <AiLibrarianReactContext.Provider
      value={{
        messages,
        activeSessionKey,
        isStreaming,
        streamingContent,
        error,
        status,
        sendMessage,
        clearMessages,
        refreshStatus,
        switchSession,
      }}
    >
      {children}
    </AiLibrarianReactContext.Provider>
  )
}
