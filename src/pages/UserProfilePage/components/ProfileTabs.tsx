export type ProfileTab =
  | "overview"
  | "tier-lists"
  | "achievements"
  | "settings"

interface ProfileTabsProps {
  active: ProfileTab
  isOwner: boolean
  onChange: (tab: ProfileTab) => void
}

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "tier-lists", label: "Тир-листы" },
  { id: "achievements", label: "Достижения" },
  { id: "settings", label: "Настройки" },
]

/** Табы профиля (спека §6.4, макет Obsidian Strata). «Настройки» видны только владельцу. */
export function ProfileTabs({ active, isOwner, onChange }: ProfileTabsProps) {
  return (
    <nav
      className="profile-tabs-nav"
      style={{
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        overflowX: "auto",
        gap: 0,
      }}
      role="tablist"
      aria-label="Разделы профиля"
    >
      {TABS.filter((tab) => isOwner || tab.id !== "settings").map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`tab${isActive ? " on" : ""}`}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
