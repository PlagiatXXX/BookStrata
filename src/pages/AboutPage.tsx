import { useNavigate } from "react-router-dom"

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
      <div className="max-w-3xl mx-auto">
        <button onClick={handleBack} className="text-sm text-orange-500 hover:text-orange-600 mb-8 inline-block cursor-pointer">
          &larr; Назад
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          О проекте
        </h1>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Что такое BookStrata?</h2>
            <p>
              BookStrata — это социальная сеть для читателей, где можно создавать визуальные рейтинги книг
              (тир-листы), участвовать в баттлах, обсуждать книги и находить новые произведения по вкусу.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Возможности</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Создание тир-листов с кастомизацией блоков и обложек</li>
              <li>Баттлы — голосование за лучшие подборки книг</li>
              <li>Общий чат и обсуждения</li>
              <li>ИИ-библиотекарь для рекомендаций</li>
              <li>Профиль пользователя со статистикой и историей</li>
            </ul>
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
