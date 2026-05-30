import { Heart } from "lucide-react"

interface DonorBadgeProps {
  size?: "sm" | "md"
}

export function DonorBadge({ size = "md" }: DonorBadgeProps) {
  const sizeClasses = size === "sm"
    ? "text-[9px] px-1.5 py-0.5 gap-1"
    : "text-[10px] px-2 py-0.5 gap-1.5"

  const iconSize = size === "sm" ? 10 : 12

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-widest rounded
        bg-amber-500/15 text-amber-400 border border-amber-500/25 ${sizeClasses}`}
    >
      <Heart size={iconSize} fill="currentColor" />
      Меценат
    </span>
  )
}
