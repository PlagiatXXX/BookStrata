import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Send, X, RotateCcw, Wifi, WifiOff, Loader } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAiLibrarian, type AiStatus } from '@/hooks/useAiLibrarian'
import { useAuth } from '@/hooks/useAuthContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { ChatMessage, AiLibrarianContext } from '@/lib/aiLibrarianApi'
import { apiTrackEvent } from '@/lib/analyticsApi'

/* ─── Suggestion chips ─── */

const SUGGESTIONS = [
  { emoji: '📚', label: 'Что почитать из классики?' },
  { emoji: '🔥', label: 'Посоветуй бестселлер' },
  { emoji: '🎯', label: 'Подбери книгу под настроение' },
  { emoji: '✨', label: 'Что нового я могу открыть?' },
] as const

/* ─── Draft statuses (pre-first-token) ─── */

const DRAFT_STATUSES = [
  'Шуршит страницами твоих тир-листов…',
  'Нюхает корешки в поисках жемчужин…',
  'Лапкой собирает идеальную подборку…',
]

/* ─── Simple markdown renderer ─── */

function renderInline(text: string): React.ReactNode {
  const patterns: [RegExp, (m: RegExpExecArray, i: number) => React.ReactNode][] = [
    // Bold **text**
    [/\*\*([^*]+)\*\*/g, (m) => <strong key={m.index}>{m[1]}</strong>],
    // Italic *text*
    [/\*([^*]+)\*/g, (m) => <em key={m.index}>{m[1]}</em>],
    // Link [text](url)
    [/\[([^\]]+)\]\(([^)]+)\)/g, (m) => (
      <a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer" className="underline decoration-cyan-400/50 underline-offset-2 text-cyan-300 hover:text-cyan-200 transition-colors">
        {m[1]}
      </a>
    )],
  ]

  let result: React.ReactNode[] = [text]
  for (const [regex, render] of patterns) {
    const next: React.ReactNode[] = []
    for (const seg of result) {
      if (typeof seg !== 'string') {
        next.push(seg)
        continue
      }
      let lastIndex = 0
      let match: RegExpExecArray | null
      const copy = regex
      copy.lastIndex = 0
      while ((match = copy.exec(seg as string)) !== null) {
        if (match.index > lastIndex) {
          next.push(seg.slice(lastIndex, match.index))
        }
        next.push(render(match, next.length))
        lastIndex = copy.lastIndex
      }
      if (lastIndex < (seg as string).length) {
        next.push(seg.slice(lastIndex))
      }
    }
    result = next
  }
  return <>{result}</>
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let inList = false

  const flushList = (key: string | number) => {
    if (inList && listItems.length > 0) {
      blocks.push(
        <ul key={key} className="my-1.5 space-y-1 pl-5">
          {listItems}
        </ul>,
      )
      listItems = []
      inList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (/^[-*]\s/.test(line)) {
      const content = line.replace(/^[-*]\s/, '')
      listItems.push(
        <li key={`li-${i}`} className="text-[#d4d4d4] leading-relaxed marker:text-[#7d8688]">
          {renderInline(content)}
        </li>,
      )
      inList = true
      continue
    }

    flushList(`ul-${i}`)
    if (line.trim() === '') continue

    blocks.push(
      <p key={`p-${i}`} className="mb-2 last:mb-0 leading-relaxed">
        {renderInline(line)}
      </p>,
    )
  }

  flushList('ul-end')
  return <>{blocks}</>
}

/* ─── Auto-resize textarea ─── */

function useAutosizeTextarea(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const resize = () => {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }
    resize()
  }, [ref, value])
}

/* ─── Responsive hook ─── */

function useIsMobile(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia('(max-width: 767px)')
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    () => window.matchMedia('(max-width: 767px)').matches,
    () => false,
  )
}

/* ─── StatusBadge ─── */

