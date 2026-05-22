import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Globe, TrendingUp, ExternalLink } from "lucide-react"
import { getExternalNews, type ExternalNewsItem } from "@/lib/externalNewsApi"
import "./TrendingNow.css"

const GRADIENTS = [
  "linear-gradient(135deg, #06bcf9 0%, #08a8e0 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
]

function NewsCard({ item }: { item: ExternalNewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="trending-card"
    >
      {item.imageUrl && !item.imageUrl.includes("unsplash") ? (
        <img
          src={item.imageUrl}
          alt=""
          className="trending-card__img"
          loading="lazy"
        />
      ) : (
        <div
          className="trending-card__bg"
          style={{ background: GRADIENTS[Math.abs(item.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % GRADIENTS.length] }}
        >
          <span className="trending-card__initial">
            {item.title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
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
  const navigate = useNavigate()

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
          <button
            className="trending-now__link"
            onClick={() => navigate("/community")}
            type="button"
          >
            Все новости →
          </button>
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
