import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowLeft, MessageCircle, Send, Reply, Edit3, Trash2, X, Check, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuthContext"
import {
  getDiscussionByBattle,
  getGeneralDiscussion,
  getDiscussionById,
  createDiscussion,
  createMessage,
  updateMessage,
  deleteMessage,
} from "@/lib/discussionApi"
import type { Discussion, DiscussionMessage } from "@/types/discussions"
import "./DiscussionSection.css"

interface DiscussionSectionProps {
  variant: "battle" | "general" | "topic"
  battleId?: string
  discussionId?: string
  title?: string
  onBack?: () => void
}

export function DiscussionSection({ variant, battleId, discussionId, title, onBack }: DiscussionSectionProps) {
  const { user, isAuthenticated } = useAuth()
  const [discussion, setDiscussion] = useState<Discussion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState("")
  const [replyTo, setReplyTo] = useState<DiscussionMessage | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialLoadRef = useRef(true)

  const sectionTitle = discussion?.title
    ?? title
    ?? (variant === "battle" ? "Комментарии" : "Обсуждение")

  const scrollToBottom = useCallback(() => {
    const container = document.querySelector(".discussion-messages")
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [])

  const loadDiscussion = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      let data: Discussion | null = null
      if (variant === "topic" && discussionId) {
        data = await getDiscussionById(discussionId)
      } else if (variant === "general") {
        data = await getGeneralDiscussion()
      } else if (variant === "battle" && battleId) {
        data = await getDiscussionByBattle(battleId)
      }
      setDiscussion(data)
    } catch {
      if (variant === "battle") {
        setDiscussion(null)
      } else {
        setError("Не удалось загрузить обсуждение")
      }
    } finally {
      setLoading(false)
    }
  }, [variant, battleId, discussionId])

  useEffect(() => {
    loadDiscussion()
  }, [loadDiscussion])

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      return
    }
    scrollToBottom()
  }, [discussion?.messages.length, scrollToBottom])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending || !isAuthenticated) return
    setSending(true)
    try {
      let d = discussion
      if (!d && variant === "battle" && battleId) {
        d = await createDiscussion(battleId)
        setDiscussion(d)
      }
      if (!d) {
        setError("Нет обсуждения для отправки")
        setSending(false)
        return
      }
      // Всегда цепляем parentId к корневому сообщению (не к вложенному reply),
      // чтобы не плодить каскады — все replies плоские, один уровень вложенности
      const parentId = replyTo ? (replyTo.parentId ?? replyTo.id) : undefined
      await createMessage(d.id, text, parentId)
      setInput("")
      setReplyTo(null)
      await loadDiscussion()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки")
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEdit = async (messageId: string) => {
    const text = editContent.trim()
    if (!text || !discussion) return
    try {
      await updateMessage(discussion.id, messageId, text)
      setEditingId(null)
      setEditContent("")
      await loadDiscussion()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка редактирования")
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!discussion) return
    try {
      await deleteMessage(discussion.id, messageId)
      await loadDiscussion()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления")
    }
  }

  const canDelete = (msg: DiscussionMessage) => {
    if (!user) return false
    const role = user.role
    return role === "admin" || role === "moderator"
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return formatTime(iso)
    if (d.toDateString() === yesterday.toDateString()) return `Вчера ${formatTime(iso)}`
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + " " + formatTime(iso)
  }

  const startEdit = (msg: DiscussionMessage) => {
    setEditingId(msg.id)
    setEditContent(msg.content)
    setReplyTo(null)
  }

  const cancelReply = () => {
    setReplyTo(null)
    inputRef.current?.focus()
  }

  if (loading) {
    return (
      <section className="discussion-section">
        <div className="discussion-header">
          <MessageCircle size={20} />
          <h2>{sectionTitle}</h2>
        </div>
        <div className="discussion-loading">
          <Loader2 size={24} className="animate-spin" />
        </div>
      </section>
    )
  }

  return (
    <section className="discussion-section">
      <div className="discussion-header">
        {onBack && (
          <button onClick={onBack} className="discussion-back-btn" title="Назад к списку">
            <ArrowLeft size={18} />
          </button>
        )}
        <MessageCircle size={20} />
        <h2>{sectionTitle}</h2>
        {discussion && (
          <span className="discussion-count">{discussion.messages.length}</span>
        )}
      </div>

      {error && (
        <div className="discussion-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      <div className="discussion-messages">
        {discussion && discussion.messages.length > 0 ? (
          discussion.messages.map((msg) => (
            <ChatMessageRow
              key={msg.id}
              message={msg}
              userId={user?.userId}
              isAuthenticated={!!isAuthenticated}
              editingId={editingId}
              editContent={editContent}
              canDelete={canDelete(msg)}
              onReply={(m) => { setReplyTo(m); inputRef.current?.focus() }}
              onStartEdit={startEdit}
              onEditChange={setEditContent}
              onEditSubmit={handleEdit}
              onCancelEdit={() => setEditingId(null)}
              onDelete={handleDelete}
              formatDate={formatDate}
            />
          ))
        ) : (
          <div className="discussion-empty">
            {variant === "battle" ? "Пока нет комментариев" : "Пока нет сообщений"}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="discussion-input-area">
        {replyTo && (
          <div className="discussion-reply-indicator">
            <Reply size={12} />
            <span>{replyTo.user.username}</span>
            <button onClick={cancelReply} className="reply-indicator-close" title="Отменить ответ">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="discussion-input-bar">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAuthenticated
                ? replyTo ? `Ответ ${replyTo.user.username}...` : "Написать сообщение..."
                : "Войдите, чтобы писать"
            }
            disabled={!isAuthenticated}
            rows={1}
            className="discussion-input"
          />
          <button
            onClick={handleSend}
            disabled={!isAuthenticated || !input.trim() || sending}
            className="discussion-send-btn"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </section>
  )
}

interface ChatMessageRowProps {
  message: DiscussionMessage
  userId?: number
  isAuthenticated: boolean
  editingId: string | null
  editContent: string
  canDelete: boolean
  onReply: (msg: DiscussionMessage) => void
  onStartEdit: (msg: DiscussionMessage) => void
  onEditChange: (val: string) => void
  onEditSubmit: (id: string) => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
  formatDate: (iso: string) => string
}

function ChatMessageRow({
  message,
  userId,
  isAuthenticated,
  editingId,
  editContent,
  canDelete,
  onReply,
  onStartEdit,
  onEditChange,
  onEditSubmit,
  onCancelEdit,
  onDelete,
  formatDate,
}: ChatMessageRowProps) {
  const isEditing = editingId === message.id
  const isOwner = userId === message.userId

  return (
    <div className="chat-message">
      <div className="chat-message-avatar">
        {message.user.avatarUrl ? (
          <img src={message.user.avatarUrl} alt="" />
        ) : (
          <span>{message.user.username?.[0]?.toUpperCase() || "?"}</span>
        )}
      </div>
      <div className="chat-message-body">
        <div className="chat-message-meta">
          <span className="chat-message-username">
            {message.user.username}
            {message.user.role?.name === "admin" && <span className="chat-badge-admin">Админ</span>}
            {message.user.role?.name === "moderator" && <span className="chat-badge-mod">Мод</span>}
          </span>
          {message.parent?.user?.username && (
            <span className="chat-message-reply-to">
              <Reply size={10} />
              @{message.parent.user.username}
            </span>
          )}
          <span className="chat-message-time">{formatDate(message.createdAt)}</span>
          {message.createdAt !== message.updatedAt && (
            <span className="chat-message-edited">изменено</span>
          )}
          {!isEditing && (
            <span className="chat-message-actions">
              {isAuthenticated && (
                <button onClick={() => onReply(message)} className="msg-action-btn" title="Ответить">
                  <Reply size={10} />
                </button>
              )}
              {isOwner && (
                <button onClick={() => onStartEdit(message)} className="msg-action-btn" title="Редактировать">
                  <Edit3 size={10} />
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete(message.id)} className="msg-action-btn msg-action-delete" title="Удалить">
                  <Trash2 size={10} />
                </button>
              )}
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="chat-message-edit">
            <textarea
              value={editContent}
              onChange={(e) => onEditChange(e.target.value)}
              autoFocus
              rows={2}
            />
            <div className="chat-message-edit-actions">
              <button onClick={() => onEditSubmit(message.id)} className="edit-confirm">
                <Check size={14} />
              </button>
              <button onClick={onCancelEdit} className="edit-cancel">
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <p className="chat-message-content">{message.content}</p>
        )}
      </div>
    </div>
  )
}
