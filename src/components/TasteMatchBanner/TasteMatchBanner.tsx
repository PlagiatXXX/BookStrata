import { Heart, Loader2, ChevronDown, ChevronUp, Minus } from "lucide-react"
import { useState } from "react"
import { useTasteMatch } from "@/hooks/useTasteMatch"
import type { ApiTierListResponse } from "@/types/api"

interface TasteMatchBannerProps {
  apiData: ApiTierListResponse | undefined
  isReadOnly: boolean
  authorUsername?: string
}

const TIER_LABELS = ["S", "A", "B", "C", "D", "F"]

export function TasteMatchBanner({
  apiData,
  isReadOnly,
  authorUsername,
}: TasteMatchBannerProps) {
  const { bestMatch, isLoading, hasAny } = useTasteMatch(apiData, isReadOnly)
  const [expanded, setExpanded] = useState(false)

  if (!isReadOnly || !hasAny) return null

  if (isLoading) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-3">
        <Loader2 size={14} className="animate-spin text-[#c1fffe]" />
        <span className="text-xs text-[#b8b1a3]">Считаю совпадение вкусов...</span>
      </div>
    )
  }

  if (!bestMatch) return null

  const isHighMatch = bestMatch.matchPercent >= 70
  const isMediumMatch = bestMatch.matchPercent >= 40

  return (
    <div
      className={`mb-6 rounded-md border ${
        isHighMatch
          ? "border-[#c1fffe]/30 bg-[#c1fffe]/5"
          : isMediumMatch
            ? "border-yellow-500/30 bg-yellow-500/5"
            : "border-white/10 bg-white/5"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        type="button"
      >
        <Heart
          size={16}
          className={
            isHighMatch
              ? "text-pink-400"
              : isMediumMatch
                ? "text-yellow-400"
                : "text-gray-500"
          }
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-[#f3efe6]">
            Совпадение вкусов:{" "}
            <span
              className={
                isHighMatch
                  ? "text-[#c1fffe]"
                  : isMediumMatch
                    ? "text-yellow-400"
                    : "text-gray-400"
              }
            >
              {bestMatch.matchPercent}%
            </span>
          </p>
          <p className="text-xs text-[#b8b1a3]">
            {bestMatch.commonBooks === 1
              ? `1 общая книга — вы оба читали одно и то же`
              : `${bestMatch.commonBooks} общих книг — вы читаете то же самое`}
            {bestMatch.commonBooks > 0 && (
              <span className="ml-1">
                (с «{bestMatch.title}»)
              </span>
            )}
          </p>
        </div>
        {bestMatch.details.length > 0 && (
          <span className="text-[#b8b1a3]">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        )}
      </button>

      {expanded && bestMatch.details.length > 0 && (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="mb-2 text-xs font-medium text-[#b8b1a3] uppercase tracking-wider">
            А где поставили (ваш тир → тир автора)
          </p>
          <div className="space-y-1.5">
            {bestMatch.details.map((d, i) => {
              const viewedLabel = TIER_LABELS[d.viewedTierIndex] ?? `T${d.viewedTierIndex}`
              const userLabel = TIER_LABELS[d.userTierIndex] ?? `T${d.userTierIndex}`
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-sm bg-black/30 px-2.5 py-1.5 text-xs"
                >
                  <span className="flex-1 truncate text-[#f3efe6]">
                    {d.title}{d.author ? ` (${d.author})` : ""}
                  </span>
                  <span className="font-mono text-[#c1fffe]">{viewedLabel}</span>
                  {d.tierDiff <= 1 ? (
                    <Minus size={12} className="text-green-400" />
                  ) : d.userTierIndex > d.viewedTierIndex ? (
                    <ChevronDown size={12} className="text-pink-400" />
                  ) : (
                    <ChevronUp size={12} className="text-[#c1fffe]" />
                  )}
                  <span className="font-mono text-pink-400">{userLabel}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
