import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api-client";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { CollectionCard } from "@/components/CommunityComponents/CollectionCard";
import { CATEGORIES } from "@/data/mockData";
import type { CollectionItem } from "@/lib/collectionsApi";

interface TopicCollectionData {
  data: CollectionItem[];
  meta: {
    totalItems: number;
  };
}

const FALLBACK_ICON = BookOpen;

export default function TopicPage() {
  const { slug } = useParams<{ slug: string }>();

  // Находим категорию в статическом списке
  const category = useMemo(() => {
    if (!slug) return null;
    return CATEGORIES.find((c) => c.id === slug) || null;
  }, [slug]);

  const categoryLabel = category?.label || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "");

  const { data, isLoading } = useQuery<TopicCollectionData>({
    queryKey: ["topic", slug],
    queryFn: () => api.get(`/topics/${slug}`),
    enabled: !!slug,
    retry: 1,
  });

  const description = data?.data?.length
    ? `Подборки книг в жанре «${categoryLabel}» — ${data.data.slice(0, 3).map((c) => c.title).join(", ")} и другие. Рейтинг книг, отзывы, рекомендации. Составьте свой тир-лист на BookStrata.`
    : `Подборки книг в жанре «${categoryLabel}» — рейтинг читателей на BookStrata`;

  // Если всего одна коллекция — показываем её контент
  const singleCollection = data?.data?.length === 1 ? data.data[0] : null;

  if (isLoading) {
    return (
      <DashboardLayout showSearch={false}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-(--bg-1) rounded w-20" />
            <div className="h-10 bg-(--bg-1) rounded w-1/2" />
            <div className="h-4 bg-(--bg-1) rounded w-3/4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[200px] bg-(--bg-1) rounded" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <DashboardLayout showSearch={false}>
        <SEOHead
          title={`Жанр «${categoryLabel}» — подборок пока нет`}
          description={`В жанре «${categoryLabel}» пока нет подборок. Посмотрите другие коллекции на BookStrata.`}
          url={`/topics/${slug}`}
          noindex
          breadcrumbs={[{ name: "Главная", url: "/" }, { name: categoryLabel, url: `/topics/${slug}` }]}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-(--ink-2) mb-4">
            В жанре «{categoryLabel}» пока нет подборок
          </h1>
          <Link
            to="/community"
            className="inline-flex items-center gap-2 text-(--accent-main) hover:underline"
          >
            ← Все подборки
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Собираем редакционные заметки для SEO-текста
  const excerpt = (() => {
    if (!data.data.length) return null;
    const notes = data.data
      .map((c) => c.editorialNote)
      .filter((n): n is string => !!n && n.length > 30);
    const unique = [...new Set(notes)];
    if (unique.length > 0) return unique.join(" ");
    return `Подборки книг в жанре «${categoryLabel}» — лучшие книги, рейтинг читателей и рекомендации. Выберите подборку, отмечайте прочитанные книги и составляйте свой топ.`;
  })();

  const CategoryIcon = category?.icon || FALLBACK_ICON;

  return (
    <>
      <SEOHead
        title={`${categoryLabel} — подборки книг и рейтинг`}
        description={description}
        url={`/topics/${slug}`}
        breadcrumbs={[{ name: "Главная", url: "/" }, { name: categoryLabel, url: `/topics/${slug}` }]}
      />

      <DashboardLayout showSearch={false}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Главная", href: "/" }, { label: categoryLabel }]}
            theme="light"
          />

          {/* Header */}
          <div className="mb-8 mt-4">
            <div className="flex items-center gap-3 mb-3">
              <CategoryIcon size={24} className="text-(--accent-main)" />
              <span className="text-sm font-medium text-(--accent-main) uppercase tracking-wider">
                Жанр
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-(--ink-0) mb-3">
              {categoryLabel}
            </h1>
            <p className="text-(--ink-2) text-sm leading-relaxed max-w-2xl">
              Подборки книг в жанре {categoryLabel.toLowerCase()} — рейтинг читателей, отзывы и рекомендации.
              Выберите подборку, отмечайте прочитанные книги и составляйте свой топ.
            </p>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 mb-8 text-sm text-(--ink-2)">
            <div className="flex items-center gap-1.5">
              <BookOpen size={16} />
              <span>{data.meta.totalItems} {data.meta.totalItems === 1 ? "подборка" : "подборок"}</span>
            </div>
          </div>

          {/* SEO text */}
          {excerpt && data.data.length > 1 && (
            <div className="brutal-card brutal-border p-6 mb-8">
              <p className="text-base text-(--ink-1) leading-relaxed">{excerpt}</p>
            </div>
          )}

          {/* Single collection — показываем её содержимое */}
          {singleCollection && (
            <div className="mb-8">
              <div className="brutal-card brutal-border p-4 sm:p-6 flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-(--ink-2) mb-1">
                    Единственная подборка в этом жанре
                  </p>
                  <h2 className="text-xl font-bold text-(--ink-0) mb-2">
                    {singleCollection.title}
                  </h2>
                  {singleCollection.excerpt && (
                    <p className="text-sm text-(--ink-1) leading-relaxed mb-4">
                      {singleCollection.excerpt}
                    </p>
                  )}
                  <Link
                    to={`/collections/${singleCollection.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--accent-main) hover:underline"
                  >
                    Перейти к подборке
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
                {singleCollection.coverImageUrl && (
                  <div className="shrink-0 w-20 h-28 rounded-sm overflow-hidden border border-(--line-soft)">
                    <img
                      src={singleCollection.coverImageUrl}
                      alt={singleCollection.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none" }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collections grid (только если больше одной) */}
          {data.data.length > 1 && (
            <section>
              <h2 className="text-xl font-bold text-(--ink-0) mb-6">
                Подборки в этом жанре
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[200px]">
                {data.data.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Остальные категории — быстрая навигация */}
          <footer className="mt-12 pt-8 border-t border-(--line-soft)">
            <h3 className="text-sm font-bold text-(--ink-2) mb-3 uppercase tracking-wider">
              Другие жанры
            </h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.id !== "all" && c.id !== slug).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/topics/${cat.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full
                             bg-(--bg-1) text-(--ink-1) hover:bg-(--accent-main)/10 hover:text-(--accent-main)
                             transition-colors border border-(--line-soft)"
                >
                  <cat.icon size={12} />
                  {cat.label}
                </Link>
              ))}
            </div>
          </footer>
        </div>
      </DashboardLayout>
    </>
  );
}
