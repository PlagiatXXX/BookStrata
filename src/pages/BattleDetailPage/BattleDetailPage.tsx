import { useEffect, useState, useCallback, memo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft, Trophy, Sword, Clock, CheckCircle,
  Loader2, Users, Crown,
} from "lucide-react"
import { sileo } from "sileo"
import { MetalFx } from "metal-fx"
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout"
import { getBattleById, voteInBattle } from "@/lib/battlesApi"
import { useAuth } from "@/hooks/useAuthContext"
import { TierListPreview } from "@/components/TierListPreview"
import type { Battle, BattleParticipant } from "@/types/battles"
import { DiscussionSection } from "@/components/DiscussionSection/DiscussionSection"
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
}: ParticipantCardProps) => {
  const navigate = useNavigate()
  return (
  <div className={`participant-card relative h-full flex flex-col ${isWinner ? "border-yellow-500/40" : ""}`}>
    {isWinner && (
      <div className="absolute top-4 right-4 z-10">
        <Trophy size={24} className="text-yellow-400" />
      </div>
    )}

    <div className="flex items-center gap-4 mb-6">
      <div
        className="w-12 h-12 rounded-full border-2 border-(--line-soft) bg-(--bg-2) overflow-hidden brutal-shadow-sm shrink-0 cursor-pointer"
        onClick={(e) => { if (tl?.user?.id) { e.stopPropagation(); navigate(`/users/${tl.user.id}`) } }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" && tl?.user?.id) { e.stopPropagation(); navigate(`/users/${tl.user.id}`) } }}
      >
        {tl?.user?.avatarUrl ? (
          <img src={tl.user.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-(--ink-1) text-sm font-bold">
            {tl?.user?.username?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <button
          onClick={(e) => { e.stopPropagation(); if (tl?.id) navigate(`/tier-lists/${tl.id}?context=battle`) }}
          className="font-bold text-base leading-tight truncate text-left cursor-pointer hover:text-(--accent-main) transition-colors block w-full"
        >
          {tl?.title || "Без названия"}
        </button>
        {tl?.user?.username ? (
          <button
            onClick={(e) => { e.stopPropagation(); if (tl?.user?.id) navigate(`/users/${tl.user.id}`) }}
            className="text-sm text-(--ink-1) font-medium hover:text-(--accent-main) transition-colors text-left cursor-pointer"
          >
            {tl.user.username}
          </button>
        ) : (
          <p className="text-xs text-(--ink-1) font-medium">Неизвестный</p>
        )}
      </div>
    </div>

    {tl?.tiers && tl.tiers.length > 0 && (
      <div
        className="mb-3 cursor-pointer group/tierlist"
        onClick={(e) => { e.stopPropagation(); if (tl?.id) navigate(`/tier-lists/${tl.id}?context=battle`) }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" && tl?.id) { e.stopPropagation(); navigate(`/tier-lists/${tl.id}?context=battle`) } }}
      >
        <TierListPreview tierList={tl} compact maxBooksPerTier={4} />
        <div className="mt-2 text-[10px] font-medium uppercase tracking-wider text-(--ink-1) opacity-0 group-hover/tierlist:opacity-100 transition-opacity">
          Открыть полностью &rarr;
        </div>
      </div>
    )}

    <div className="vote-section mt-auto">
      <div className="flex items-center justify-between mb-5">
        <span className="text-base font-bold text-(--ink-0)">
          {participant.votesCount || 0}{" "}
          <span className="text-xs font-medium text-(--ink-1) uppercase tracking-wider">
            голосов
          </span>
        </span>
      </div>

      {battleStatus === "active" && (
        <>
          {isAuthenticated ? (
            userVoted ? (
              <div className="voted-badge">
                <CheckCircle size={16} />
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
                      <Loader2 size={16} className="animate-spin" />
                      Голосую...
                    </span>
                  ) : (
                    "Голосовать"
                  )}
                </button>
              </MetalFx>
            )
          ) : (
            <p className="text-center text-xs text-(--ink-1) font-medium uppercase tracking-wider">
              Войдите, чтобы голосовать
            </p>
          )}
        </>
      )}

      {battleStatus === "completed" && (
        <div className="text-center text-xs text-(--ink-1) font-medium uppercase tracking-wider">
          Битва завершена
        </div>
      )}
    </div>
  </div>
  )
})

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
          <main className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20 py-14">
            <button onClick={handleBack} className="flex items-center gap-2 text-(--ink-1) hover:text-(--ink-0) transition-colors text-xs font-bold uppercase tracking-widest mb-10">
              <ArrowLeft size={14} />
              Назад к битвам
            </button>
            <div className="brutal-card brutal-border p-12 text-center bg-red-500/5">
              <img src="/lap.webp" alt="" className="size-12 object-contain mx-auto mb-4" />
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
        <main className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20 py-14 cursor-default text-(--ink-0)">
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
                <div className="forum-stat-card brutal-card brutal-border p-5 min-w-[120px] text-center">
                  <div className="text-3xl font-black mb-1">{battle.participants.length}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1)">
                    Участников
                  </div>
                </div>
                <div className="forum-stat-card brutal-card brutal-border p-5 min-w-[120px] text-center">
                  <div className="text-3xl font-black mb-1">
                    {battle.participants.reduce((a, p) => a + (p.votesCount || 0), 0)}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1)">
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
                    <h2>
                      <button
                        onClick={() => navigate(`/tier-lists/${winner.tierList.id}?context=battle`)}
                        className="text-2xl font-black mb-1 text-left cursor-pointer hover:text-(--accent-main) transition-colors"
                      >
                        {winner.tierList.title}
                      </button>
                    </h2>
                    <p className="text-(--ink-1) text-sm">
                      от{" "}
                      {winner.tierList.user?.username ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/users/${winner.tierList.user!.id}`) }}
                          className="hover:text-(--accent-main) transition-colors cursor-pointer"
                        >
                          {winner.tierList.user.username}
                        </button>
                      ) : "Неизвестный автор"}
                      {" "}&mdash; {winner.votesCount} голосов
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
              <div className="flex flex-col xl:flex-row items-stretch gap-8 xl:gap-6">
                <div className="flex-1 w-full min-w-0">
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
                <div className="flex items-center justify-center shrink-0">
                  <div className="battle-vs">VS</div>
                </div>
                <div className="flex-1 w-full min-w-0">
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

          {/* Discussion section */}
          <DiscussionSection variant="battle" battleId={battle.id} />
        </main>
      </div>
    </DashboardLayout>
  )
}
