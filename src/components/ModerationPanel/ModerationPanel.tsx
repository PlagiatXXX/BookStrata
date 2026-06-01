import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ShieldAlert, Ban, Unlock, VolumeX, Volume2, AlertTriangle, MessageSquareWarning, ChevronDown } from "lucide-react"
import {
  apiGetModerationStatus,
  apiBanChat,
  apiUnbanChat,
  apiSuspend,
  apiUnsuspend,
  apiWarn,
  apiGetWarnings,
  apiChangeRole,
  type ModerationStatus,
  type Warning,
} from "@/lib/moderationApi"
import { useAuth } from "@/hooks/useAuthContext"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { sileo } from "sileo"

interface Props {
  userId: number
  username: string
  currentRole: string
}

const ROLE_OPTIONS = [
  { value: "user", label: "Пользователь" },
  { value: "moderator", label: "Модератор" },
  { value: "admin", label: "Админ" },
]

export function ModerationPanel({ userId, username, currentRole }: Props) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [showWarnModal, setShowWarnModal] = useState(false)
  useBodyScrollLock(showWarnModal)
  const [warnMessage, setWarnMessage] = useState("")
  const [showWarnings, setShowWarnings] = useState(false)
  const [suspendHours, setSuspendHours] = useState(24)
  const suspendReason = ""

  const { data: status } = useQuery<ModerationStatus>({
    queryKey: ["moderationStatus", userId],
    queryFn: () => apiGetModerationStatus(userId),
    refetchInterval: 30_000,
  })

  const { data: warnings } = useQuery<Warning[]>({
    queryKey: ["warnings", userId],
    queryFn: () => apiGetWarnings(userId),
    enabled: showWarnings,
  })

  const banMutation = useMutation({
    mutationFn: () => apiBanChat(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderationStatus", userId] })
      sileo.success({ title: "Чат забанен", duration: 3000 })
    },
    onError: () => sileo.error({ title: "Ошибка", description: "Не удалось забанить чат" }),
  })

  const unbanMutation = useMutation({
    mutationFn: () => apiUnbanChat(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderationStatus", userId] })
      sileo.success({ title: "Чат разбанен", duration: 3000 })
    },
    onError: () => sileo.error({ title: "Ошибка", description: "Не удалось разбанить чат" }),
  })

  const suspendMutation = useMutation({
    mutationFn: () => apiSuspend(userId, suspendHours, suspendReason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderationStatus", userId] })
      sileo.success({ title: "Пользователь заблокирован", duration: 3000 })
    },
    onError: () => sileo.error({ title: "Ошибка", description: "Не удалось заблокировать" }),
  })

  const unsuspendMutation = useMutation({
    mutationFn: () => apiUnsuspend(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderationStatus", userId] })
      sileo.success({ title: "Блокировка снята", duration: 3000 })
    },
    onError: () => sileo.error({ title: "Ошибка", description: "Не удалось снять блокировку" }),
  })

  const warnMutation = useMutation({
    mutationFn: () => apiWarn(userId, warnMessage),
    onSuccess: () => {
      setShowWarnModal(false)
      setWarnMessage("")
      queryClient.invalidateQueries({ queryKey: ["warnings", userId] })
      sileo.success({ title: "Предупреждение отправлено", duration: 3000 })
    },
    onError: () => sileo.error({ title: "Ошибка", description: "Не удалось отправить предупреждение" }),
  })

  const roleMutation = useMutation({
    mutationFn: (role: string) => apiChangeRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderationStatus", userId] })
      sileo.success({ title: "Роль изменена", duration: 3000 })
    },
    onError: () => sileo.error({ title: "Ошибка", description: "Не удалось изменить роль" }),
  })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="rounded-md border border-red-500/30 bg-red-500/5 p-4 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={16} className="text-red-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-red-400">
          Панель модератора
        </span>
        {status?.chatBanned && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 ml-auto">
            Чат забанен {status.chatBannedUntil ? `до ${formatDate(status.chatBannedUntil)}` : "навсегда"}
          </span>
        )}
        {status?.suspended && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 ml-auto">
            Заблокирован до {status.suspendedUntil ? formatDate(status.suspendedUntil) : "—"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Ban/unban chat */}
        {status?.chatBanned ? (
          <button
            onClick={() => unbanMutation.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
          >
            <Volume2 size={12} />
            Разбанить чат
          </button>
        ) : (
          <button
            onClick={() => banMutation.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            <VolumeX size={12} />
            Забанить чат
          </button>
        )}

        {/* Suspend/unsuspend (admin only) */}
        {isAdmin && (
          status?.suspended ? (
            <button
              onClick={() => unsuspendMutation.mutate()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
            >
              <Unlock size={12} />
              Разблокировать
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => suspendMutation.mutate()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
              >
                <Ban size={12} />
                Заблокировать
              </button>
              <input
                type="number"
                value={suspendHours}
                onChange={(e) => setSuspendHours(Number(e.target.value))}
                className="w-14 px-1.5 py-1.5 rounded text-xs bg-orange-500/10 border border-orange-500/30 text-orange-300 text-center"
                min={1}
                title="Часы"
              />
              <span className="text-[10px] text-orange-400/60">ч</span>
            </div>
          )
        )}

        {/* Warn */}
        <button
          onClick={() => setShowWarnModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
        >
          <MessageSquareWarning size={12} />
          Предупредить
        </button>

        {/* Change role (admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-1">
            <select
              value={currentRole}
              onChange={(e) => roleMutation.mutate(e.target.value)}
              className="px-2 py-1.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="text-purple-400/60" />
          </div>
        )}
      </div>

      {/* Warnings toggle */}
      <button
        onClick={() => setShowWarnings(!showWarnings)}
        className="flex items-center gap-1.5 mt-3 text-xs text-red-400/60 hover:text-red-400 transition-colors"
      >
        <AlertTriangle size={12} />
        Предупреждения ({status?.warningsCount ?? 0})
      </button>

      {showWarnings && warnings && (
        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
          {warnings.length === 0 ? (
            <p className="text-xs text-red-400/40">Нет предупреждений</p>
          ) : (
            warnings.map((w) => (
              <div key={w.id} className="text-xs text-red-300/80 bg-red-500/5 rounded px-2 py-1.5">
                <span className="font-medium text-red-400">{w.moderator.username}</span>: {w.message}
                <span className="text-red-400/40 ml-2">{formatDate(w.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Warn modal */}
      {showWarnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowWarnModal(false)}>
          <div className="bg-[#1a1a2e] border border-red-500/30 rounded-lg p-5 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquareWarning size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold">Предупреждение для {username}</h3>
            </div>
            <textarea
              value={warnMessage}
              onChange={(e) => setWarnMessage(e.target.value)}
              placeholder="Текст предупреждения..."
              className="w-full bg-black/30 border border-red-500/20 rounded px-3 py-2 text-sm text-white resize-none h-24 outline-none focus:border-red-500/50"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowWarnModal(false); setWarnMessage("") }}
                className="px-3 py-1.5 text-xs rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => warnMutation.mutate()}
                disabled={!warnMessage.trim() || warnMutation.isPending}
                className="px-3 py-1.5 text-xs rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-40 transition-colors"
              >
                {warnMutation.isPending ? "..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
