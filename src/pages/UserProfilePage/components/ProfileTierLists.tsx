import { Heart, BookOpen, ExternalLink } from "lucide-react"
import type { TierListShort } from "@/lib/tierListApi"
import { Spinner } from "@/components/Spinner"
import { PrivateBadge } from "@/components/PrivateBadge"

const PREVIEW_LIMIT = 6

interface ProfileTierListsProps {
  tierLists: TierListShort[]
  isLoading?: boolean
  isOwner: boolean
  onOpen: (id: string) => void
}

/**
 * Блок «Публичные тир-листы» (спека §6.5, макет обзор).
 */
export function ProfileTierLists({
  tierLists,
  isLoading = false,
  isOwner,
  onOpen,
}: ProfileTierListsProps) {
  const open = (tierList: TierListShort) => onOpen(tierList.id)

  return (
    <section aria-label="Публичные тир-листы" className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="h" style={{ margin: 0 }}>Публичные тир-листы</h2>
        {isOwner && (
          <a
            href="/dashboard"
            className="btn"
            style={{ padding: "6px 14px", minHeight: 34, fontSize: 13, textDecoration: "none" }}
          >
            <ExternalLink size={13} aria-hidden="true" />
            Управлять в дашборде
          </a>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Spinner size="md" />
        </div>
      ) : tierLists.length === 0 ? (
        <p className="m" style={{ margin: 0 }}>
          Пока нет публичных тир-листов
        </p>
      ) : (
        <div className="profile-tierlists-grid">
          {tierLists.slice(0, PREVIEW_LIMIT).map((tierList) => (
            <button
              key={tierList.id}
              type="button"
              className="text-left cursor-pointer"
              style={{
                background: "#232340",
                borderRadius: 14,
                padding: 14,
                border: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                color: "inherit",
                font: "inherit",
              }}
              onClick={() => open(tierList)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  open(tierList)
                }
              }}
            >
              {/* Декоративные цветные плашки тиров из макета */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
                <i style={{ height: 8, width: "90%", background: "#f87171", borderRadius: 4, display: "block" }} />
                <i style={{ height: 8, width: "70%", background: "#fb923c", borderRadius: 4, display: "block" }} />
                <i style={{ height: 8, width: "50%", background: "#facc15", borderRadius: 4, display: "block" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <b style={{ fontSize: 14, color: "#f1f1f5" }} className="truncate">
                  {tierList.title}
                </b>
                {!tierList.isPublic && <PrivateBadge />}
              </div>
              <div className="m" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <BookOpen size={12} aria-hidden="true" />
                  <span>{tierList.booksCount ?? 0}</span> книг
                </span>
                <span>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Heart size={12} aria-hidden="true" />
                  <span>{tierList.likesCount ?? 0}</span> лайков
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
