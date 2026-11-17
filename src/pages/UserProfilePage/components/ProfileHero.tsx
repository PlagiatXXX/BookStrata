import { useState, useRef, useEffect } from "react"
import {
  Camera,
  Pencil,
  Shield,
  PawPrint,
  Send,
  Twitter,
  Instagram,
  Youtube,
  Github,
  Globe,
  Link2,
  Share2,
  Copy,
  Check,
  type LucideIcon,
} from "lucide-react"
import { sileo } from "sileo"
import { DonorBadge } from "@/components/DonorBadge/DonorBadge"
import type { UserBadge } from "@/types/auth"
import { ProfileBadge } from "./ProfileBadge"
import { ProfileLevel } from "./ProfileLevel"
import { levelFromXp } from "@/lib/level"

/** Лимит соцсетей в профиле */
const SOCIAL_LINKS_LIMIT = 6

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  telegram: Send,
  twitter: Twitter,
  instagram: Instagram,
  vkontakte: Globe,
  youtube: Youtube,
  github: Github,
  website: Globe,
}

export interface ProfileHeroUser {
  id: number
  username: string
  avatarUrl: string | null
  bio: string | null
  socialLinks: { platform: string; url: string }[] | null
  isDonor?: boolean
  xp: number
  title: string | null
  icon: string | null
  createdAt: string
  badges?: UserBadge[]
  role?: string | null
}

export interface ProfileHeroProps {
  mode: "owner" | "visitor"
  profile: ProfileHeroUser
  isStaffVisitor: boolean
  onEditAvatar?: () => void
  onEditProfile?: () => void
  onShare: () => void
  onOpenSettings: () => void
  onOpenModeration: () => void
  onPreview?: () => void
  onExitPreview?: () => void
  isPreview: boolean
  onSaveBio?: (newBio: string) => Promise<void> | void
}

function RoleBadges({ role }: { role: string | null | undefined }) {
  if (role === "admin") return <ProfileBadge text="Админ" color="purple" />
  if (role === "moderator") return <ProfileBadge text="Мод" color="blue" />
  return null
}

