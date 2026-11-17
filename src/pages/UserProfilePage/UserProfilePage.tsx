import { useCallback, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { sileo } from "sileo";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import {
  apiGetPublicUser,
  apiGetTasteMatch,
  apiGetUserTierLists,
  type PublicUserDna,
  type PublicUserStats,
} from "@/lib/userApi";
import { getReadingTicket } from "@/lib/readingDnaApi";
import { useAuth } from "@/hooks/useAuthContext";
import { useUser } from "@/hooks/useUser";
import { useAchievements } from "@/hooks/useAchievements";
import { useUserAchievements } from "@/hooks/useUserAchievements";
import { useMyReadingDna } from "@/hooks/useMyReadingDna";
import { useGenrePreferences } from "@/hooks/useGenrePreferences";
import { Spinner } from "@/components/Spinner";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { AvatarSelector } from "@/components/Avatar";
import { ProfileHero, type ProfileHeroUser } from "./components/ProfileHero";
import { ProfileStats } from "./components/ProfileStats";
import { ProfileTabs, type ProfileTab } from "./components/ProfileTabs";
import { ProfileOverview } from "./components/ProfileOverview";
import { ProfileTierLists } from "./components/ProfileTierLists";
import { ProfileAchievements } from "./components/ProfileAchievements";
import type { PublicAchievement } from "@/lib/achievementApi";
import { TasteMatchBanner } from "./components/TasteMatchBanner";
import { ProfileSettings } from "./components/ProfileSettings";
import { ProfileModeration } from "./components/ProfileModeration";
import "./UserProfilePage.css";

/**
 * Единая страница профиля `/users/:id` (спека §5, задача 10).
 *
 * Режим владельца определяется на клиенте и подтверждается авторизованными
 * эндпоинтами; публичные данные посетителя приходят из `/api/users/:id`.
 * `?preview=1` переключает владельца в режим «как видят другие».
 */
export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();

  const isOwner = !!currentUser && !!id && currentUser.userId === Number(id);
  const isPreview = searchParams.get("preview") === "1";
  const isStaffVisitor =
    !isOwner &&
    (currentUser?.role === "admin" || currentUser?.role === "moderator");

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [settingsSection, setSettingsSection] = useState<
    "genres" | "social" | undefined
  >(undefined);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  /* ── Данные владельца (только авторизованные эндпоинты) ── */
  const {
    user: ownerUser,
    stats: ownerStats,
    isLoading: ownerLoading,
    uploadAvatar: uploadOwnerAvatar,
    updateProfile: updateOwnerProfile,
    refreshUser,
  } = useUser();
  const {
    achievements: ownerAchievements,
    status: ownerAchievementStatus,
    isLoading: ownerAchievementsLoading,
  } = useAchievements();
  const { dna: ownerDna } = useMyReadingDna();
  const { data: ownerGenres = [] } = useGenrePreferences();

  /* ── Данные посетителя ── */
  const publicUserQuery = useQuery({
    queryKey: ["publicUser", id],
    queryFn: () => apiGetPublicUser(id!),
    enabled: !!id && !isOwner,
  });
  const publicAchievementsQuery = useUserAchievements(isOwner ? undefined : id);
  const tierListsQuery = useQuery({
    queryKey: ["userTierLists", id],
    queryFn: () => apiGetUserTierLists(id!, 1, 20),
    enabled: !!id,
  });

  // Полный билет ДНК посетителя (с осями) для миниатюры в профиле.
  const visitorDnaTicket = !isOwner ? publicUserQuery.data?.dna?.ticketNumber : undefined;
  const fullDnaQuery = useQuery({
    queryKey: ["readingDna", "ticket", visitorDnaTicket],
    queryFn: () => getReadingTicket(visitorDnaTicket!),
    enabled: !!visitorDnaTicket,
    staleTime: 5 * 60 * 1000,
  });
  const tasteMatchQuery = useQuery({
    queryKey: ["tasteMatch", id],
    queryFn: () => apiGetTasteMatch(id!),
    // Баннер — только авторизованному не-владельцу вне предпросмотра.
    enabled: !!id && !isOwner && !isPreview && !!currentUser,
    staleTime: 60_000,
  });

  /* ── Производные значения ── */
  // В предпросмотре данные остаются владельческими, а вид — как у посетителя.
  const displayMode: "owner" | "visitor" =
    isOwner && !isPreview ? "owner" : "visitor";

  const isLoading = isOwner ? ownerLoading && !ownerUser : publicUserQuery.isLoading;
  const hasLoadError =
    !isOwner &&
    (publicUserQuery.isError ||
      (!publicUserQuery.isLoading && !publicUserQuery.data));

  const publicStats = publicUserQuery.data?.stats;
  const username = isOwner ? ownerUser?.username : publicUserQuery.data?.username;

  const heroProfile: ProfileHeroUser | null = isOwner
    ? ownerUser
      ? {
          id: ownerUser.id,
          username: ownerUser.username,
          avatarUrl: ownerUser.avatarUrl,
          bio: ownerUser.bio,
          socialLinks: ownerUser.socialLinks,
          isDonor: ownerUser.isDonor,
          xp: ownerAchievementStatus?.xp ?? 0,
          title: ownerAchievementStatus?.title ?? null,
          icon: ownerAchievementStatus?.icon ?? null,
          createdAt: ownerUser.createdAt,
          badges: ownerUser.badges,
          role: ownerUser.role,
        }
      : null
    : (publicUserQuery.data ?? null);

  const genres = isOwner
    ? ownerGenres
    : (publicUserQuery.data?.genrePreferences ?? []);

  const dna: PublicUserDna | null = isOwner
    ? ownerDna
      ? {
          archetypeName: ownerDna.archetypeName,
          archetypeDesc: ownerDna.archetypeDesc ?? null,
          motto: ownerDna.motto ?? null,
          ticketNumber: ownerDna.ticketNumber,
        }
      : null
    : (publicUserQuery.data?.dna ?? null);

  const dnaAxes = isOwner
    ? (ownerDna?.axes ?? null)
    : (fullDnaQuery.data?.axes ?? null);

  const tierLists = tierListsQuery.data?.data ?? [];

  /* ── Действия ── */
  const handleExitPreview = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("preview");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const handlePreview = useCallback(() => {
    setActiveTab("overview");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("preview", "1");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const handleBack = useCallback(() => {
    if (isPreview) {
      handleExitPreview();
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [isPreview, handleExitPreview, navigate]);

  const handleTierListClick = useCallback(
    (tierListId: string) => navigate(`/tier-lists/${tierListId}`),
    [navigate],
  );

  const openSettings = useCallback((section?: "genres" | "social") => {
    setSettingsSection(section);
    setActiveTab("settings");
  }, []);

  const handleShare = useCallback(() => {
    // Вызывается при открытии меню шаринга в Hero
  }, []);

  const handleAvatarSave = useCallback(
    async (avatarUrl: string) => {
      try {
        await uploadOwnerAvatar(avatarUrl);
        setShowAvatarSelector(false);
        sileo.success({ title: "Аватар обновлен", duration: 3000 });
      } catch {
        sileo.error({
          title: "Ошибка при сохранении аватара",
          description: "Попробуйте загрузить другое изображение",
          duration: 3000,
        });
      }
    },
    [uploadOwnerAvatar],
  );

  const handleSaveBio = useCallback(
    async (newBio: string) => {
      if (!ownerUser) return;
      await updateOwnerProfile({
        username: ownerUser.username,
        bio: newBio.trim() || null,
        socialLinks: ownerUser.socialLinks,
      });
      sileo.success({ title: "Профиль обновлён", duration: 2000 });
      await refreshUser();
    },
    [ownerUser, updateOwnerProfile, refreshUser],
  );

  /* ── Слоты контента ── */
  const visitorAchievements: PublicAchievement[] = isPreview
    ? ownerAchievements
        .filter((a) => !(a.isSecret && !a.isEarned))
        .map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          iconUrl: a.iconUrl ?? null,
          xpValue: a.xpValue,
          earnedAt: a.earnedAt ?? "",
        }))
    : (publicAchievementsQuery.data ?? []);

  const achievementsPreview = displayMode === "owner" ? (
    <ProfileAchievements
      mode="owner"
      achievements={ownerAchievements}
      isLoading={ownerAchievementsLoading}
      limit={3}
      onShowAll={() => setActiveTab("achievements")}
    />
  ) : (
    <ProfileAchievements
      mode="visitor"
      achievements={visitorAchievements}
      isLoading={
        isPreview ? ownerAchievementsLoading : publicAchievementsQuery.isLoading
      }
      limit={3}
      onShowAll={() => setActiveTab("achievements")}
    />
  );

  const achievementsTab = displayMode === "owner" ? (
    <ProfileAchievements mode="owner" achievements={ownerAchievements} />
  ) : (
    <ProfileAchievements
      mode="visitor"
      achievements={visitorAchievements}
      isLoading={
        isPreview ? ownerAchievementsLoading : publicAchievementsQuery.isLoading
      }
    />
  );

  let statsNode: React.ReactNode = null;
  if (displayMode === "owner" && ownerStats) {
    statsNode = (
      <ProfileStats
        mode="owner"
        stats={ownerStats}
        onOpenTierLists={() => setActiveTab("tier-lists")}
      />
    );
  } else if (displayMode === "visitor" && (publicStats || (isPreview && ownerStats))) {
    const visitorStats = (publicStats ?? ownerStats) as PublicUserStats;
    statsNode = (
      <ProfileStats
        mode="visitor"
        stats={visitorStats}
        onOpenTierLists={() => setActiveTab("tier-lists")}
      />
    );
  }

  /* ── Состояния загрузки / ошибки ── */
  if (isLoading) {
    return (
      <DashboardLayout showSearch={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (hasLoadError || !heroProfile) {
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

  const seoDescription = `Читательский профиль ${username ?? "BookStrata"} на BookStrata: ${publicStats?.tierListsCount ?? ownerStats?.tierListsCount ?? 0} тир-листов, ${publicStats?.totalBooks ?? ownerStats?.totalBooks ?? 0} книг. Заходи сравнить вкусы!`;
  const rawAvatar = publicUserQuery.data?.avatarUrl ?? ownerUser?.avatarUrl;
  const seoImage = rawAvatar
    ? rawAvatar.startsWith("http")
      ? rawAvatar
      : `https://bookstrata.ru${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`
    : "https://bookstrata.ru/og-landing.webp";

  return (
    <>
      <SEOHead
        title={username ? `${username} — читательский профиль` : "Читательский профиль"}
        description={seoDescription}
        image={seoImage}
        url={`/users/${id}`}
        type="profile"
        noindex
        person={{
          name: username ?? "BookStrata",
          image: seoImage,
          description: seoDescription,
        }}
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: username ?? "Профиль", url: `/users/${id}` },
        ]}
      />
      <DashboardLayout showSearch={false} contentTopPadding="pt-16">
        <div className="user-profile-page min-h-screen cursor-default">
          <div className="profile-container">
            {/* Навигация: хлебные крошки слева, кнопка «Назад» справа */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <Breadcrumbs
                className="mb-0"
                items={[
                  { label: "Главная", href: "/" },
                  { label: username ?? "Профиль" },
                ]}
              />
              <button
                type="button"
                onClick={handleBack}
                className="btn"
                style={{
                  padding: "6px 14px",
                  minHeight: 34,
                  fontSize: 12,
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <ArrowLeft size={14} />
                Назад
              </button>
            </div>

            {/* Hero */}
            <div className="profile-page__hero">
              <ProfileHero
                mode={isOwner && !isPreview ? "owner" : "visitor"}
                profile={heroProfile}
                isStaffVisitor={isStaffVisitor}
                isPreview={isPreview}
                onEditAvatar={isOwner ? () => setShowAvatarSelector(true) : undefined}
                onEditProfile={isOwner ? () => openSettings() : undefined}
                onShare={() => void handleShare()}
                onOpenSettings={() => openSettings("social")}
                onOpenModeration={() => setModerationOpen((prev) => !prev)}
                onPreview={isOwner && !isPreview ? handlePreview : undefined}
                onExitPreview={isPreview ? handleExitPreview : undefined}
                onSaveBio={isOwner && !isPreview ? handleSaveBio : undefined}
              />
            </div>

            {/* Модерация: staff на чужом профиле, раскрывается из hero */}
            {isStaffVisitor && !isPreview && moderationOpen && (
              <div className="profile-page__section">
                <ProfileModeration
                  userId={heroProfile.id}
                  username={heroProfile.username}
                  currentRole={publicUserQuery.data?.role ?? "user"}
                  hideToggle
                />
              </div>
            )}

            {/* Совпадение вкусов — только авторизованному не-владельцу */}
            {displayMode === "visitor" && !isPreview && tasteMatchQuery.data && (
              <div className="profile-page__section">
                <TasteMatchBanner tasteMatch={tasteMatchQuery.data} />
              </div>
            )}

            {/* Статистика */}
            {statsNode && <div className="profile-page__section">{statsNode}</div>}

            {/* Табы */}
            <div className="profile-page__tabs">
              <ProfileTabs
                active={activeTab}
                isOwner={displayMode === "owner"}
                onChange={setActiveTab}
              />
            </div>

            {/* Контент вкладки */}
            <div className="profile-page__content">
              {activeTab === "overview" && (
                <ProfileOverview
                  mode={displayMode}
                  genres={genres}
                  dna={dna}
                  dnaAxes={dnaAxes}
                  tierLists={tierLists}
                  tierListsLoading={tierListsQuery.isLoading}
                  achievementsSlot={achievementsPreview}
                  onEditGenres={() => openSettings("genres")}
                  onOpenAchievements={() => setActiveTab("achievements")}
                  onOpenTierList={handleTierListClick}
                />
              )}
              {activeTab === "tier-lists" && (
                <ProfileTierLists
                  tierLists={tierLists}
                  isLoading={tierListsQuery.isLoading}
                  isOwner={displayMode === "owner"}
                  onOpen={handleTierListClick}
                />
              )}
              {activeTab === "achievements" && achievementsTab}
              {activeTab === "settings" && displayMode === "owner" && ownerUser && (
                <ProfileSettings
                  user={ownerUser}
                  onAvatar={() => setShowAvatarSelector(true)}
                  onRefresh={() => void refreshUser()}
                  initialSection={settingsSection}
                />
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Камера в hero — тот же AvatarSelector, что и в настройках */}
      {showAvatarSelector && ownerUser && (
        <AvatarSelector
          currentAvatar={ownerUser.avatarUrl}
          username={ownerUser.username}
          onSave={handleAvatarSave}
          onClose={() => setShowAvatarSelector(false)}
        />
      )}
    </>
  );
}
