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

const PLACEHOLDER = "/images/new-placeholder.webp"

function NewsCard({ item }: { item: ExternalNewsItem }) {
  const isRussian = item.lang === "ru"

  return (
    <div className="group brutal-card brutal-border overflow-hidden hover-lift block">
      <div className="relative aspect-[16/9] overflow-hidden bg-(--bg-0)">
        <img
          src={item.imageUrl ?? PLACEHOLDER}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { e.currentTarget.src = '/images/placeholder.svg' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-(--bg-0)/80 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 max-w-[80%] z-10">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] bg-(--bg-0)/80 backdrop-blur-sm text-(--ink-0) px-1.5 py-0.5 md:px-2 md:py-1 rounded-sm border border-(--line-soft) max-w-full hover:bg-(--bg-0) transition-colors cursor-pointer"
          >
            <Globe size={10} className="hidden md:block shrink-0" />
            <span className="truncate">{item.source}</span>
          </a>
          {!isRussian && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] bg-(--accent-main)/20 backdrop-blur-sm text-(--accent-main) px-1.5 py-0.5 md:px-2 md:py-1 rounded-sm border border-(--accent-main)/30 shrink-0">
              EN
            </span>
          )}
        </div>
      </div>

        <div className="p-3 md:p-5">
          <div className="flex items-center justify-between mb-1.5 md:mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-(--ink-1)">
              {formatDate(item.publishedAt)}
            </span>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
              aria-label={`Читать: ${item.title}`}
            >
              <ExternalLink
                size={14}
                className="text-(--ink-2) hover:text-(--ink-0) transition-colors"
              />
            </a>
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            <h3
              className="community-heading text-sm md:text-base font-bold leading-snug mb-1 md:mb-2 line-clamp-2 hover:text-(--accent-main) transition-colors"
              dir={isRussian ? "auto" : undefined}
            >
              {item.title}
            </h3>
          </a>
          <p className="hidden md:block text-(--ink-1) text-sm leading-relaxed line-clamp-2">
            {item.excerpt.trim()}
          </p>
        </div>
    </div>
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
            <h2 className="community-heading text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
              Книжные новости мира
            </h2>
            <p className="text-(--ink-1) text-sm mt-1">
              The Guardian • Год Литературы
            </p>
          </div>
        </div>
        <div className="community-rule mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
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
            <h2 className="community-heading text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
              Книжные новости мира
            </h2>
            <p className="text-(--ink-1) text-sm mt-1">
              The Guardian • Год Литературы
            </p>
          </div>
        </div>
      </div>

      <div className="community-rule mb-6" />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
})
