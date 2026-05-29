import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { api } from "@/lib/api-client"
import type { BattleApplication } from "@/lib/battlesApi"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

interface CreateBattleModalProps {
  approvedApplications: BattleApplication[]
  onClose: () => void
  onCreated: () => void
}

export function CreateBattleModal({ approvedApplications, onClose, onCreated }: CreateBattleModalProps) {
  useBodyScrollLock(true)
  const [title, setTitle] = useState("")
  const [type, setType] = useState<"weekly" | "monthly">("weekly")
  const [endDate, setEndDate] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!title.trim() || !endDate || selectedIds.size < 2) {
      setError("Заполните название, дату и выберите минимум 2 участников")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const participantTierLists = approvedApplications
        .filter((a) => selectedIds.has(a.tierList.id))
        .map((a) => a.tierList.id)

      await api.post("/battles", {
        title: title.trim(),
        type,
        endTime: new Date(endDate).toISOString(),
        participantTierListIds: participantTierLists,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при создании битвы")
    } finally {
      setSubmitting(false)
    }
  }

  const now = new Date()
  const minDate = new Date(now.getTime() + 86400000).toISOString().slice(0, 16)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="brutal-card brutal-border w-full max-w-lg mx-4 p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-(--ink-1) hover:text-(--ink-0) transition-colors"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-black mb-6">Создать битву</h3>

        {error && (
          <div className="mb-4 p-3 brutal-card brutal-border bg-red-500/5 border-red-500/30 flex items-center gap-2">
            <img src="/lap.webp" alt="" className="size-3.5 object-contain shrink-0" />
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1) mb-1.5 block">
              Название битвы
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Например: Битва фэнтези"
              className="w-full brutal-card brutal-border bg-(--bg-2) text-(--ink-0) px-4 py-3 text-sm focus:outline-none focus:border-(--accent-main)"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1) mb-1.5 block">
                Тип
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "weekly" | "monthly")}
                className="w-full brutal-card brutal-border bg-(--bg-2) text-(--ink-0) px-4 py-3 text-sm focus:outline-none focus:border-(--accent-main)"
              >
                <option value="weekly">Еженедельная</option>
                <option value="monthly">Ежемесячная</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1) mb-1.5 block">
                Дата окончания
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={minDate}
                className="w-full brutal-card brutal-border bg-(--bg-2) text-(--ink-0) px-4 py-3 text-sm focus:outline-none focus:border-(--accent-main) [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1) mb-1.5 block">
              Участники ({selectedIds.size} выбрано, минимум 2)
            </label>
            {approvedApplications.length === 0 ? (
              <p className="text-(--ink-1) text-sm py-2">Нет принятых заявок</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto brutal-card brutal-border bg-(--bg-2) p-2">
                {approvedApplications.map((app) => (
                  <label
                    key={app.id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      selectedIds.has(app.tierList.id)
                        ? "bg-(--accent-main)/10 border border-(--accent-main)/30"
                        : "hover:bg-(--bg-1) border border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(app.tierList.id)}
                      onChange={() => toggleId(app.tierList.id)}
                      className="accent-(--accent-main)"
                    />
                    <div className="w-8 h-8 rounded-full border border-(--line-soft) bg-(--bg-1) overflow-hidden shrink-0">
                      {app.user.avatarUrl ? (
                        <img src={app.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-(--ink-1)">
                          {app.user.username?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{app.user.username}</p>
                      <p className="text-[10px] text-(--ink-1) truncate">{app.tierList.title}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-8">
          <button
            onClick={onClose}
            className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-(--ink-1) hover:text-(--ink-0) transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedIds.size < 2 || !title.trim() || !endDate}
            className="brutal-cta px-8 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" />
                Создание...
              </span>
            ) : (
              "Создать битву"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