export function ProfileHero({
  mode,
  profile,
  isStaffVisitor,
  onEditAvatar,
  onEditProfile,
  onShare,
  onOpenSettings,
  onOpenModeration,
  onPreview,
  onExitPreview,
  isPreview,
  onSaveBio,
}: ProfileHeroProps) {
  const isOwner = mode === "owner"
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioDraft, setBioDraft] = useState(profile.bio ?? "")
  const [isSavingBio, setIsSavingBio] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shareOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShareOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [shareOpen])

  const handleCopyLink = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement("textarea")
      el.value = url
      el.style.position = "fixed"
      el.style.opacity = "0"
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    setCopiedLink(true)
    sileo.success({ title: "Ссылка скопирована", duration: 2000 })
    setTimeout(() => {
      setCopiedLink(false)
      setShareOpen(false)
    }, 1200)
  }

  const handleShareSocial = (network: "telegram" | "vk") => {
    const rawUrl = window.location.href.split("?")[0]
    const url = encodeURIComponent(rawUrl)

    const level = levelFromXp(profile.xp)
    const titleWithIcon = profile.title
      ? `${profile.icon ? profile.icon + " " : ""}${profile.title}`
      : `Уровень ${level}`

    const lines = [
      `📚 Читательский профиль ${profile.username} на BookStrata`,
      `🏅 ${titleWithIcon} · Уровень ${level}`,
      profile.bio ? `💬 «${profile.bio.length > 90 ? profile.bio.slice(0, 87) + "..." : profile.bio}»` : "",
      `✨ Книжные рейтинги, любимые жанры и читательский билет. Заходи сравнить вкусы!`,
    ].filter(Boolean)

    const shareText = encodeURIComponent(lines.join("\n"))
    const shareTitle = encodeURIComponent(`Читательский профиль ${profile.username} на BookStrata`)

    // Формируем абсолютный URL картинки (аватарка или баннер BookStrata)
    let imageUrl = "https://bookstrata.ru/og-landing.webp"
    if (profile.avatarUrl) {
      if (profile.avatarUrl.startsWith("http")) {
        imageUrl = profile.avatarUrl
      } else {
        const origin = window.location.origin
        imageUrl = `${origin}${profile.avatarUrl.startsWith("/") ? "" : "/"}${profile.avatarUrl}`
      }
    }
    const encodedImage = encodeURIComponent(imageUrl)

    const shareUrl =
      network === "telegram"
        ? `https://t.me/share/url?url=${url}&text=${shareText}`
        : `https://vk.com/share.php?url=${url}&title=${shareTitle}&description=${shareText}&image=${encodedImage}&noparse=true`

    window.open(shareUrl, "_blank", "noopener,noreferrer,width=650,height=550")
    setShareOpen(false)
  }

  const socialLinks = profile.socialLinks ?? []
  const canAddSocial = isOwner && !isPreview && socialLinks.length < SOCIAL_LINKS_LIMIT
  const showXpLabel = isOwner && !isPreview

  const handleStartEdit = () => {
    setIsEditingBio(true)
    setBioDraft(profile.bio ?? "")
    onEditProfile?.()
  }

  const handleCancelBio = () => {
    setIsEditingBio(false)
    setBioDraft(profile.bio ?? "")
  }

  const handleSaveBio = async () => {
    setIsSavingBio(true)
    try {
      await onSaveBio?.(bioDraft)
      setIsEditingBio(false)
    } finally {
      setIsSavingBio(false)
    }
  }

  return (
    <section className="card profile-hero-card" aria-label={`Профиль ${profile.username}`}>
      {/* Аватар */}
      <div className="profile-hero__avatar-box">
        <div className="profile-hero__avatar-circle">
          {profile.avatarUrl && !avatarFailed ? (
            <img
              key={profile.avatarUrl}
              src={profile.avatarUrl}
              alt={profile.username}
              className="profile-hero__avatar-img"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span>{profile.username?.[0]?.toUpperCase() || "?"}</span>
          )}
        </div>
        {isOwner && !isPreview && onEditAvatar && (
          <button
            type="button"
            className="profile-hero__camera-btn"
            aria-label="Сменить аватар"
            title="Сменить аватар"
            onClick={onEditAvatar}
          >
            <Camera size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Центральная часть: звание, ник, дата, уровень */}
      <div className="profile-hero__details">
        {profile.title && (
          <span className="profile-hero__badge-pill">
            {profile.icon ? (
              <span aria-hidden="true">{profile.icon}</span>
            ) : (
              <PawPrint size={13} aria-hidden="true" />
            )}
            <span>{profile.title}</span>
          </span>
        )}

        <div className="profile-hero__username-row">
          <h1 style={{ margin: 0, fontSize: "inherit", fontWeight: "inherit", color: "inherit", display: "inline" }}>
            {profile.username}
          </h1>
          <RoleBadges role={profile.role} />
          {profile.isDonor && <DonorBadge />}
          {profile.badges?.map((badge) => (
            <ProfileBadge key={badge.id} text={badge.text} color={badge.color} />
          ))}
        </div>

        <div className="m">
          На сайте с {dateFormatter.format(new Date(profile.createdAt))}
        </div>

        <div className="profile-hero__level-wrap">
          <ProfileLevel xp={profile.xp} showXpLabel={showXpLabel} />
        </div>
      </div>

      {/* Колонка действий справа */}
      <div className="profile-hero__actions-col">
        {isOwner && !isPreview && (
          <button
            type="button"
            className="btn pri"
            onClick={handleStartEdit}
          >
            Редактировать профиль
          </button>
        )}
        {isOwner && !isPreview && onPreview && (
          <button type="button" className="btn" onClick={onPreview}>
            Как видят другие
          </button>
        )}
        <div ref={shareRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="btn"
            style={{ width: "100%" }}
            onClick={() => {
              setShareOpen((prev) => !prev)
              onShare()
            }}
            aria-expanded={shareOpen}
            aria-haspopup="true"
          >
            <Share2 size={15} aria-hidden="true" />
            Поделиться
          </button>

          {shareOpen && (
            <div
              className="card"
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 6px)",
                zIndex: 60,
                width: 210,
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                background: "#1c1c32",
              }}
              role="menu"
            >
              <button
                type="button"
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  border: "none",
                  padding: "8px 12px",
                  fontSize: 13,
                  gap: 10,
                  width: "100%",
                }}
                onClick={() => handleShareSocial("telegram")}
              >
                <Send size={15} color="#38bdf8" />
                Telegram
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  border: "none",
                  padding: "8px 12px",
                  fontSize: 13,
                  gap: 10,
                  width: "100%",
                }}
                onClick={() => handleShareSocial("vk")}
              >
                <Share2 size={15} color="#60a5fa" />
                ВКонтакте
              </button>
              <div style={{ height: 1, background: "rgba(255, 255, 255, 0.08)", margin: "4px 0" }} />
              <button
                type="button"
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  border: "none",
                  padding: "8px 12px",
                  fontSize: 13,
                  gap: 10,
                  width: "100%",
                }}
                onClick={() => void handleCopyLink()}
              >
                {copiedLink ? <Check size={15} color="#34d399" /> : <Copy size={15} />}
                {copiedLink ? "Скопировано" : "Копировать ссылку"}
              </button>
            </div>
          )}
        </div>
        {isPreview && onExitPreview && (
          <button
            type="button"
            className="btn pri"
            onClick={onExitPreview}
          >
            Вернуться
          </button>
        )}
        {mode === "visitor" && isStaffVisitor && !isPreview && (
          <button
            type="button"
            className="btn"
            style={{ borderColor: "rgba(255, 180, 171, 0.4)", color: "#ffb4ab" }}
            onClick={onOpenModeration}
          >
            <Shield size={16} aria-hidden="true" />
            Управление
          </button>
        )}
      </div>

      {/* О себе (на всю ширину) */}
      {isEditingBio ? (
        <div className="profile-hero__bio-editor">
          <textarea
            aria-label="О себе"
            className="profile-hero__bio-textarea"
            value={bioDraft}
            onChange={(e) => setBioDraft(e.target.value.slice(0, 500))}
            maxLength={500}
            placeholder="Расскажите о себе, ваших вкусах, любимых книгах..."
            autoFocus
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="m">{bioDraft.length} / 500</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn"
                style={{ minHeight: 36, padding: "6px 14px" }}
                onClick={handleCancelBio}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn pri"
                style={{ minHeight: 36, padding: "6px 14px" }}
                disabled={isSavingBio}
                onClick={handleSaveBio}
              >
                {isSavingBio ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        (profile.bio || (isOwner && !isPreview)) && (
          <div className="profile-hero__bio-text">
            {profile.bio ? (
              isOwner && !isPreview ? (
                <div
                  className="profile-hero__bio-display profile-hero__bio-display--editable"
                  onClick={handleStartEdit}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handleStartEdit()
                    }
                  }}
                  title="Нажмите, чтобы редактировать"
                >
                  <p className="profile-hero__bio-p">{profile.bio}</p>
                  <span className="profile-hero__bio-pencil" aria-hidden="true">
                    <Pencil size={14} />
                  </span>
                </div>
              ) : (
                <p className="profile-hero__bio-p">{profile.bio}</p>
              )
            ) : (
              <button
                type="button"
                onClick={handleStartEdit}
                className="profile-hero__bio-placeholder-btn"
                aria-label="Расскажите о себе, ваших вкусах, любимых книгах..."
              >
                <span>Расскажите о себе, ваших вкусах, любимых книгах...</span>
                <Pencil size={14} className="profile-hero__bio-pencil--always" aria-hidden="true" />
              </button>
            )}
          </div>
        )
      )}

      {/* Соцсети (на всю ширину) */}
      {(socialLinks.length > 0 || canAddSocial) && (
        <div className="profile-hero__socials-row">
          {socialLinks.slice(0, SOCIAL_LINKS_LIMIT).map((link, index) => {
            const Icon = PLATFORM_ICONS[link.platform] ?? Link2
            const href = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`
            return (
              <a
                key={`${link.platform}-${index}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="tag"
              >
                <Icon size={14} aria-hidden="true" />
                <span className="capitalize">{link.platform}</span>
              </a>
            )
          })}
          {canAddSocial && (
            <button
              type="button"
              className="btn"
              style={{
                borderStyle: "dashed",
                borderRadius: 99,
                color: "#a8aac0",
                padding: "8px 16px",
                minHeight: 38,
                fontSize: 13,
              }}
              onClick={onOpenSettings}
            >
              + Соцсеть · {socialLinks.length} из {SOCIAL_LINKS_LIMIT}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
