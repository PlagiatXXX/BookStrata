import { useState, useRef, useCallback, useEffect } from 'react'
import { streamAiChat, checkAiStatus, type ChatMessage, type SseEvent, type AiLibrarianContext } from '@/lib/aiLibrarianApi'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useAiLibrarian', { color: 'cyan' })

export type AiStatus = 'checking' | 'online' | 'offline'

export interface UseAiLibrarianReturn {
  messages: ChatMessage[]
  isStreaming: boolean
  streamingContent: string
  error: string | null
  status: AiStatus
  sendMessage: (content: string, context?: AiLibrarianContext) => Promise<void>
  clearMessages: () => void
  refreshStatus: () => void
}

export function useAiLibrarian(): UseAiLibrarianReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<AiStatus>('checking')
  const abortRef = useRef<AbortController | null>(null)

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
    refreshStatus()
  }, [refreshStatus])

  const sendMessage = useCallback(async (content: string, context?: AiLibrarianContext) => {
    if (!content.trim() || isStreaming || status !== 'online') return

    setError(null)

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const timeoutId = setTimeout(() => abortRef.current?.abort(), 65_000)

    const userMessage: ChatMessage = { role: 'user', content: content.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsStreaming(true)
    setStreamingContent('')

    let fullResponse = ''

    const handleEvent = (event: SseEvent) => {
      switch (event.type) {
        case 'token':
          fullResponse += event.content
          setStreamingContent(fullResponse)
          break
        case 'done':
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: fullResponse },
          ])
          setStreamingContent('')
          setIsStreaming(false)
          break
        case 'error':
          setError(event.message)
          setIsStreaming(false)
          setStreamingContent('')
          break
      }
    }

    try {
      await streamAiChat(updatedMessages, handleEvent, abortRef.current.signal, context)
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
  }, [messages, isStreaming, status])

  const clearMessages = useCallback(() => {
    setMessages([])
    setStreamingContent('')
    setError(null)
    abortRef.current?.abort()
  }, [])

  return {
    messages,
    isStreaming,
    streamingContent,
    error,
    status,
    sendMessage,
    clearMessages,
    refreshStatus,
  }
}
