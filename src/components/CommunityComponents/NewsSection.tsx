import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { getPublishedNews, type NewsArticle } from "@/lib/newsApi";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const fetchNews = async (): Promise<NewsArticle[]> => {
  return getPublishedNews(6);
};

interface NewsSectionProps {
  searchQuery?: string;
}

export const NewsSection = memo(({ searchQuery = "" }: NewsSectionProps) => {
  const {
    data: news,
    isLoading,
    error,
  } = useQuery<NewsArticle[]>({
    queryKey: ["news", "published"],
    queryFn: fetchNews,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const filteredNews = useMemo(() => {
    if (!news || !Array.isArray(news)) return [];
    if (!searchQuery.trim()) return news;
    const query = searchQuery.toLowerCase().trim();
    return news.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [news, searchQuery]);

  if (isLoading) {
    return (
      <section className="mb-12 reveal" data-reveal>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="community-heading text-3xl md:text-4xl font-black leading-tight">
              Новости и подборки
            </h2>
            <p className="text-(--ink-1) text-sm mt-1">
              Самое важное за последнее время
            </p>
          </div>
        </div>

        <div className="community-rule mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="brutal-card brutal-border p-6 animate-pulse"
            >
              <div className="h-4 bg-(--bg-1) rounded w-20 mb-3" />
              <div className="h-6 bg-(--bg-1) rounded w-full mb-2" />
              <div className="h-4 bg-(--bg-1) rounded w-3/4" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || !news || !Array.isArray(news) || news.length === 0) {
    if (!searchQuery.trim()) return null;
  }

  if (filteredNews.length === 0 && searchQuery.trim()) {
    return null;
  }

  return (
    <section className="mb-12 reveal" data-reveal>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="community-heading text-3xl md:text-4xl font-black leading-tight">
            Новости и подборки
          </h2>
          <p className="text-(--ink-1) text-sm mt-1">
            Самое важное за последнее время
          </p>
        </div>
        <Link
          to="/community"
          className="text-(--ink-0) text-xs font-semibold uppercase tracking-[0.12em] border-b border-(--line-soft) hover:border-(--line-strong) cursor-pointer"
        >
          Все новости
        </Link>
      </div>

      <div className="community-rule mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredNews.map((article) => (
          <article
            key={article.id}
            className="brutal-card brutal-border p-6 hover-lift cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-(--ink-1) mb-3">
              {article.tags.length > 0 && (
                <span className="brutal-label px-2 py-0.5">
                  {article.tags[0]}
                </span>
              )}
              <span>
                {new Date(article.publishedAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <h3 className="community-heading text-xl font-bold leading-snug mb-2">
              {article.title}
            </h3>
            <p className="text-(--ink-1) text-sm mb-4">{article.excerpt}</p>
            <Link
              to={`/news/${article.id}`}
              className="text-(--ink-0) text-xs font-semibold uppercase tracking-[0.12em] border-b border-(--line-soft) hover:border-(--line-strong) cursor-pointer"
            >
              Открыть
            </Link>
          </article>
        ))}
      </div>

      {filteredNews.length === 0 && !searchQuery.trim() && (
        <div className="text-center py-12 text-(--ink-1)">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Новостей пока нет</p>
        </div>
      )}
    </section>
  );
});
