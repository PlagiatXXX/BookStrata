import { useEffect, useState, useCallback, memo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft, Trophy, Sword, Clock, CheckCircle, AlertCircle,
  Loader2, Users, Crown,
} from "lucide-react"
import { sileo } from "sileo"
import { MetalFx } from "metal-fx"
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout"
import { getBattleById, voteInBattle } from "@/lib/battlesApi"
import { useAuth } from "@/hooks/useAuthContext"
import { TierListPreview } from "@/components/TierListPreview"
import type { Battle, BattleParticipant } from "@/types/battles"
import "./BattleDetailPage.css"

type VoteState = "idle" | "voting" | "voted" | "error"

interface ParticipantCardProps {
  participant: BattleParticipant
  tl: Battle["participants"][number]["tierList"]
  isWinner: boolean
  userVoted: boolean
  handleVote: (p: BattleParticipant) => void
  voteState: VoteState
  isAuthenticated: boolean
  battleStatus: string
}

const ParticipantCard = memo(({
  participant,
  tl,
  isWinner,
  userVoted,
  handleVote,
  voteState,
  isAuthenticated,
  battleStatus,
}: ParticipantCardProps) => (
  <div className={`participant-card h-full flex flex-col ${isWinner ? "border-yellow-500/40" : ""}`}>
    {isWinner && (
      <div className="absolute top-3 right-3 z-10">
        <Trophy size={20} className="text-yellow-400" />
      </div>
    )}

    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-full border-2 border-(--line-soft) bg-(--bg-2) overflow-hidden brutal-shadow-sm shrink-0">
        {tl?.user?.avatarUrl ? (
          <img src={tl.user.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-(--ink-1) text-xs font-bold">
            {tl?.user?.username?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-sm leading-tight truncate">
          {tl?.title || "Без названия"}
        </h3>
        <p className="text-[10px] text-(--ink-1) font-medium">
          {tl?.user?.username || "Неизвестный"}
        </p>
      </div>
    </div>

    {tl?.tiers && tl.tiers.length > 0 && (
      <div className="mb-4">
        <TierListPreview tierList={tl} />
      </div>
    )}

    <div className="vote-section mt-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-(--ink-0)">
          {participant.votesCount || 0}{" "}
          <span className="text-[10px] font-medium text-(--ink-1) uppercase tracking-wider">
            голосов
          </span>
        </span>
      </div>

      {battleStatus === "active" && (
        <>
          {isAuthenticated ? (
            userVoted ? (
              <div className="voted-badge">
                <CheckCircle size={14} />
                Вы проголосовали
              </div>
            ) : (
              <MetalFx preset="chromatic" strength={1} variant="circle" theme="dark">
                <button
                  onClick={() => handleVote(participant)}
                  disabled={voteState === "voting"}
                  className="battle-vote-btn"
                >
                  {voteState === "voting" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Голосую...
                    </span>
                  ) : (
                    "Голосовать"
                  )}
                </button>
              </MetalFx>
            )
          ) : (
            <p className="text-center text-[10px] text-(--ink-1) font-medium uppercase tracking-wider">
              Войдите, чтобы голосовать
            </p>
          )}
        </>
      )}

      {battleStatus === "completed" && (
        <div className="text-center text-[10px] text-(--ink-1) font-medium uppercase tracking-wider">
          Битва завершена
        </div>
      )}
    </div>
  </div>
))

export default function BattleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [battle, setBattle] = useState<Battle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [votedForId, setVotedForId] = useState<string | null>(null)
  const [voteState, setVoteState] = useState<VoteState>("idle")
  const [timeLeft, setTimeLeft] = useState<string>("")

  const fetchBattle = useCallback(async () => {
    if (!id) return
    try {
      setIsLoading(true)
      setError(null)
      const data = await getBattleById(id)
      setBattle(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить битву")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchBattle()
  }, [fetchBattle])

  useEffect(() => {
    if (!battle || battle.status === "completed") return
    const updateTimer = () => {
      const now = Date.now()
      const end = new Date(battle.endTime).getTime()
      const diff = end - now
      if (diff <= 0) {
        setTimeLeft("Завершается...")
        fetchBattle()
        return
      }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      if (days > 0) {
        setTimeLeft(`${days}д ${hours}ч ${minutes}м`)
      } else if (hours > 0) {
        setTimeLeft(`${hours}ч ${minutes}м`)
      } else {
        setTimeLeft(`${minutes}м ${Math.floor((diff % 60000) / 1000)}с`)
      }
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [battle, fetchBattle])

  // Scroll-reveal observer
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    )
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [battle])

  const handleVote = async (participant: BattleParticipant) => {
    if (!isAuthenticated || !battle || voteState === "voting") return
    setVoteState("voting")
    try {
      await voteInBattle(battle.id, participant.tierListId)
      setVotedForId(participant.tierListId)
      setVoteState("voted")
      setBattle((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.tierListId === participant.tierListId
              ? { ...p, votesCount: (p.votesCount || 0) + 1 }
              : p
          ),
        }
      })
    } catch (err) {
      setVoteState("idle")
      const message = err instanceof Error ? err.message : "Ошибка голосования"
      sileo.error({ title: "Ошибка", description: message, duration: 5000 })
    }
  }

  const handleMyRatingsClick = useCallback(
    () => navigate("/"),
    [navigate],
  )

  const handleBack = useCallback(
    () => navigate("/forum"),
    [navigate],
  )

  const winner = battle?.status === "completed"
    ? battle.participants.find((p) => p.tierListId === battle.winnerId)
    : null

  if (isLoading) {
    return (
      <DashboardLayout
        onMyRatingsClick={handleMyRatingsClick}
        showTemplatesNav
        showSearch={false}
        activeItem="Сообщество"
      >
        <div className="battle-shell min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-(--accent-main) animate-spin mx-auto mb-4" />
            <p className="text-(--ink-1) font-medium uppercase tracking-widest text-xs">
              Загрузка битвы...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !battle) {
    return (
      <DashboardLayout
        onMyRatingsClick={handleMyRatingsClick}
        showTemplatesNav
        showSearch={false}
        activeItem="Сообщество"
      >
        <div className="battle-shell min-h-screen">
          <main className="max-w-4xl mx-auto px-6 py-14">
            <button onClick={handleBack} className="flex items-center gap-2 text-(--ink-1) hover:text-(--ink-0) transition-colors text-xs font-bold uppercase tracking-widest mb-10">
              <ArrowLeft size={14} />
              Назад к битвам
            </button>
            <div className="brutal-card brutal-border p-12 text-center bg-red-500/5">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-(--ink-0) font-bold mb-2">{error || "Битва не найдена"}</p>
              <button
                onClick={fetchBattle}
                className="text-xs font-bold uppercase tracking-widest border-b border-red-500/30 hover:border-red-500 mt-4"
              >
                Попробовать снова
              </button>
            </div>
          </main>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      showTemplatesNav
      showSearch={false}
      activeItem="Сообщество"
    >
      <div className="battle-shell min-h-screen">
        <main className="max-w-4xl mx-auto px-6 py-14 cursor-default text-(--ink-0)">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-(--ink-1) hover:text-(--ink-0) transition-colors text-xs font-bold uppercase tracking-widest mb-10"
          >
            <ArrowLeft size={14} />
            Назад к битвам
          </button>

          {/* Battle header */}
          <section className="mb-12 reveal" data-reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="brutal-label px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-(--accent-main)/10 text-(--accent-main) border-(--accent-main)/30">
                    {battle.type === "weekly" ? "Еженедельная" : "Ежемесячная"}
                  </span>
                  {battle.status === "completed" ? (
                    <span className="brutal-label px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-green-500/10 text-green-400 border-green-500/30">
                      Завершена
                    </span>
                  ) : (
                    <span className="brutal-label px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border-blue-500/30 flex items-center gap-1.5">
                      <Clock size={10} />
                      {timeLeft}
                    </span>
                  )}
                </div>
                <h1 className="community-heading text-2xl font-black leading-tight tracking-tighter mb-4 sm:text-3xl md:text-5xl">
                  {battle.title}
                </h1>
                {battle.description && (
                  <p className="text-(--ink-1) text-base md:text-lg leading-relaxed max-w-2xl">
                    {battle.description}
                  </p>
                )}
              </div>
              <div className="flex gap-4 shrink-0 overflow-x-auto">
                <div className="forum-stat-card brutal-card brutal-border p-4 min-w-[100px] text-center">
                  <div className="text-2xl font-black mb-1">{battle.participants.length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-(--ink-1)">
                    Участников
                  </div>
                </div>
                <div className="forum-stat-card brutal-card brutal-border p-4 min-w-[100px] text-center">
                  <div className="text-2xl font-black mb-1">
                    {battle.participants.reduce((a, p) => a + (p.votesCount || 0), 0)}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-(--ink-1)">
                    Голосов
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="community-rule mb-12" />

          {/* Winner announcement */}
          {winner && (
            <section className="mb-12 reveal" data-reveal>
              <div className="brutal-card brutal-border p-8 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/30">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
                    <Crown size={32} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 mb-1">
                      Победитель
                    </p>
                    <h2 className="text-2xl font-black mb-1">{winner.tierList.title}</h2>
                    <p className="text-(--ink-1) text-sm">
                      от {winner.tierList.user?.username || "Неизвестный автор"} &mdash; {winner.votesCount} голосов
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Participants */}
          <section className="reveal" data-reveal>
            <h2 className="community-heading text-2xl font-black mb-8 flex items-center gap-3">
              <Users size={20} className="text-(--accent-main)" />
              Участники
            </h2>

            {battle.participants.length === 0 ? (
              <div className="brutal-card brutal-border p-12 text-center">
                <Sword size={32} className="mx-auto mb-4 text-(--ink-1) opacity-50" />
                <p className="text-(--ink-1) font-medium">В этой битве пока нет участников</p>
              </div>
            ) : battle.participants.length === 2 ? (
              <div className="flex flex-col md:flex-row items-stretch gap-6 md:gap-4">
                <div className="flex-1 w-full">
                  <ParticipantCard
                    participant={battle.participants[0]}
                    tl={battle.participants[0].tierList}
                    isWinner={battle.winnerId === battle.participants[0].tierListId}
                    userVoted={votedForId === battle.participants[0].tierListId}
                    handleVote={handleVote}
                    voteState={voteState}
                    isAuthenticated={isAuthenticated}
                    battleStatus={battle.status}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <div className="battle-vs">VS</div>
                </div>
                <div className="flex-1 w-full">
                  <ParticipantCard
                    participant={battle.participants[1]}
                    tl={battle.participants[1].tierList}
                    isWinner={battle.winnerId === battle.participants[1].tierListId}
                    userVoted={votedForId === battle.participants[1].tierListId}
                    handleVote={handleVote}
                    voteState={voteState}
                    isAuthenticated={isAuthenticated}
                    battleStatus={battle.status}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {battle.participants.map((participant) => {
                  const tl = participant.tierList
                  const isWinner = battle.winnerId === participant.tierListId
                  const userVoted = votedForId === participant.tierListId

                  return (
                    <ParticipantCard
                      key={participant.id}
                      participant={participant}
                      tl={tl}
                      isWinner={isWinner}
                      userVoted={userVoted}
                      handleVote={handleVote}
                      voteState={voteState}
                      isAuthenticated={isAuthenticated}
                      battleStatus={battle.status}
                    />
                  )
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </DashboardLayout>
  )
}
