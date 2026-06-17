import { memo } from "react"
import type { BattleTierList } from "@/types/battles"
import { proxyImageUrl } from "@/utils/imageProxy"

interface TierListPreviewProps {
  tierList: BattleTierList
  maxBooksPerTier?: number
  compact?: boolean
}

export const TierListPreview = memo(({ tierList, maxBooksPerTier, compact = false }: TierListPreviewProps) => {
  const tiers = tierList.tiers ?? []
  const booksPerTier = maxBooksPerTier ?? (compact ? 4 : 10)

  if (compact) {
    return (
      <div className="flex flex-col gap-[3px]">
        {tiers.map((tier) => {
          const items = tier.items ?? []
          const visible = items.slice(0, booksPerTier)
          const overflow = items.length - booksPerTier

          return (
            <div key={tier.id} className="flex items-stretch gap-[3px]">
              <div
                className="flex items-center justify-center shrink-0 font-bold text-white leading-none"
                style={{
                  width: 36,
                  minHeight: 64,
                  backgroundColor: tier.color,
                  fontSize: 10,
                  letterSpacing: "0.02em",
                  borderRadius: 4,
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  paddingTop: 6,
                  paddingBottom: 6,
                  overflow: "hidden",
                }}
                title={tier.title}
              >
                {tier.title}
              </div>
              <div className="flex items-center gap-[2px] flex-wrap min-h-[64px] flex-1">
                {visible.map((item) => (
                  <div
                    key={`${tier.id}-${item.book.id}`}
                    className="rounded-[3px] border border-black/10 overflow-hidden shrink-0"
                    style={{ width: 48, aspectRatio: "2/3" }}
                    title={item.book.title}
                  >
                    <img
                      src={proxyImageUrl(item.book.coverImageUrl)}
                      alt={item.book.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = '/images/books/placeholder.svg' }}
                    />
                  </div>
                ))}
                {overflow > 0 && (
                  <div
                    className="flex items-center justify-center rounded-[3px] bg-(--bg-2) text-(--ink-1) font-bold shrink-0"
                    style={{ width: 48, aspectRatio: "2/3", fontSize: 11 }}
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
  }

  return (
    <div className="flex flex-col gap-1">
      {tiers.map((tier) => {
        const items = tier.items ?? []
        const visible = items.slice(0, booksPerTier)
        const overflow = items.length - booksPerTier

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
                    src={proxyImageUrl(item.book.coverImageUrl)}
                    alt={item.book.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = '/images/books/placeholder.svg' }}
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
