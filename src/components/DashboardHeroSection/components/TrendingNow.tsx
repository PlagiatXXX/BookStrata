import { useQuery } from "@tanstack/react-query"
import { Globe, TrendingUp, ExternalLink } from "lucide-react"
import { getExternalNews, type ExternalNewsItem } from "@/lib/externalNewsApi"
import "./TrendingNow.css"

const PLACEHOLDER = "/images/new-placeholder.webp"

function NewsCard({ item }: { item: ExternalNewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="trending-card"
    >
      <img
        src={item.imageUrl ?? PLACEHOLDER}
        alt=""
        className="trending-card__img"
        loading="lazy"
      />
      <div className="trending-card__overlay" />
      <div className="trending-card__content">
        <span className="trending-card__source">
          <Globe size={10} />
          {item.source}
        </span>
        <p className="trending-card__title">{item.title}</p>
      </div>
      <div className="trending-card__link">
        <ExternalLink size={12} />
      </div>
    </a>
  )
}

export function TrendingNow() {
  const { data, isLoading } = useQuery({
    queryKey: ["trending-news"],
    queryFn: () => getExternalNews(4),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  const news = data ?? []

  if (isLoading) return null
  if (news.length === 0) return null

  return (
    <section className="trending-now">
      <div className="trending-now__container">
        <div className="trending-now__header">
          <h2 className="trending-now__title">
            <TrendingUp size={20} />
            Сейчас обсуждают
          </h2>
          <a
            href="/community#news"
            className="trending-now__link"
          >
            Все новости →
          </a>
        </div>

        <div className="trending-now__grid">
          {news.slice(0, 4).map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
