import { useNavigate } from "react-router-dom"
import { SEOHead } from "@/components/SEO/SEOHead"
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs"

export function AboutPage() {
  const navigate = useNavigate()

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-16 px-4">
      <SEOHead title="О проекте" description="BookStrata — создавайте тир лист книг онлайн, ведите визуальный книжный рейтинг, участвуйте в баттлах и находите книги по вкусу. Узнайте больше о проекте." url="/about" breadcrumbs={[{ name: "О проекте", url: "/about" }]} />
      <div className="max-w-3xl mx-auto">
        <Breadcrumbs items={[{ label: "О проекте" }]} theme="light" />

        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          О проекте
        </h1>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Что такое BookStrata?</h2>
            <p>
              BookStrata — это социальная сеть для читателей, где можно <strong>создать тир лист книг онлайн</strong>
              и вести собственный визуальный книжный рейтинг. Участвуйте в баттлах, обсуждайте любимые произведения
              и находите новые книги по вкусу с помощью ИИ-рекомендаций.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Возможности</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-800">Создание тир-листов</h3>
                <p className="mt-1">
                  Собирайте книги в наглядные блоки S, A, B, C, D. Настраивайте цвета, обложки, темы
                  и сортируйте книги в любом порядке. Ваш <strong>книжный тир лист</strong> станет отражением вашего вкуса.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Баттлы</h3>
                <p className="mt-1">
                  Сравнивайте свои подборки с другими читателями. Голосуйте за лучший <strong>тир лист книг</strong>,
                  участвуйте в еженедельных соревнованиях и докажите, что ваш вкус — лучший.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Обсуждения</h3>
                <p className="mt-1">
                  Комментируйте подборки, общайтесь в общем чате, делитесь мнениями в тематических форумах.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-800">ИИ-библиотекарь</h3>
                <p className="mt-1">
                  Умные рекомендации книг на основе ваших тир-листов и предпочтений. Нейросеть подбирает то,
                  что вам точно понравится.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Профиль и статистика</h3>
                <p className="mt-1">
                  Отслеживайте свою активность, копите XP, открывайте ачивки и повышайте уровень.
                  Публикуйте свой <strong>книжный рейтинг</strong> и находите читателей со схожими интересами.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Для кого этот проект?</h2>
            <p>
              BookStrata создана для всех, кто любит читать и хочет делиться своими впечатлениями
              в наглядном формате. Независимо от того, читаете ли вы по книге в неделю или
              десятками — здесь найдётся место для вашего мнения.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Контакты</h2>
            <p>
              По всем вопросам пишите в Telegram:{" "}
              <a href="https://t.me/bookstrata" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 underline">
                @bookstrata
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
