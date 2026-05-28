import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, Send, Reply, Edit3, Trash2, X, Check, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuthContext"
import {
  getDiscussionByBattle,
  getGeneralDiscussion,
  createDiscussion,
  createMessage,
  updateMessage,
  deleteMessage,
} from "@/lib/discussionApi"
import type { Discussion, DiscussionMessage } from "@/types/discussions"
import "./DiscussionSection.css"

interface DiscussionSectionProps {
  variant: "battle" | "general"
  battleId?: string
  title?: string
}

export function DiscussionSection({ variant, battleId, title }: DiscussionSectionProps) {
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

  const sectionTitle = title ?? (variant === "battle" ? "Комментарии" : "Обсуждение")

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const loadDiscussion = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = variant === "general"
        ? await getGeneralDiscussion()
        : battleId
          ? await getDiscussionByBattle(battleId)
          : null
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
  }, [variant, battleId])

  useEffect(() => {
    loadDiscussion()
  }, [loadDiscussion])

  useEffect(() => {
    if (!loading) scrollToBottom()
  }, [loading, discussion?.messages.length, scrollToBottom])

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
      await createMessage(d.id, text, replyTo?.id ?? undefined)
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
            <div key={msg.id} className="discussion-message-wrapper">
              <ChatMessageRow
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
              {msg.replies.length > 0 && (
                <div className="discussion-replies">
                  {msg.replies.map((reply) => (
                    <ChatMessageRow
                      key={reply.id}
                      message={reply}
                      userId={user?.userId}
                      isAuthenticated={!!isAuthenticated}
                      editingId={editingId}
                      editContent={editContent}
                      canDelete={canDelete(reply)}
                      onReply={(m) => { setReplyTo(m); inputRef.current?.focus() }}
                      onStartEdit={startEdit}
                      onEditChange={setEditContent}
                      onEditSubmit={handleEdit}
                      onCancelEdit={() => setEditingId(null)}
                      onDelete={handleDelete}
                      formatDate={formatDate}
                      isReply
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="discussion-empty">
            <MessageCircle size={32} className="opacity-30" />
            <p>{variant === "battle" ? "Пока нет комментариев" : "Пока нет сообщений"}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="discussion-reply-preview">
          <Reply size={14} />
          <span>Ответ {replyTo.user.username}</span>
          <button onClick={cancelReply}><X size={14} /></button>
        </div>
      )}

      <div className="discussion-input-bar">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAuthenticated ? "Написать сообщение..." : "Войдите, чтобы писать"}
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
  isReply?: boolean
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
  isReply,
}: ChatMessageRowProps) {
  const isEditing = editingId === message.id
  const isOwner = userId === message.userId

  return (
    <div className={`chat-message ${isReply ? "chat-message--reply" : ""}`}>
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
          <span className="chat-message-time">{formatDate(message.createdAt)}</span>
          {message.createdAt !== message.updatedAt && (
            <span className="chat-message-edited">изменено</span>
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

        <div className="chat-message-actions">
          {isAuthenticated && !isEditing && (
            <button onClick={() => onReply(message)} className="msg-action-btn" title="Ответить">
              <Reply size={12} />
            </button>
          )}
          {isOwner && !isEditing && (
            <button onClick={() => onStartEdit(message)} className="msg-action-btn" title="Редактировать">
              <Edit3 size={12} />
            </button>
          )}
          {canDelete && !isEditing && (
            <button onClick={() => onDelete(message.id)} className="msg-action-btn msg-action-delete" title="Удалить">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
