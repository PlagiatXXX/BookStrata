import { Link } from "react-router-dom"
import { Calendar, Clock, ArrowRight } from "lucide-react"
import { SEOHead } from "@/components/SEO/SEOHead"
import { Footer } from "@/ui/Footer"
import { articlesMeta } from "@/content/articles"

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#0b1620] text-[#e2e8f0]">
      <SEOHead
        title="Блог"
        description="Статьи о разработке BookStrata: архитектура, SSR, почему мы не копировали Goodreads и другие инженерные заметки."
        url="/blog"
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Блог", url: "/blog" },
        ]}
      />

      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#0b1620]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg font-bold tracking-tight text-[#f3efe6]">
            BookStrata
          </Link>
          <Link
            to="/"
            className="text-sm text-[#94a3b8] transition-colors hover:text-[#06bcf9]"
          >
            ← На сайт
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-3 font-display text-4xl font-extrabold tracking-tight text-[#f3efe6] md:text-5xl">
          Блог
        </h1>
        <p className="mb-12 max-w-xl text-lg text-[#94a3b8]">
          Инженерные заметки, архитектурные решения и мысли о разработке
          BookStrata. Без маркетинга — только код и опыт.
        </p>

        <div className="flex flex-col gap-8">
          {articlesMeta.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="group block rounded-2xl border border-white/5 bg-[rgba(15,30,50,0.4)] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10 hover:bg-[rgba(15,30,50,0.6)]"
            >
              <article>
                <h2 className="mb-2 text-xl font-bold text-[#f3efe6] transition-colors group-hover:text-[#06bcf9] md:text-2xl">
                  {article.title}
                </h2>
                <p className="mb-4 leading-relaxed text-[#94a3b8]">
                  {article.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-[#64748b]">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {article.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {article.readingTime}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[#06bcf9] opacity-0 transition-all group-hover:opacity-100">
                  Читать <ArrowRight size={14} />
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <Footer variant="landing" />
    </div>
  )
}
