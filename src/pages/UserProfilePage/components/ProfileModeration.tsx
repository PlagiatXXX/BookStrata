import { useState } from "react"
import { ShieldAlert, ChevronDown, ChevronUp } from "lucide-react"
import { ModerationPanel } from "@/components/ModerationPanel/ModerationPanel"
import { useAuth } from "@/hooks/useAuthContext"

interface ProfileModerationProps {
  userId: number
  username: string
  currentRole: string
}

/**
 * Блок модерации на чужом профиле (спека §6.7).
 * Кнопка «Управление» — только admin/moderator, смотрящему на чужой профиль.
 * Обычному посетителю, владельцу и гостю не показывается.
 */
export function ProfileModeration({
  userId,
  username,
  currentRole,
}: ProfileModerationProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const isStaffViewer =
    !!user && (user.role === "admin" || user.role === "moderator")
  const isOtherProfile = !!user && String(user.userId) !== String(userId)

  if (!isStaffViewer || !isOtherProfile) return null

  return (
    <div className="profile-moderation">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="profile-moderation-panel"
        className="profile-hero__action profile-hero__action--moderation"
      >
        <ShieldAlert size={16} aria-hidden="true" />
        Управление
        {open ? (
          <ChevronUp size={16} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div id="profile-moderation-panel" className="profile-moderation__panel">
          <ModerationPanel
            userId={userId}
            username={username}
            currentRole={currentRole}
          />
        </div>
      )}
    </div>
  )
}