function StatusBadge({ status }: { status: AiStatus }) {
  if (status === 'checking') {
    return (
      <span className="flex items-center gap-1.5 rounded-md border border-yellow-500/25 bg-yellow-500/8 px-2 py-0.5 text-[10px] font-mono font-semibold text-yellow-400">
        <Loader className="h-3 w-3 animate-spin" />
        ПРОВЕРКА
      </span>
    )
  }
  if (status === 'online') {
    return (
      <span className="flex items-center gap-1.5 rounded-md border border-green-500/25 bg-green-500/8 px-2 py-0.5 text-[10px] font-mono font-semibold text-green-400">
        <Wifi className="h-3 w-3" />
        ONLINE
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 rounded-md border border-red-500/25 bg-red-500/8 px-2 py-0.5 text-[10px] font-mono font-semibold text-red-400">
      <WifiOff className="h-3 w-3" />
      OFFLINE
    </span>
  )
}

/* ─── ChatBubble ─── */

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const { user } = useAuth()
  const avatarUrl = user?.avatarUrl

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`relative flex size-8 shrink-0 items-center justify-center border-2 border-black/10 overflow-hidden ${
          isUser
            ? 'bg-[#c1fffe] text-black rounded-lg'
            : 'bg-[#232323] text-[#c1fffe] rounded-lg'
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
              <span className="absolute bottom-0 right-0 flex size-3 items-center justify-center bg-[#c1fffe] text-[8px] font-black leading-none text-black ring-1 ring-black/20">
                Я
              </span>
            </>
          ) : (
            <span className="text-xs font-bold">Я</span>
          )
        ) : (
          <img
            src="/Selfi.webp"
            alt="Букстраж"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-xl border border-black/10 px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-[#1d2323] text-[#f6f1e8] rounded-tr-sm'
              : 'bg-[#171717] text-[#d4d4d4] rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            renderMarkdown(message.content)
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── StreamingBubble ─── */

function StreamingBubble({
  content,
  statusText,
}: {
  content: string
  statusText?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="flex gap-3"
    >
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden border-2 border-black/10 rounded-lg bg-[#232323]">
        <img
          src="/Selfi.webp"
          alt="Букстраж"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="max-w-[80%] flex flex-col items-start">
        <div className="rounded-xl rounded-tl-sm border border-black/10 bg-[#171717] px-4 py-2.5 text-sm leading-relaxed text-[#d4d4d4]">
          {content ? (
            <motion.p
              key={content}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="whitespace-pre-wrap break-words"
            >
              {content}
            </motion.p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-[#7d8688]">
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7d8688]" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7d8688]" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7d8688]" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="italic">{statusText}</span>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── SuggestionChips ─── */

function SuggestionChips({
  onSelect,
  disabled,
}: {
  onSelect: (text: string) => void
  disabled: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onSelect(s.label)}
          disabled={disabled}
          className="group flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3.5 py-2 text-xs font-medium text-[#a8abad] transition-all duration-200 hover:border-[#c1fffe]/30 hover:bg-[#c1fffe]/6 hover:text-[#f6f1e8] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
        >
          <span className="text-sm">{s.emoji}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </motion.div>
  )
}

/* ─── Props ─── */

interface AiLibrarianModalProps {
  isOpen: boolean
  onClose: () => void
  context?: AiLibrarianContext
  variant?: 'modal' | 'sidebar'
}

/* ─── Main component ─── */

export function AiLibrarianModal({ isOpen, onClose, context, variant = 'modal' }: AiLibrarianModalProps) {
  const {
    messages,
    isStreaming,
    streamingContent,
    error,
    status,
    sendMessage,
    clearMessages,
    refreshStatus,
  } = useAiLibrarian()
  const [input, setInput] = useState('')
  const [draftStatusIndex, setDraftStatusIndex] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useBodyScrollLock(isOpen)
  useAutosizeTextarea(textareaRef, input)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Rotate pre-token statuses
  useEffect(() => {
    if (isStreaming && !streamingContent) {
      const interval = setInterval(() => {
        setDraftStatusIndex((prev) => (prev + 1) % DRAFT_STATUSES.length)
      }, 1800)
      return () => clearInterval(interval)
    }
  }, [isStreaming, streamingContent])

  const isMobile = useIsMobile()
  const effectiveVariant = variant === 'sidebar' && isMobile ? 'modal' : variant

  const isOffline = status === 'offline'
  const isChecking = status === 'checking'
  const canSend = !isOffline && !isChecking && !isStreaming && input.trim().length > 0
  const hasMessages = messages.length > 0

  const handleSend = async () => {
    if (!canSend) return
    const text = input
    setInput('')
    window.ym?.(109755750, 'reachGoal', 'ai_librarian')
    apiTrackEvent('ai_librarian_message')
    await sendMessage(text, context)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) handleSend()
    }
  }

  const handleClear = () => {
    clearMessages()
    setInput('')
  }

  const handleSuggestion = (text: string) => {
    setInput('')
    window.ym?.(109755750, 'reachGoal', 'ai_librarian')
    apiTrackEvent('ai_librarian_suggestion')
    sendMessage(text, context)
  }

  const panelContent = (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-[#c1fffe]">
            <img src="/Selfi.webp" alt="Букстраж" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="ai-librarian-title"
                className="text-base font-black tracking-[-0.02em] text-[#f6f1e8]"
              >
                Букстраж
              </h2>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs font-medium text-[#7d8688]">
              Твой личный ИИ-библиотекарь
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isOffline && (
            <IconButton
              onClick={refreshStatus}
              label="Проверить соединение"
              title="Проверить соединение"
            >
              <Loader className="h-4 w-4" />
            </IconButton>
          )}
          {hasMessages && (
            <IconButton
              onClick={handleClear}
              disabled={isStreaming}
              label="Очистить диалог"
              title="Очистить диалог"
            >
              <RotateCcw className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton onClick={onClose} label="Закрыть" title="Закрыть">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto [overscroll-behavior:contain] bg-[#111111] px-5 py-4">
        {!hasMessages && !isStreaming ? (
          <div className="flex h-full flex-col items-center justify-start pt-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="mb-4 flex size-14 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-[#1d2323]"
            >
              <img src="/Selfi.webp" alt="Букстраж" className="h-full w-full object-cover" />
            </motion.div>

            {isOffline ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="mb-2 text-base font-bold text-[#f6f1e8]">
                  Букстраж недоступен
                </h3>
                <p className="mb-1 max-w-xs text-sm text-red-400">
                  Проверьте API-ключ и подключение к интернету.
                </p>
                <button
                  type="button"
                  onClick={refreshStatus}
                  disabled={isChecking}
                  className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-5 py-2.5 text-sm font-bold text-[#f6f1e8] transition-all duration-200 hover:bg-white/10 hover:border-white/20 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                >
                  {isChecking ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Loader className="h-4 w-4" />
                  )}
                  Проверить ещё раз
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="mb-2 text-base font-bold text-[#f6f1e8]">
                  Привет, я Букстраж
                </h3>
                <p className="mb-5 mx-auto max-w-sm text-sm text-[#a8abad] leading-relaxed">
                  Я проанализирую твои тир-листы и посоветую книги, которые тебе точно понравятся.
                </p>
                <SuggestionChips onSelect={handleSuggestion} disabled={isStreaming} />
              </motion.div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}

            {isStreaming && (
              <StreamingBubble
                content={streamingContent}
                statusText={DRAFT_STATUSES[draftStatusIndex]}
              />
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-2.5 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="border-t border-white/8 bg-[#0a0a0a] px-5 py-4">
        <div className="flex gap-2 items-end">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
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
              className="w-full resize-none rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 pr-12 text-sm text-[#f6f1e8] placeholder:text-[#5f6667] outline-none transition-all duration-200 focus:border-[#c1fffe]/40 focus:ring-1 focus:ring-[#c1fffe]/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#c1fffe] px-4 py-2.5 font-black text-black transition-all duration-200 hover:bg-[#9cf5f3] hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-[#3d4345] disabled:text-[#7d8688] disabled:hover:scale-100 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            aria-label="Отправить сообщение"
          >
            {isStreaming ? (
              <span className="flex gap-0.5">
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
    </>
  )

  return (
    <AnimatePresence>
      {isOpen && effectiveVariant === 'modal' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.8 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-librarian-title"
            className="relative mx-auto flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#111111] text-[#f6f1e8] shadow-2xl shadow-black/60"
          >
            {panelContent}
          </motion.div>
        </motion.div>
      )}

      {isOpen && effectiveVariant === 'sidebar' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex justify-start"
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.8 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-librarian-title"
            className="relative flex h-full w-1/2 min-w-[360px] max-w-[640px] flex-col border-r border-white/10 bg-[#111111] text-[#f6f1e8] shadow-2xl shadow-black/60"
          >
            {panelContent}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── IconButton (shared) ─── */

function IconButton({
  children,
  onClick,
  disabled,
  label,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  label: string
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
      className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-white/8 bg-white/4 text-[#7d8688] transition-all duration-200 hover:border-[#c1fffe]/30 hover:bg-[#c1fffe]/6 hover:text-[#f6f1e8] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
    >
      {children}
    </button>
  )
}
