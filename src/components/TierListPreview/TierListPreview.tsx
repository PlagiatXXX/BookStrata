import { memo } from "react"
import type { BattleTierList } from "@/types/battles"

interface TierListPreviewProps {
  tierList: BattleTierList
  maxBooksPerTier?: number
}

export const TierListPreview = memo(({ tierList, maxBooksPerTier = 6 }: TierListPreviewProps) => {
  const tiers = tierList.tiers ?? []

  return (
    <div className="flex flex-col gap-[3px]">
      {tiers.map((tier) => {
        const items = tier.items ?? []
        const visible = items.slice(0, maxBooksPerTier)
        const overflow = items.length - maxBooksPerTier

        return (
          <div key={tier.id} className="flex items-stretch gap-[2px]">
            <div
              className="flex items-center justify-center shrink-0 font-bold text-white"
              style={{
                width: 44,
                minHeight: 60,
                backgroundColor: tier.color,
                fontSize: 11,
                lineHeight: 1,
                letterSpacing: "0.05em",
                borderRadius: 3,
              }}
            >
              {tier.title}
            </div>
            <div className="flex items-center gap-[3px] flex-wrap min-h-[60px] flex-1">
              {visible.map((item) => (
                <div
                  key={`${tier.id}-${item.book.id}`}
                  className="rounded-[2px] border border-black/10 overflow-hidden shrink-0"
                  style={{ width: 44, aspectRatio: "2/3" }}
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
                  className="flex items-center justify-center rounded-[2px] bg-(--bg-2) text-(--ink-1) font-bold shrink-0"
                  style={{ width: 44, aspectRatio: "2/3", fontSize: 10 }}
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
