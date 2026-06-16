import { booksCountText } from "@/lib/plural"
import { proxyImageUrl } from "@/utils/imageProxy"

interface TierListCoverProps {
  coverImageUrl?: string | null
  title: string
  booksCount: number
  className?: string
}

export function TierListCover({ coverImageUrl, title, booksCount, className = "" }: TierListCoverProps) {
  if (coverImageUrl) {
    return (
      <div className={`tier-list-cover ${className}`}>
        <img
          src={proxyImageUrl(coverImageUrl)}
          alt={title}
          className="tier-list-cover__img"
          loading="lazy"
          onError={(e) => { e.currentTarget.src = '/images/books/placeholder.svg' }}
        />
      </div>
    )
  }

  return (
    <div className={`tier-list-cover tier-list-cover--gradient ${className}`}>
      <div className="tier-list-cover__icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>
      <span className="tier-list-cover__hint">{booksCountText(booksCount)}</span>
    </div>
  )
}
