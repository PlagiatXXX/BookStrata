import { useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Heart, Calendar, Trophy, BookOpen, Star } from "lucide-react"
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout"
import { apiGetPublicUser, apiGetUserTierLists, apiGetTasteMatch } from "@/lib/userApi"
import { useAuth } from "@/hooks/useAuthContext"
import { Spinner } from "@/components/Spinner"
import { SEOHead } from "@/components/SEO/SEOHead"
import { ModerationPanel } from "@/components/ModerationPanel/ModerationPanel"
import { DonorBadge } from "@/components/DonorBadge/DonorBadge"
import type { TierListShort } from "@/lib/tierListApi"

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const isOwnProfile = currentUser && id && String(currentUser.userId) === id

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["publicUser", id],
    queryFn: () => apiGetPublicUser(id!),
    enabled: !!id,
  })

  const { data: tierListsData, isLoading: tierListsLoading } = useQuery({
    queryKey: ["userTierLists", id],
    queryFn: () => apiGetUserTierLists(id!, 1, 20),
    enabled: !!id,
  })

  const isPrerender = typeof window !== 'undefined' && window.__PRERENDER__ === true

  const { data: tasteMatch } = useQuery({
    queryKey: ["tasteMatch", id],
    queryFn: () => apiGetTasteMatch(id!),
    enabled: !!id && !isOwnProfile && !isPrerender,
    staleTime: 60_000,
  })

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate])

  const handleTierListClick = (tierListId: string) => {
    navigate(`/tier-lists/${tierListId}`)
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  if (profileLoading) {
    return (
      <DashboardLayout showSearch={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (profileError || !profile) {
    return (
      <DashboardLayout showSearch={false}>
        <div className="min-h-screen flex flex-col items-center justify-center text-(--ink-1)">
          <h1 className="text-lg mb-4">Пользователь не найден</h1>
          <button onClick={handleBack} className="text-xs font-bold uppercase tracking-widest text-(--accent-main) hover:opacity-80 transition-opacity">
            ← Назад
          </button>
        </div>
      </DashboardLayout>
    )
  }

  const tierLists = tierListsData?.data ?? []

  return (
    <>
      <SEOHead
        title={profile.username}
        description={`Профиль пользователя ${profile.username} на BookStrata. ${profile.stats?.tierListsCount || 0} тир-листов, ${profile.stats?.totalBooks || 0} книг.`}
        image={profile.avatarUrl || undefined}
        url={`/users/${id}`}
        type="profile"
      />
      <DashboardLayout showSearch={false}>
      <div className="min-h-screen cursor-default">
        <div className="max-w-4xl mx-auto px-6 py-14 pb-20 text-(--ink-0)">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-(--ink-1) hover:text-(--ink-0) mb-8 transition-colors"
          >
            <ArrowLeft size={14} />
            Назад
          </button>

          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-(--bg-2) flex-shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-(--ink-1)">
                  {profile.username?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight">{profile.username}</h1>
                {profile.role === "admin" && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                    Админ
                  </span>
                )}
                {profile.role === "moderator" && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Мод
                  </span>
                )}
                {profile.isDonor && (
                  <DonorBadge />
                )}
              </div>
              {profile.title && (
                <p className="text-sm text-(--ink-1) mt-1">
                  {profile.icon && <span className="mr-1.5">{profile.icon}</span>}
                  {profile.title}
                </p>
              )}
              <p className="text-xs text-(--ink-2) mt-1">
                На сайте с {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>

          {/* Taste Match */}
          {tasteMatch && tasteMatch.totalBooks > 0 && (
            <div className="mb-8 rounded-md border border-(--accent-main)/30 bg-(--accent-main)/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Heart size={16} className="text-pink-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Совпадение вкусов:{" "}
                    <span className={tasteMatch.matchPercent >= 50 ? "text-(--accent-main)" : "text-(--ink-1)"}>
                      {tasteMatch.matchPercent}%
                    </span>
                  </p>
                  <p className="text-xs text-(--ink-1) mt-0.5">
                    {tasteMatch.commonBooks} {tasteMatch.commonBooks === 1 ? "общая книга" : "общих книг"} из {tasteMatch.totalBooks}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Moderation Panel (admin/mod only) */}
          {currentUser && !isOwnProfile && (currentUser.role === "admin" || currentUser.role === "moderator") && (
            <ModerationPanel
              userId={profile.id}
              username={profile.username}
              currentRole={profile.role || "user"}
            />
          )}

          {/* Stats */}
          {profile.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              <StatCard icon={<Trophy size={16} />} label="Тир-листов" value={profile.stats.tierListsCount} />
              <StatCard icon={<Star size={16} />} label="Опубликовано" value={profile.stats.publishedCount} />
              <StatCard icon={<Heart size={16} />} label="Лайков" value={profile.stats.likesCount} />
              <StatCard icon={<BookOpen size={16} />} label="Книг" value={profile.stats.totalBooks} />
            </div>
          )}

          {/* Public Tier Lists */}
          <section>
            <h2 className="text-lg font-bold uppercase tracking-wider text-(--ink-1) mb-6">
              Публичные тир-листы
            </h2>

            {tierListsLoading ? (
              <div className="flex justify-center py-12"><Spinner size="md" /></div>
            ) : tierLists.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tierLists.map((tl: TierListShort) => (
                  <div
                    key={tl.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleTierListClick(tl.slug || tl.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleTierListClick(tl.slug || tl.id) } }}
                    className="cursor-pointer bg-black/45 backdrop-blur-[2px] rounded-md p-4 border border-white/20 hover:border-white/40 transition-all duration-200"
                  >
                    <h3 className="font-semibold text-(--ink-0) mb-1 text-sm line-clamp-1">
                      {tl.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-(--ink-1)">
                      <span className="flex items-center gap-1">
                        <Heart size={12} />
                        {tl.likesCount ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} />
                        {tl.booksCount ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(tl.updatedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-(--ink-1) text-center py-8">Нет публичных тир-листов</p>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
    </>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="brutal-card brutal-border p-4">
      <div className="flex items-center gap-2 text-(--ink-1) mb-2 text-[10px] font-bold uppercase tracking-widest">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  )
}
