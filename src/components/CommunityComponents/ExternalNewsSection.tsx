import { memo } from "react"
import { ExternalLink, Globe, BookOpen } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getExternalNews, type ExternalNewsItem } from "@/lib/externalNewsApi"

const fetchExternalNews = async (): Promise<ExternalNewsItem[]> => {
  return getExternalNews(6)
}

function formatDate(date: string) {
  const d = new Date(date)
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function NewsCard({ item }: { item: ExternalNewsItem }) {
  const isRussian = item.lang === "ru"

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group brutal-card brutal-border overflow-hidden hover-lift cursor-pointer block"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-(--bg-0)">
        <img
          src={item.imageUrl ?? ""}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-(--bg-0)/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 max-w-[80%]">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] bg-(--bg-0)/80 backdrop-blur-sm text-(--ink-0) px-2 py-1 rounded-sm border border-(--line-soft)">
            <Globe size={11} />
            {item.source}
          </span>
          {isRussian && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] bg-(--accent-main)/20 backdrop-blur-sm text-(--accent-main) px-2 py-1 rounded-sm border border-(--accent-main)/30">
              RU
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-(--ink-1)">
            {formatDate(item.publishedAt)}
          </span>
          <ExternalLink
            size={14}
            className="text-(--ink-2) group-hover:text-(--ink-0) transition-colors"
          />
        </div>
        <h3
          className="community-heading text-base font-bold leading-snug mb-2 group-hover:text-(--accent-main) transition-colors"
          dir={isRussian ? "auto" : undefined}
        >
          {item.title}
        </h3>
        <p className="text-(--ink-1) text-sm leading-relaxed line-clamp-2">
          {item.excerpt.trim()}
        </p>
      </div>
    </a>
  )
}

export const ExternalNewsSection = memo(() => {
  const {
    data: news,
    isLoading,
    error,
  } = useQuery<ExternalNewsItem[]>({
    queryKey: ["external-news"],
    queryFn: fetchExternalNews,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return (
      <section className="mb-12 reveal" data-reveal>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="community-heading text-3xl md:text-4xl font-black leading-tight">
              Книжные новости мира
            </h2>
            <p className="text-(--ink-1) text-sm mt-1">
              The Guardian • Год Литературы
            </p>
          </div>
        </div>
        <div className="community-rule mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="brutal-card brutal-border overflow-hidden animate-pulse">
              <div className="aspect-[16/9] bg-(--bg-0)" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-(--bg-1) rounded w-20" />
                <div className="h-4 bg-(--bg-1) rounded w-full" />
                <div className="h-4 bg-(--bg-1) rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error || !news || news.length === 0) {
    return null
  }

  return (
    <section className="mb-12 reveal" data-reveal>
      <div className="flex items-end justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-(--accent-main) shrink-0" />
          <div>
            <h2 className="community-heading text-3xl md:text-4xl font-black leading-tight">
              Книжные новости мира
            </h2>
            <p className="text-(--ink-1) text-sm mt-1">
              The Guardian • Год Литературы
            </p>
          </div>
        </div>
      </div>

      <div className="community-rule mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
})
