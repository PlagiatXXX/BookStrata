import { useNavigate } from "react-router-dom"

export function TermsPage() {
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
              <li>Запрещено создавать несколько аккаунтов с целью накрутки или обхода ограничений</li>
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
        </div>
      </div>
    </div>
  )
}
