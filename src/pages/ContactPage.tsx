import { useCallback } from "react"
import { ArrowLeft, Mail } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { SEOHead } from "@/components/SEO/SEOHead"
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs"

export default function ContactPage() {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <SEOHead title="Контакты BookStrata — связь с создателями тир лист книг" description="Свяжитесь с командой BookStrata по вопросам сотрудничества, предложениям, рекламе или удалению контента. Создавайте тир лист книг и будьте на связи." url="/contact" breadcrumbs={[{ name: "Главная", url: "/" }, { name: "Контакты", url: "/contact" }]} />
      <div className="w-full max-w-3xl">
        <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Контакты" }]} theme="light" />

        {/* Назад */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-(--ink-1) hover:text-(--ink-0) mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Назад
        </button>
      </div>
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-(--accent-main)/10 border border-(--accent-main)/20 flex items-center justify-center mx-auto">
          <Mail size={32} className="text-(--accent-main)" />
        </div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Контакты</h1>
        <p className="text-(--ink-1) text-sm leading-relaxed">
          Если у вас есть вопросы по сервису, предложения о сотрудничестве, реклама или запросы об удалении контента — напишите нам. Мы открыты к диалогу и ценим обратную связь.
        </p>
        <a
          href="mailto:fedorpasyada@yandex.ru"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-(--ink-0) text-(--bg-0) text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Mail size={16} />
          fedorpasyada@yandex.ru
        </a>
        <p className="text-sm text-(--ink-2)">
          Или посмотрите{" "}
          <Link to="/faq" className="text-(--accent-main) hover:underline">
            частые вопросы
          </Link>
        </p>
      </div>
    </div>
  )
}
