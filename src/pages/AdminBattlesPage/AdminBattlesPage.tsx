import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Sword, CheckCircle, XCircle, Loader2, ArrowLeft, Eye, Plus, ExternalLink, Clock } from "lucide-react"
import { sileo } from "sileo"
import { api } from "@/lib/api-client"
import type { BattleApplication } from "@/lib/battlesApi"
import { CreateBattleModal } from "./CreateBattleModal"

export default function AdminBattlesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: pending = [], isLoading } = useQuery<BattleApplication[]>({
    queryKey: ["admin-pending-applications"],
    queryFn: () => api.get<BattleApplication[]>("/battles/applications/pending"),
    refetchInterval: 10000,
  })

  const { data: approved = [] } = useQuery<BattleApplication[]>({
    queryKey: ["admin-approved-applications"],
    queryFn: () => api.get<BattleApplication[]>("/battles/applications/approved"),
  })

  const { data: battles = [] } = useQuery<Array<{ id: string; title: string; endTime: string; participants: Array<unknown> }>>({
    queryKey: ["admin-active-battles"],
    queryFn: () => api.get("/battles"),
  })

  const reviewMutation = useMutation({
    mutationFn: ({
      battleId,
      applicationId,
      status,
    }: {
      battleId: string | null
      applicationId: number
      status: "approved" | "rejected"
    }) => {
      const url = battleId
        ? `/battles/${battleId}/applications/${applicationId}`
        : `/battles/applications/${applicationId}`
      return api.patch<{ success: boolean }>(url, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-applications"] })
      sileo.success({ title: "Заявка обработана", duration: 3000 })
    },
    onError: (err: Error) => {
      sileo.error({ title: "Ошибка", description: err.message, duration: 3000 })
    },
  })

  const pendingApps = pending.filter((a) => a.status === "pending")
  const approvedApps = approved.filter((a) => a.status === "approved")

  return (
    <div className="min-h-screen bg-[#0f0f1a] py-6 sm:py-10">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => navigate("/admin")}
            className="text-(--ink-1) hover:text-(--ink-0) transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black uppercase tracking-tight">Управление битвами</h1>
            <p className="text-(--ink-1) text-sm mt-1">
              Заявки на участие &middot; Создание битв &middot; Активные битвы
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-(--accent-main)" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending applications */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Clock size={18} className="text-yellow-400" />
                  Новые заявки ({pendingApps.length})
                </h2>
              </div>

              {pendingApps.length === 0 ? (
                <div className="brutal-card brutal-border p-8 text-center">
                  <p className="text-(--ink-1) text-sm">Нет новых заявок</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApps.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      onApprove={() => reviewMutation.mutate({ battleId: null, applicationId: app.id, status: "approved" })}
                      onReject={() => reviewMutation.mutate({ battleId: null, applicationId: app.id, status: "rejected" })}
                      isPending={reviewMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Approved applications — ready for battle creation */}
            {approvedApps.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <CheckCircle size={18} className="text-green-400" />
                    Принятые заявки ({approvedApps.length})
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="brutal-cta px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Создать битву
                  </button>
                </div>

                <div className="space-y-2">
                  {approvedApps.map((app) => (
                    <div key={app.id} className="brutal-card brutal-border p-4 bg-(--bg-2) flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full border border-(--line-soft) bg-(--bg-1) overflow-hidden shrink-0">
                        {app.user.avatarUrl ? (
                          <img src={app.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-(--ink-1)">
                            {app.user.username?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{app.user.username}</p>
                        <p className="text-[11px] text-(--ink-1) truncate">{app.tierList.title}</p>
                      </div>
                      <a
                        href={`/tier-lists/${app.tierList.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-(--ink-1) hover:text-(--accent-main) transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Active battles */}
            <section>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sword size={18} className="text-(--accent-main)" />
                Активные битвы ({Array.isArray(battles) ? battles.length : 0})
              </h2>
              {(!Array.isArray(battles) || battles.length === 0) ? (
                <div className="brutal-card brutal-border p-8 text-center">
                  <p className="text-(--ink-1) text-sm">Нет активных битв</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {battles.map((b) => (
                    <div key={b.id} className="brutal-card brutal-border p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{b.title}</p>
                        <p className="text-[11px] text-(--ink-1)">
                          {b.participants?.length || 0} участников &middot; до {new Date(b.endTime).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/forum/battles/${b.id}`)}
                          className="brutal-cta px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
                        >
                          <Eye size={12} />
                          Открыть
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateBattleModal
          approvedApplications={approvedApps}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ["admin-pending-applications"] })
            queryClient.invalidateQueries({ queryKey: ["admin-active-battles"] })
            sileo.success({ title: "Битва создана!", duration: 3000 })
          }}
        />
      )}
    </div>
  )
}

function ApplicationCard({
  app,
  onApprove,
  onReject,
  isPending,
}: {
  app: BattleApplication
  onApprove: () => void
  onReject: () => void
  isPending: boolean
}) {
  return (
    <div className="brutal-card brutal-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full border border-(--line-soft) bg-(--bg-1) overflow-hidden shrink-0">
            {app.user.avatarUrl ? (
              <img src={app.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-(--ink-1)">
                {app.user.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{app.user.username}</p>
            <p className="text-[11px] text-(--ink-1) truncate">Тир-лист: {app.tierList.title}</p>
            {app.message && (
              <p className="text-[11px] text-(--ink-1) italic mt-1">
                &laquo;{app.message}&raquo;
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/tier-lists/${app.tierList.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="brutal-cta px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
          >
            <Eye size={12} />
            Тир-лист
          </a>
          <button
            onClick={onApprove}
            disabled={isPending}
            className="brutal-cta px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-green-400 border-green-400/30 hover:bg-green-500/10 flex items-center gap-1 disabled:opacity-50"
          >
            <CheckCircle size={12} />
            Принять
          </button>
          <button
            onClick={onReject}
            disabled={isPending}
            className="brutal-cta px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 border-red-400/30 hover:bg-red-500/10 flex items-center gap-1 disabled:opacity-50"
          >
            <XCircle size={12} />
            Отклонить
          </button>
        </div>
      </div>
    </div>
  )
}
