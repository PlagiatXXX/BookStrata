import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Heart,
  Trophy,
  BookOpen,
  Star,
  PawPrint,
  ChevronDown,
  ChevronUp,
  Minus,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import {
  apiGetPublicUser,
  apiGetUserTierLists,
  apiGetTasteMatch,
} from "@/lib/userApi";
import { useAuth } from "@/hooks/useAuthContext";
import { Spinner } from "@/components/Spinner";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { ModerationPanel } from "@/components/ModerationPanel/ModerationPanel";
import { DonorBadge } from "@/components/DonorBadge/DonorBadge";
import { RetryableImage } from "@/ui/RetryableImage";
import { PrivateBadge } from "@/components/PrivateBadge";
import { proxyImageUrl } from "@/utils/imageProxy";
import type { TierListShort } from "@/lib/tierListApi";
import "./UserProfilePage.css";

const TIER_FALLBACKS = ["S", "A", "B", "C", "D", "F"];

function getTierLabel(
  name: string | null | undefined,
  rank: number | null | undefined,
): string {
  if (name && name.trim().length > 0) return name;
  if (
    rank !== null &&
    rank !== undefined &&
    rank >= 0 &&
    rank < TIER_FALLBACKS.length
  ) {
    return TIER_FALLBACKS[rank];
  }
  return "—";
}

