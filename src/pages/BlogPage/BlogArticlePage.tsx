import { useParams, Link } from "react-router-dom"
import { Calendar, Clock, ArrowLeft } from "lucide-react"
import { SEOHead } from "@/components/SEO/SEOHead"
import { Footer } from "@/ui/Footer"
import { articlesMeta } from "@/content/articles"
import { mdToHtml } from "@/utils/mdToHtml"

// Импортируем все md-файлы как сырой текст
const rawModules = import.meta.glob<string>(
  "@/content/articles/*.md",
  { query: "?raw", import: "default", eager: true },
)

/** Из пути вида @/content/articles/why-not-goodreads.md → why-not-goodreads */
function pathToSlug(path: string): string {
  return path.replace(/^.*\//, "").replace(/\.md$/, "")
}

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const meta = articlesMeta.find((a) => a.slug === slug)

  // Ищем сырой контент по slug
  const entry = Object.entries(rawModules).find(
    ([path]) => pathToSlug(path) === slug,
  )
  const raw = entry?.[1]
  const html = raw ? mdToHtml(raw) : null

  if (!meta || !html) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b1620] text-[#e2e8f0]">
        <p className="text-lg">Статья не найдена</p>
        <Link
          to="/blog"
          className="text-sm text-[#06bcf9] transition-colors hover:text-[#38bdf8]"
        >
          ← Все статьи
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b1620] text-[#e2e8f0]">
      <SEOHead
        title={meta.title}
        description={meta.description}
        url={`/blog/${meta.slug}`}
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Блог", url: "/blog" },
          { name: meta.title, url: `/blog/${meta.slug}` },
        ]}
      />

      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#0b1620]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-[#f3efe6]"
          >
            BookStrata
          </Link>
          <Link
            to="/blog"
            className="flex items-center gap-1 text-sm text-[#94a3b8] transition-colors hover:text-[#06bcf9]"
          >
            <ArrowLeft size={14} /> Все статьи
          </Link>
        </div>
      </nav>

      {/* Article */}
      <article className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <h1 className="mb-4 font-display text-3xl font-extrabold tracking-tight text-[#f3efe6] md:text-4xl">
            {meta.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[#64748b]">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {meta.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {meta.readingTime}
            </span>
          </div>
        </header>

        <div
          className="prose-custom max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>

      {/* Footer with back link */}
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#06bcf9] transition-colors hover:text-[#38bdf8]"
        >
          <ArrowLeft size={14} /> Все статьи
        </Link>
      </div>

      <Footer variant="landing" />

      <style>{`
        .prose-custom h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
          color: #f3efe6;
          letter-spacing: -0.02em;
        }
        .prose-custom h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 0.5rem;
          color: #f3efe6;
        }
        .prose-custom p {
          margin-bottom: 1.25rem;
          line-height: 1.75;
          color: #cbd5e1;
        }
        .prose-custom strong {
          color: #f3efe6;
          font-weight: 600;
        }
        .prose-custom em {
          color: #e2e8f0;
        }
        .prose-custom code {
          background: rgba(6, 188, 249, 0.1);
          border: 1px solid rgba(6, 188, 249, 0.2);
          border-radius: 4px;
          padding: 0.125rem 0.375rem;
          font-size: 0.875em;
          color: #06bcf9;
        }
        .prose-custom pre {
          background: rgba(15, 30, 50, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.25rem;
          overflow-x: auto;
          margin-bottom: 1.5rem;
        }
        .prose-custom pre code {
          background: none;
          border: none;
          padding: 0;
          color: #e2e8f0;
          font-size: 0.8125rem;
          line-height: 1.6;
        }
        .prose-custom ul {
          margin-bottom: 1.25rem;
          padding-left: 1.25rem;
          list-style: disc;
        }
        .prose-custom li {
          margin-bottom: 0.375rem;
          color: #cbd5e1;
          line-height: 1.65;
        }
        .prose-custom a {
          color: #06bcf9;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.2s;
        }
        .prose-custom a:hover {
          color: #38bdf8;
        }
        .prose-custom blockquote {
          border-left: 3px solid #06bcf9;
          padding-left: 1rem;
          margin-bottom: 1.25rem;
          color: #94a3b8;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
