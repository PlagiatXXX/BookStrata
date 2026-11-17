import { useState } from "react"
import {
  Camera,
  Pencil,
  Eye,
  Share2,
  Settings2,
  Shield,
  PawPrint,
  Send,
  Twitter,
  Instagram,
  Youtube,
  Github,
  Globe,
  Link2,
  type LucideIcon,
} from "lucide-react"
import { DonorBadge } from "@/components/DonorBadge/DonorBadge"
import type { UserBadge } from "@/types/auth"
import { ProfileBadge } from "./ProfileBadge"
import { ProfileLevel } from "./ProfileLevel"

/** Лимит соцсетей в профиле (см. ProfileBioEditor / спеку §5). */
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

/**
 * Минимальный структурный тип профиля для hero.
 * Hero получает и `User` (владелец), и `PublicUser` (посетитель) без приведения типов,
 * поэтому поля, отсутствующие у владельца, необязательны.
 */
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

interface ProfileHeroProps {
  mode: "owner" | "visitor"
  profile: ProfileHeroUser
  isStaffVisitor: boolean
  onEditAvatar?: () => void
  onEditProfile?: () => void
  onShare: () => void
  onOpenSettings: () => void
  onOpenModeration: () => void
  /** «Как видят другие» — включение предпросмотра. Если не передан, кнопка не рендерится. */
  onPreview?: () => void
  isPreview: boolean
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
  isPreview,
}: ProfileHeroProps) {
  const isOwner = mode === "owner"
  const [avatarFailed, setAvatarFailed] = useState(false)

  const socialLinks = profile.socialLinks ?? []
  const canAddSocial = isOwner && !isPreview && socialLinks.length < SOCIAL_LINKS_LIMIT
  const showXpLabel = isOwner && !isPreview

  return (
    <section className="profile-hero" aria-label={`Профиль ${profile.username}`}>
      <div className="profile-hero__avatar">
        <div className="profile-hero__avatar-frame profile-avatar-pulse">
          {profile.avatarUrl && !avatarFailed ? (
            <img
              key={profile.avatarUrl}
              src={profile.avatarUrl}
              alt={profile.username}
              className="profile-hero__avatar-img"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span className="profile-hero__avatar-letter">
              {profile.username?.[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        {isOwner && !isPreview && onEditAvatar && (
          <button
            type="button"
            className="profile-hero__camera"
            aria-label="Сменить аватар"
            title="Сменить аватар"
            onClick={onEditAvatar}
          >
            <Camera size={18} />
          </button>
        )}
      </div>

      <div className="profile-hero__info">
        {profile.title && (
          <span className="profile-hero__title">
            {profile.icon ? (
              <span aria-hidden="true">{profile.icon}</span>
            ) : (
              <PawPrint size={14} aria-hidden="true" />
            )}
            <span>{profile.title}</span>
          </span>
        )}

        <div className="profile-hero__name-row">
          <h1 className="profile-hero__name">{profile.username}</h1>
          <RoleBadges role={profile.role} />
          {profile.isDonor && <DonorBadge />}
          {profile.badges?.map((badge) => (
            <ProfileBadge key={badge.id} text={badge.text} color={badge.color} />
          ))}
        </div>

        <p className="profile-hero__joined">
          На BookStrata с {dateFormatter.format(new Date(profile.createdAt))}
        </p>

        <ProfileLevel xp={profile.xp} showXpLabel={showXpLabel} />

        {profile.bio && <p className="profile-hero__bio">{profile.bio}</p>}

        {(socialLinks.length > 0 || canAddSocial) && (
          <div className="profile-hero__socials">
            {socialLinks.slice(0, SOCIAL_LINKS_LIMIT).map((link, index) => {
              const Icon = PLATFORM_ICONS[link.platform] ?? Link2
              const href = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`
              return (
                <a
                  key={`${link.platform}-${index}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-social-btn profile-hero__social-chip"
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="capitalize">{link.platform}</span>
                </a>
              )
            })}
            {canAddSocial && (
              <button
                type="button"
                className="profile-social-btn profile-hero__social-add"
                onClick={onOpenSettings}
              >
                <Settings2 size={16} aria-hidden="true" />
                + Соцсеть · {socialLinks.length} из {SOCIAL_LINKS_LIMIT}
              </button>
            )}
          </div>
        )}

        <div className="profile-hero__actions">
          {isOwner && !isPreview && onEditProfile && (
            <button type="button" className="profile-hero__action" onClick={onEditProfile}>
              <Pencil size={16} aria-hidden="true" />
              Редактировать профиль
            </button>
          )}
          {isOwner && !isPreview && onPreview && (
            <button type="button" className="profile-hero__action" onClick={onPreview}>
              <Eye size={16} aria-hidden="true" />
              Как видят другие
            </button>
          )}
          <button type="button" className="profile-hero__action" onClick={onShare}>
            <Share2 size={16} aria-hidden="true" />
            Поделиться
          </button>
          {mode === "visitor" && isStaffVisitor && !isPreview && (
            <button
              type="button"
              className="profile-hero__action profile-hero__action--moderation"
              onClick={onOpenModeration}
            >
              <Shield size={16} aria-hidden="true" />
              Управление
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
