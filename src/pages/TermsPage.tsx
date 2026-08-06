import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Mail, Send } from "lucide-react"
import { SEOHead } from "@/components/SEO/SEOHead"
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs"

export default function TermsPage() {
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-zinc-50 py-16 px-4">
      <SEOHead title="Условия использования BookStrata — правила сервиса тир лист книг" description="Ознакомьтесь с условиями использования BookStrata. Правила регистрации, размещения контента, ответственности и конфиденциальности при создании тир лист книг онлайн." url="/terms" breadcrumbs={[{ name: "Главная", url: "/" }, { name: "Условия использования", url: "/terms" }]} />
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={handleBack}
          className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Назад
        </button>
        <Breadcrumbs items={[{ label: "Условия использования" }]} theme="light" />

        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Условия использования
        </h1>
        <p className="text-sm text-slate-500 mb-8">Последнее обновление: {new Date().toLocaleDateString("ru-RU")}</p>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Общие положения</h2>
            <p>
              Используя сервис BookStrata, вы соглашаетесь с настоящими условиями. Если вы не согласны с
              какой-либо частью условий, вы должны прекратить использование сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Регистрация и аккаунт</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Вы несёте ответственность за сохранность своих учётных данных</li>
              <li>Мы оставляем за собой право заблокировать аккаунт при нарушении условий</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">3. Контент пользователей</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Вы сохраняете все права на созданный вами контент</li>
              <li>Запрещено публиковать материалы NSFW, оскорбительного или противоправного характера</li>
              <li>Администрация вправе удалять контент, нарушающий правила сервиса</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Ограничение ответственности</h2>
            <p>
              Сервис предоставляется «как есть». Мы не гарантируем бесперебойную работу и не несём
              ответственности за возможные убытки, связанные с использованием сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Изменение условий</h2>
            <p>
              Мы можем обновлять настоящие условия в любое время. Продолжая использовать сервис после
              изменений, вы принимаете новые условия.
            </p>
          </section>

          <section className="border-t border-slate-200 pt-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Связь с нами</h2>
            <p className="mb-4">
              Если у вас есть вопросы по условиям использования или работе сервиса — напишите нам:
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:fedorpasyada@yandex.ru"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                <Mail size={16} />
                fedorpasyada@yandex.ru
              </a>
              <a
                href="https://t.me/PasFedor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors"
              >
                <Send size={16} />
                Написать в Telegram
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