function renderComparisonIndicator(
  userRank: number | null,
  profileRank: number | null,
) {
  if (userRank !== null && profileRank !== null) {
    const rankDiff = Math.abs(profileRank - userRank);
    if (rankDiff <= 1) {
      return (
        <span
          className="inline-flex shrink-0"
          title="Оценки близки или совпадают"
        >
          <Minus size={12} className="text-green-400" />
        </span>
      );
    }
    if (profileRank < userRank) {
      return (
        <span className="inline-flex shrink-0" title="Пользователь оценил выше">
          <ChevronUp size={12} className="text-[var(--p-primary)]" />
        </span>
      );
    }
    return (
      <span className="inline-flex shrink-0" title="Пользователь оценил ниже">
        <ChevronDown size={12} className="text-pink-400" />
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0"
      title="Оценки близки или совпадают"
    >
      <Minus size={12} className="text-green-400" />
    </span>
  );
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isOwnProfile = currentUser && id && String(currentUser.userId) === id;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isTasteMatchExpanded, setIsTasteMatchExpanded] = useState(false);

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["publicUser", id],
    queryFn: () => apiGetPublicUser(id!),
    enabled: !!id,
  });

  const { data: tierListsData, isLoading: tierListsLoading } = useQuery({
    queryKey: ["userTierLists", id],
    queryFn: () => apiGetUserTierLists(id!, 1, 20),
    enabled: !!id,
  });

  const isPrerender =
    typeof window !== "undefined" && window.__PRERENDER__ === true;

  const { data: tasteMatch } = useQuery({
    queryKey: ["tasteMatch", id],
    queryFn: () => apiGetTasteMatch(id!),
    // Гостю совпадение вкусов не показываем (нет текущего пользователя)
    enabled: !!id && !isOwnProfile && !!currentUser && !isPrerender,
    staleTime: 60_000,
  });

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleTierListClick = (tierListId: string) => {
    navigate(`/tier-lists/${tierListId}`);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (profileLoading) {
    return (
      <DashboardLayout showSearch={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (profileError || !profile) {
    return (
      <DashboardLayout showSearch={false}>
        <div className="min-h-screen flex flex-col items-center justify-center text-[var(--p-on-surface)]">
          <h1 className="text-lg mb-4">Пользователь не найден</h1>
          <button
            onClick={handleBack}
            className="text-xs font-bold uppercase tracking-widest text-[var(--p-primary)] hover:opacity-80 transition-opacity"
          >
            ← Назад
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const tierLists = tierListsData?.data ?? [];

  return (
    <>
      <SEOHead
        title={profile.username}
        description={`Профиль пользователя ${profile.username} на BookStrata. ${profile.stats?.tierListsCount || 0} тир-листов, ${profile.stats?.totalBooks || 0} книг.`}
        image={profile.avatarUrl || undefined}
        url={`/users/${id}`}
        type="profile"
        person={{
          name: profile.username,
          image: profile.avatarUrl || undefined,
          description: `Пользователь BookStrata: ${profile.stats?.tierListsCount || 0} тир-листов, ${profile.stats?.totalBooks || 0} книг в подборках.`,
        }}
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: profile.username, url: `/users/${id}` },
        ]}
      />
      <DashboardLayout showSearch={false} contentTopPadding="pt-16">
        <div className="user-profile-page user-profile-mesh min-h-screen cursor-default">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-12 sm:pb-16">
            {/* Breadcrumbs */}
            <Breadcrumbs
              items={[
                { label: "Главная", href: "/" },
                { label: profile.username },
              ]}
            />

            {/* Back button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--p-on-surface-variant)] hover:text-[var(--p-on-surface)] mb-8 transition-colors"
            >
              <ArrowLeft size={14} />
              Назад
            </button>

            {/* ═══ Profile Header ═══ */}
            <section className="flex flex-col items-center text-center gap-4 relative z-10 mb-8">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-[var(--p-secondary-container)] profile-avatar-pulse">
                  {profile.avatarUrl && !avatarFailed ? (
                    <RetryableImage
                      src={proxyImageUrl(profile.avatarUrl, 320)}
                      alt={profile.username || "Аватар"}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold bg-[var(--p-surface-container-high)] text-[var(--p-on-surface-variant)]">
                      {profile.username?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
              </div>

              {/* Name + badges */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <h1 className="font-[Manrope] text-xl sm:text-2xl font-extrabold leading-tight tracking-tight text-[var(--p-on-surface)]">
                    {profile.username}
                  </h1>
                  {profile.role === "admin" && (
                    <span className="profile-role-badge">Админ</span>
                  )}
                  {profile.role === "moderator" && (
                    <span className="profile-role-badge" style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd", borderColor: "rgba(59,130,246,0.5)" }}>
                      Мод
                    </span>
                  )}
                  {profile.isDonor && <DonorBadge />}
                  {profile.badges?.map((badge) => (
                    <span
                      key={badge.id}
                      className={`profile-role-badge`}
                      style={{
                        background: badge.color === "purple" ? "rgba(168,85,247,0.2)"
                          : badge.color === "blue" ? "rgba(59,130,246,0.2)"
                          : badge.color === "amber" ? "rgba(245,158,11,0.2)"
                          : badge.color === "green" ? "rgba(34,197,94,0.2)"
                          : badge.color === "red" ? "rgba(239,68,68,0.2)"
                          : "rgba(6,182,212,0.2)",
                        color: badge.color === "purple" ? "#c084fc"
                          : badge.color === "blue" ? "#93c5fd"
                          : badge.color === "amber" ? "#fcd34d"
                          : badge.color === "green" ? "#86efac"
                          : badge.color === "red" ? "#fca5a5"
                          : "#67e8f9",
                        borderColor: badge.color === "purple" ? "rgba(168,85,247,0.5)"
                          : badge.color === "blue" ? "rgba(59,130,246,0.5)"
                          : badge.color === "amber" ? "rgba(245,158,11,0.5)"
                          : badge.color === "green" ? "rgba(34,197,94,0.5)"
                          : badge.color === "red" ? "rgba(239,68,68,0.5)"
                          : "rgba(6,182,212,0.5)",
                      }}
                    >
                      {badge.text}
                    </span>
                  ))}
                </div>

                {profile.title && (
                  <div className="flex items-center gap-1 text-[var(--p-on-surface-variant)] text-sm mt-1">
                    {profile.icon && <span>{profile.icon}</span>}
                    {!profile.icon && <PawPrint size={14} />}
                    <span>{profile.title}</span>
                  </div>
                )}

                <p className="text-[var(--p-on-surface-muted)] text-sm mt-1">
                  На сайте с {formatDate(profile.createdAt)}
                </p>
              </div>
            </section>

            {/* ═══ Taste Match Banner ═══ */}
            {tasteMatch && (
              <section className="profile-taste-banner mb-8">
                {tasteMatch.commonBooks > 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsTasteMatchExpanded((prev) => !prev)}
                    aria-expanded={isTasteMatchExpanded}
                    aria-controls="taste-match-details"
                    className="w-full p-4 flex items-center justify-between text-left cursor-pointer transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-primary)]/50"
                  >
                    <div className="flex items-center gap-4">
                      <Heart
                        size={20}
                        className="text-[var(--p-primary)] shrink-0"
                      />
                      <div className="flex flex-col">
                        <span className="font-[Manrope] text-base font-semibold text-[var(--p-on-surface)]">
                          Совпадение вкусов:{" "}
                          <span className="text-[var(--p-primary)]">
                            {tasteMatch.matchPercent}%
                          </span>
                        </span>
                        <span className="text-sm text-[var(--p-on-surface-variant)]">
                          {tasteMatch.commonBooks}{" "}
                          {tasteMatch.commonBooks === 1
                            ? "общая книга"
                            : tasteMatch.commonBooks < 5
                              ? "общих книги"
                              : "общих книг"}{" "}
                          из {tasteMatch.totalBooks}
                        </span>
                      </div>
                    </div>
                    {isTasteMatchExpanded ? (
                      <ChevronUp
                        size={20}
                        className="text-[var(--p-on-surface-variant)] shrink-0"
                      />
                    ) : (
                      <ChevronDown
                        size={20}
                        className="text-[var(--p-on-surface-variant)] shrink-0"
                      />
                    )}
                  </button>
                ) : (
                  <div className="w-full p-4 flex items-center gap-4 text-left">
                    <Heart
                      size={20}
                      className="text-[var(--p-primary)] shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="font-[Manrope] text-base font-semibold text-[var(--p-on-surface)]">
                        Совпадение вкусов:{" "}
                        <span className="text-[var(--p-primary)]">
                          {tasteMatch.matchPercent}%
                        </span>
                      </span>
                      <span className="text-sm text-[var(--p-on-surface-variant)]">
                        {tasteMatch.commonBooks} общих книг из{" "}
                        {tasteMatch.totalBooks}
                      </span>
                    </div>
                  </div>
                )}

                {isTasteMatchExpanded &&
                  tasteMatch.matches &&
                  tasteMatch.matches.length > 0 && (
                    <div
                      id="taste-match-details"
                      className="border-t border-[var(--p-outline-variant)]/30 px-4 py-3 bg-[var(--p-surface-container-low)]/40 flex flex-col gap-2.5"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--p-on-surface-variant)]">
                        А где поставили (ваш тир → тир пользователя)
                      </div>
                      <div className="flex flex-col gap-2">
                        {tasteMatch.matches.map((m, idx) => {
                          const userLabel = getTierLabel(
                            m.tierInMine,
                            m.tierInMineRank,
                          );
                          const profileLabel = getTierLabel(
                            m.tierInProfile,
                            m.tierInProfileRank,
                          );
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs py-1 px-1.5 rounded hover:bg-[var(--p-surface-container-high)]/50 transition-colors"
                            >
                              {m.book.coverImageUrl && (
                                <img
                                  src={m.book.coverImageUrl}
                                  alt={m.book.title}
                                  className="h-5 w-3.5 rounded object-cover shrink-0"
                                />
                              )}
                              <span className="flex-1 truncate text-[var(--p-on-surface)]">
                                {m.book.title}
                                {m.book.author ? ` (${m.book.author})` : ""}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono">
                                <span
                                  className="inline-block max-w-25 sm:max-w-30 truncate rounded bg-pink-500/10 px-1.5 py-0.5 font-medium text-pink-400"
                                  title={userLabel}
                                >
                                  {userLabel}
                                </span>
                                {renderComparisonIndicator(
                                  m.tierInMineRank,
                                  m.tierInProfileRank,
                                )}
                                <span
                                  className="inline-block max-w-25 sm:max-w-30 truncate rounded bg-[var(--p-primary-container)]/20 px-1.5 py-0.5 font-medium text-[var(--p-primary)]"
                                  title={profileLabel}
                                >
                                  {profileLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </section>
            )}

            {/* ═══ About Section ═══ */}
            {profile.bio && (
              <section className="flex flex-col gap-3 mb-8">
                <span className="profile-pill-label">О СЕБЕ</span>
                <p className="font-[Manrope] text-base leading-relaxed text-[rgba(226,226,226,0.9)] max-w-3xl">
                  {profile.bio}
                </p>
              </section>
            )}

            {/* ═══ Socials Section ═══ */}
            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <section className="flex flex-col gap-3 mb-8">
                <span className="profile-pill-label">СОЦСЕТИ</span>
                <div className="flex flex-wrap gap-3">
                  {profile.socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={
                        link.url.startsWith("http")
                          ? link.url
                          : `https://${link.url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-social-btn"
                    >
                      <span className="capitalize">{link.platform}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ═══ Moderation Panel ═══ */}
            {currentUser &&
              !isOwnProfile &&
              (currentUser.role === "admin" ||
                currentUser.role === "moderator") && (
                <div className="mb-8">
                  <ModerationPanel
                    userId={profile.id}
                    username={profile.username}
                    currentRole={profile.role || "user"}
                  />
                </div>
              )}

            {/* ═══ Stats Grid ═══ */}
            {profile.stats && (
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
                <StatCard
                  icon={<Trophy size={14} />}
                  label="Тир-листов"
                  value={profile.stats.tierListsCount}
                  onClick={() => navigate("/templates")}
                />
                <StatCard
                  icon={<Star size={14} />}
                  label="Опубликовано"
                  value={profile.stats.publishedCount}
                />
                <StatCard
                  icon={<Heart size={14} />}
                  label="Лайков"
                  value={profile.stats.likesCount}
                />
                <StatCard
                  icon={<BookOpen size={14} />}
                  label="Книг"
                  value={profile.stats.totalBooks}
                />
              </section>
            )}

            {/* ═══ Public Tier Lists ═══ */}
            <section>
              <h2 className="font-[Manrope] text-lg font-semibold uppercase tracking-wider text-[var(--p-on-surface)] mb-6">
                Публичные тир-листы
              </h2>

              {tierListsLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner size="md" />
                </div>
              ) : tierLists.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tierLists.map((tl: TierListShort) => (
                    <div
                      key={tl.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleTierListClick(tl.slug || tl.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleTierListClick(tl.slug || tl.id);
                        }
                      }}
                      className="profile-tier-card"
                    >
                      <h3 className="font-semibold text-[var(--p-on-surface)] mb-1 text-sm line-clamp-1">
                        {tl.title}
                      </h3>
                      {!tl.isPublic && <PrivateBadge />}
                      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--p-on-surface-variant)]">
                        <span className="flex items-center gap-1">
                          <Heart size={12} />
                          {tl.likesCount ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} />
                          {tl.booksCount ?? 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--p-on-surface-variant)] text-center py-8">
                  Нет публичных тир-листов
                </p>
              )}
            </section>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

/* ═══ StatCard ═══ */
function StatCard({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${label}: ${value}` : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`profile-stat-card ${interactive ? "cursor-pointer" : ""}`}
    >
      <div className="profile-stat-label">
        {icon}
        {label}
      </div>
      <div className="profile-stat-value">{value}</div>
    </div>
  );
}
