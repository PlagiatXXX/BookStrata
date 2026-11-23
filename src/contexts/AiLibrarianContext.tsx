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

  const streamChatSession = useCallback(
    async (
      currentSessionKey: string,
      messagesToStream: ChatMessage[],
      context?: AiLibrarianPageContext,
    ) => {
      setError(null)

      abortRef.current?.abort()
      abortRef.current = new AbortController()
      const timeoutId = setTimeout(() => abortRef.current?.abort(), 65_000)

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

      // Отправляем последние 20 сообщений; assistant-ответы подрезаем до 8000 символов
      const formatted = messagesToStream
        .slice(-20)
        .map((m) =>
          m.role === 'assistant' && m.content.length > 8000
            ? { ...m, content: m.content.slice(0, 8000) }
            : m,
        )

      try {
        await streamAiChat(
          formatted,
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
    [updateSessionMessages],
  )

  const sendMessage = useCallback(
    async (content: string, context?: AiLibrarianPageContext) => {
      if (!content.trim() || isStreaming || status !== 'online') return

      const userMessage: ChatMessage = { role: 'user', content: content.trim() }
      const currentSessionKey = activeSessionKey

      updateSessionMessages(currentSessionKey, (prev) => [...prev, userMessage])
      const previousMessages = sessionsRef.current[currentSessionKey] ?? []

      await streamChatSession(
        currentSessionKey,
        [...previousMessages, userMessage],
        context,
      )
    },
    [activeSessionKey, isStreaming, status, streamChatSession, updateSessionMessages],
  )

  const retryLastMessage = useCallback(
    async (context?: AiLibrarianPageContext) => {
      if (isStreaming || status !== 'online') return
      const currentSessionKey = activeSessionKey
      const currentMessages = sessionsRef.current[currentSessionKey] ?? []
      if (currentMessages.length === 0) return

      const lastMessage = currentMessages[currentMessages.length - 1]
      if (lastMessage?.role !== 'user') return

      await streamChatSession(currentSessionKey, currentMessages, context)
    },
    [activeSessionKey, isStreaming, status, streamChatSession],
  )

  const editLastMessage = useCallback(() => {
    const currentSessionKey = activeSessionKey
    const currentMessages = sessionsRef.current[currentSessionKey] ?? []
    if (currentMessages.length === 0) return null

    const lastMessage = currentMessages[currentMessages.length - 1]
    if (lastMessage?.role !== 'user') return null

    updateSessionMessages(currentSessionKey, (prev) => prev.slice(0, -1))
    setError(null)
    setStreamingContent('')
    return lastMessage.content
  }, [activeSessionKey, updateSessionMessages])

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
        retryLastMessage,
        editLastMessage,
        clearMessages,
        refreshStatus,
        switchSession,
      }}
    >
      {children}
    </AiLibrarianReactContext.Provider>
  )
}
