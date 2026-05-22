import { useEffect, useState } from "react"
import { X, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { getUserTierLists, type TierListShort } from "@/lib/tierListApi"
import { applyToBattle } from "@/lib/battlesApi"

interface BattleApplyModalProps {
  battleId: string
  battleTitle: string
  onClose: () => void
  onSuccess: () => void
}

export function BattleApplyModal({ battleId, battleTitle, onClose, onSuccess }: BattleApplyModalProps) {
  const [tierLists, setTierLists] = useState<TierListShort[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const result = await getUserTierLists(1, 50)
        setTierLists(result.data.filter((tl) => tl.isPublic))
      } catch {
        setError("Не удалось загрузить ваши тир-листы")
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleSubmit = async () => {
    if (!selectedId || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await applyToBattle(battleId, selectedId, message || undefined)
      setSuccess(true)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при отправке заявки")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="brutal-card brutal-border w-full max-w-lg mx-4 p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-(--ink-1) hover:text-(--ink-0) transition-colors"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-black mb-2">Заявка отправлена!</h3>
            <p className="text-(--ink-1) text-sm mb-6">
              Ваша заявка на участие в битве &laquo;{battleTitle}&raquo; отправлена модераторам.
              Ожидайте решения.
            </p>
            <button
              onClick={onClose}
              className="brutal-cta px-8 py-3 text-xs font-bold uppercase tracking-widest"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-black mb-2">Подать заявку</h3>
            <p className="text-(--ink-1) text-sm mb-6">
              Участвуйте в битве &laquo;{battleTitle}&raquo;. Выберите публичный тир-лист и отправьте заявку модератору.
            </p>

            {error && (
              <div className="mb-4 p-3 brutal-card brutal-border bg-red-500/5 border-red-500/30 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-(--accent-main)" />
              </div>
            ) : tierLists.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-(--ink-1) text-sm mb-3">
                  У вас нет публичных тир-листов
                </p>
                <p className="text-[10px] text-(--ink-1) font-medium uppercase tracking-wider">
                  Создайте тир-лист и сделайте его публичным в настройках
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1) mb-2 block">
                    Выберите тир-лист
                  </label>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full brutal-card brutal-border bg-(--bg-2) text-(--ink-0) px-4 py-3 text-sm focus:outline-none focus:border-(--accent-main)"
                  >
                    <option value="">-- Выберите тир-лист --</option>
                    {tierLists.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1) mb-2 block">
                    Комментарий (необязательно)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Почему вы хотите участвовать?"
                    className="w-full brutal-card brutal-border bg-(--bg-2) text-(--ink-0) px-4 py-3 text-sm resize-none focus:outline-none focus:border-(--accent-main)"
                  />
                  <div className="text-right text-[10px] text-(--ink-1) mt-1">
                    {message.length}/500
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-(--ink-1) hover:text-(--ink-0) transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedId || submitting}
                    className="brutal-cta px-8 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" />
                        Отправка...
                      </span>
                    ) : (
                      "Отправить заявку"
                    )}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
