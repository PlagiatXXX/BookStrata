import { memo } from "react"
import type { BattleTierList } from "@/types/battles"

interface TierListPreviewProps {
  tierList: BattleTierList
  maxBooksPerTier?: number
}

export const TierListPreview = memo(({ tierList, maxBooksPerTier = 10 }: TierListPreviewProps) => {
  const tiers = tierList.tiers ?? []

  return (
    <div className="flex flex-col gap-1">
      {tiers.map((tier) => {
        const items = tier.items ?? []
        const visible = items.slice(0, maxBooksPerTier)
        const overflow = items.length - maxBooksPerTier

        return (
          <div key={tier.id} className="flex items-stretch gap-1">
            <div
              className="flex items-center justify-center shrink-0 font-bold text-white"
              style={{
                width: 56,
                minHeight: 80,
                backgroundColor: tier.color,
                fontSize: 14,
                lineHeight: 1,
                letterSpacing: "0.05em",
                borderRadius: 6,
              }}
            >
              {tier.title}
            </div>
            <div className="flex items-center gap-[3px] flex-wrap min-h-[80px] flex-1">
              {visible.map((item) => (
                <div
                  key={`${tier.id}-${item.book.id}`}
                  className="rounded-[4px] border border-black/10 overflow-hidden shrink-0"
                  style={{ width: 80, aspectRatio: "2/3" }}
                  title={item.book.title}
                >
                  <img
                    src={item.book.coverImageUrl}
                    alt={item.book.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
              {overflow > 0 && (
                <div
                  className="flex items-center justify-center rounded-[4px] bg-(--bg-2) text-(--ink-1) font-bold shrink-0"
                  style={{ width: 80, aspectRatio: "2/3", fontSize: 13 }}
                >
                  +{overflow}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})
