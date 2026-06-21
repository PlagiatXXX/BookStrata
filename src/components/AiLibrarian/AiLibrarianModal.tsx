import { useEffect, useRef, useState } from 'react'
import { Send, X, RotateCcw, Wifi, WifiOff, Loader } from 'lucide-react'
import { useAiLibrarian, type AiStatus } from '@/hooks/useAiLibrarian'
import { useAuth } from '@/hooks/useAuthContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { ChatMessage } from '@/lib/aiLibrarianApi'
import { apiTrackEvent } from '@/lib/analyticsApi'

interface AiLibrarianModalProps {
  isOpen: boolean
  onClose: () => void
}

function StatusBadge({ status }: { status: AiStatus }) {
  if (status === 'checking') {
    return (
      <span className="flex items-center gap-1.5 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-mono text-yellow-400">
        <Loader className="h-3 w-3 animate-spin" />
        ПРОВЕРКА
      </span>
    )
  }
  if (status === 'online') {
    return (
      <span className="flex items-center gap-1.5 rounded border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-mono text-green-400">
        <Wifi className="h-3 w-3" />
        ONLINE
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-mono text-red-400">
      <WifiOff className="h-3 w-3" />
      OFFLINE
    </span>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const { user } = useAuth()
  const avatarUrl = user?.avatarUrl

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
    >
      <div
        className={`relative flex size-8 shrink-0 items-center justify-center border-2 border-black overflow-hidden ${
          isUser
            ? 'bg-[#c1fffe] text-black'
            : 'bg-[#232323] text-[#c1fffe]'
        }`}
      >
        {isUser ? (
          avatarUrl ? (
            <>
              <img
                src={avatarUrl}
                alt="Я"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0 right-0 flex size-3 items-center justify-center bg-[#c1fffe] text-[8px] font-black leading-none text-black ring-1 ring-black">
                Я
              </span>
            </>
          ) : (
            <span className="text-xs font-bold">Я</span>
          )
        ) : (
          <img src="/bukstrazh.webp" alt="Букстраж" className="h-full w-full object-cover" />
        )}
      </div>
      <div
        className={`max-w-[80%] border-2 border-black p-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-[#1d2323] text-[#f6f1e8]'
            : 'bg-[#171717] text-[#d4d4d4]'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  )
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-[#232323]">
        <img src="/bukstrazh.webp" alt="Букстраж" className="h-full w-full object-cover" />
      </div>
      <div className="max-w-[80%] border-2 border-black bg-[#171717] p-3 text-sm leading-relaxed text-[#d4d4d4]">
        {content ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <span className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#c1fffe]" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#c1fffe]" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#c1fffe]" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </div>
  )
}

export function AiLibrarianModal({ isOpen, onClose }: AiLibrarianModalProps) {
  const { messages, isStreaming, streamingContent, error, status, sendMessage, clearMessages, refreshStatus } =
    useAiLibrarian()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)

    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const isOffline = status === 'offline'
  const isChecking = status === 'checking'
  const canSend = !isOffline && !isChecking && !isStreaming && input.trim().length > 0

  const handleSend = async () => {
    if (!canSend) return
    const text = input
    setInput('')
    window.ym?.(109755750, 'reachGoal', 'ai_librarian')
    apiTrackEvent('ai_librarian_message')
    await sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) handleSend()
    }
  }

  const handleClear = () => {
    clearMessages()
    setInput('')
  }

  if (!isOpen) return null

  const hasMessages = messages.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 cursor-pointer bg-black/75"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-librarian-title"
        className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto border-2 border-black bg-[#111111] text-[#f6f1e8] shadow-[8px_8px_0_0_#000000] animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black bg-[#181818] p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center overflow-hidden border-2 border-black bg-[#c1fffe]">
              <img src="/bukstrazh.webp" alt="Букстраж" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c1fffe]">
                BookStrata AI
              </p>
              <h2
                id="ai-librarian-title"
                className="text-xl font-black tracking-[-0.02em] text-[#f6f1e8]"
              >
                Букстраж
              </h2>
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center gap-2">
            {isOffline && (
              <button
                type="button"
                onClick={refreshStatus}
                className="flex size-10 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                aria-label="Проверить соединение"
                title="Проверить соединение"
              >
                <Loader className="h-4 w-4" />
              </button>
            )}
            {hasMessages && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isStreaming}
                className="flex size-10 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                aria-label="Очистить диалог"
                title="Очистить диалог"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 cursor-pointer items-center justify-center border-2 border-black bg-[#0a0a0a] text-[#9aa1a3] transition-colors hover:border-[#c1fffe] hover:text-[#f6f1e8] focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto [overscroll-behavior:contain] bg-[#111111] p-5">
          {!hasMessages && !isStreaming ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center overflow-hidden border-2 border-black bg-[#1d2323]">
                <img src="/bukstrazh.webp" alt="Букстраж" className="h-full w-full object-cover" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-[#f6f1e8]">
                Букстраж
              </h3>
              {isOffline ? (
                <>
                  <p className="mb-1 max-w-xs text-sm text-red-400">
                    Букстраж недоступен.
                  </p>
                  <p className="mb-4 text-xs text-[#7d8688]">
                    Проверьте API-ключ и подключение к интернету.
                  </p>
                  <button
                    type="button"
                    onClick={refreshStatus}
                    disabled={isChecking}
                    className="flex cursor-pointer items-center gap-2 border-2 border-black bg-[#1d2323] px-6 py-3 text-sm font-bold text-[#f6f1e8] transition-colors hover:bg-[#232d2d] disabled:opacity-50"
                  >
                    {isChecking ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Loader className="h-4 w-4" />
                    )}
                    Проверить ещё раз
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-1 max-w-xs text-sm text-[#a8abad]">
                    Я проанализирую твои тир-листы и посоветую книги, которые тебе точно понравятся.
                  </p>
                  <p className="text-xs text-[#7d8688]">
                    Напиши что-нибудь, например: «Что мне почитать из фантастики?»
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}

              {isStreaming && <StreamingBubble content={streamingContent} />}

              {error && (
                <div className="border-2 border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t-2 border-black bg-[#0a0a0a] p-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Send className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8688]" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isOffline
                    ? 'AI недоступен...'
                    : isStreaming
                      ? 'AI отвечает...'
                      : 'Спроси у библиотекаря...'
                }
                disabled={isStreaming || isOffline}
                aria-label="Сообщение для AI-библиотекаря"
                className="w-full border-2 border-black bg-[#111] py-3 pl-10 pr-4 text-[#f6f1e8] placeholder:text-[#6f7577] outline-none transition-colors focus:border-[#c1fffe] focus-within:ring-2 focus-within:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="flex cursor-pointer items-center gap-2 border-2 border-black bg-[#c1fffe] px-6 py-3 font-black text-black transition-colors hover:bg-[#9cf5f3] disabled:cursor-not-allowed disabled:bg-[#5f6667] disabled:text-black disabled:opacity-100 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
              aria-label="Отправить сообщение"
            >
              {isStreaming ? (
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black" style={{ animationDelay: '300ms' }} />
                </span>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
