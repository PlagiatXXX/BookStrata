import { Heart } from "lucide-react"
import { getBadgeDescription } from "@/lib/badgeDescriptions"

interface DonorBadgeProps {
  size?: "sm" | "md"
}

export function DonorBadge({ size = "md" }: DonorBadgeProps) {
  const sizeClasses = size === "sm"
    ? "text-[9px] px-1.5 py-0.5 gap-1"
    : "text-[10px] px-2 py-0.5 gap-1.5"

  const iconSize = size === "sm" ? 10 : 12
  const desc = getBadgeDescription("меценат")

  return (
    <span
      className={`profile-badge--donor inline-flex items-center font-bold uppercase tracking-widest rounded
        bg-amber-500/15 text-amber-400 border border-amber-500/25 ${sizeClasses}`}
      tabIndex={0}
      aria-label={`Меценат: ${desc}`}
    >
      <Heart size={iconSize} fill="currentColor" />
      Меценат
      <span className="profile-badge__tooltip" role="tooltip">
        {desc}
      </span>
    </span>
  )
}
