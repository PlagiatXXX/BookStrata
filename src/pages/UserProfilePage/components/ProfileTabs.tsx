export type ProfileTab =
  | "overview"
  | "comparison"
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
  { id: "comparison", label: "Сравнение" },
  { id: "tier-lists", label: "Тир-листы" },
  { id: "achievements", label: "Достижения" },
  { id: "settings", label: "Настройки" },
]

/** Табы профиля (спека §6.4). «Настройки» видны только владельцу. */
export function ProfileTabs({ active, isOwner, onChange }: ProfileTabsProps) {
  return (
    <div className="profile-tabs" role="tablist" aria-label="Разделы профиля">
      {TABS.filter((tab) => isOwner || tab.id !== "settings").map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`profile-tabs__tab${active === tab.id ? " profile-tabs__tab--active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
