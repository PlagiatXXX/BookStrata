import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Calendar, User, Tag } from "lucide-react";
import "@/pages/AdminCollectionsPage/components/WysiwygEditor.css";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { getNewsById, type NewsArticle } from "@/lib/newsApi";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import DOMPurify from "dompurify";
import { sileo } from "sileo";
import "./NewsPage.css";

export function NewsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      if (!id) return;
      
      try {
        const data = await getNewsById(id);
        if (!data) {
          sileo.error({
            title: "Новость не найдена",
            description: "Возможно, она была удалена",
          });
          navigate("/community");
          return;
        }
        setArticle(data);
      } catch (error) {
        console.error("Failed to load news:", error);
        sileo.error({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить новость",
        });
        navigate("/community");
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, [id, navigate]);

  if (loading) {
    return (
      <DashboardLayout
        showTemplatesNav={false}
        showSearch={false}
        activeItem="Новости"
        bgVariant="dark"
      >
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="animate-pulse">
            <div className="h-4 bg-(--bg-1) rounded w-20 mb-4" />
            <div className="h-10 bg-(--bg-1) rounded w-3/4 mb-6" />
            <div className="h-4 bg-(--bg-1) rounded w-40 mb-8" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 bg-(--bg-1) rounded w-full" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <>
      <SEOHead
        title={article.title}
        description={article.excerpt || `Читайте новость "${article.title}" на BookStrata`}
        image={article.imageUrl || undefined}
        url={`/news/${id}`}
        type="article"
        publishedTime={article.publishedAt}
        author={article.authorName || undefined}
        breadcrumbs={[{ name: "Новости", url: "/community" }, { name: article.title, url: `/news/${id}` }]}
      />
      <DashboardLayout
        showTemplatesNav={false}
        showSearch={false}
        activeItem="Новости"
        bgVariant="dark"
      >
      <article className="max-w-4xl mx-auto px-6 py-12">
        <Breadcrumbs items={[{ label: "Новости", href: "/community" }, { label: article.title }]} />

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="brutal-label px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="community-heading text-2xl font-black leading-tight mb-6 sm:text-3xl md:text-4xl">
            {article.title}
          </h1>

          <div className="flex items-center gap-6 text-sm text-(--ink-1)">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>
                {new Date(article.publishedAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            {article.authorName && (
              <div className="flex items-center gap-2">
                <User size={16} />
                <span>{article.authorName}</span>
              </div>
            )}
          </div>
        </header>

        {/* Excerpt */}
        {article.excerpt && (
          <div className="brutal-card brutal-border p-6 mb-8">
            <p className="text-lg font-medium text-(--ink-0) leading-relaxed">
              {article.excerpt}
            </p>
          </div>
        )}

        {/* Content */}
        <div
          className="tiptap-editor"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content || '') }}
        />

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-(--line-soft)">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={16} className="text-(--ink-1)" />
            <span className="text-sm text-(--ink-1)">Теги:</span>
            {article.tags.map((tag) => (
              <Link
                key={tag}
                to={`/community?tag=${tag}`}
                className="text-sm text-(--accent-main) hover:underline cursor-pointer"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </footer>
      </article>
    </DashboardLayout>
    </>
  );
}
