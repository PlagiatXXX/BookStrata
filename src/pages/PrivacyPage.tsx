import { useNavigate, Link } from "react-router-dom"

export function PrivacyPage() {
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
          Политика конфиденциальности
        </h1>
        <p className="text-sm text-slate-500 mb-8">Последнее обновление: {new Date().toLocaleDateString("ru-RU")}</p>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Какие данные мы собираем</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Имя пользователя (логин) и адрес электронной почты — для создания и идентификации аккаунта</li>
              <li>Пароль — в зашифрованном виде (bcrypt), мы не храним пароли в открытом виде</li>
              <li>Аватар и изображения — которые вы загружаете или генерируете через сервис</li>
              <li>Контент тир-листов — списки книг, оценки, расположение по категориям</li>
              <li>Дата и время регистрации, последнего входа</li>
              <li>IP-адрес и данные User-Agent — для защиты от злоупотреблений и аналитики</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Как мы используем данные</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Для предоставления доступа к сервису (авторизация, сохранение контента)</li>
              <li>Для коммуникации: уведомления о подтверждении email, сбросе пароля</li>
              <li>Для модерации: проверка NSFW-контента, обработка жалоб</li>
              <li>Для улучшения сервиса: анонимная статистика использования</li>
              <li>Мы НЕ продаём ваши данные третьим лицам</li>
              <li>Мы НЕ используем данные для рекламных рассылок без вашего согласия</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">3. Хранение и защита данных</h2>
            <p>
              Данные хранятся на серверах в Российской Федерации. Мы используем отраслевые стандарты
              безопасности: шифрование паролей (bcrypt), JWT-токены с ограниченным сроком действия,
              HTTPS-соединение, защиту от SQL-инъекций через Prisma ORM.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Передача данных третьим лицам</h2>
            <p>
              Мы можем передавать данные только в следующих случаях:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>По требованию уполномоченных органов РФ (в соответствии с 152-ФЗ)</li>
              <li>Для обработки изображений: Cloudinary (хостинг изображений), TensorFlow.js (NSFW-проверка на стороне клиента)</li>
              <li>Для отправки email: SMTP-провайдер (Mailtrap в разработке, сторонний SMTP в продакшене)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Cookie и localStorage</h2>
            <p>
              Мы используем HTTP-only cookie для refresh-токена (недоступен из JavaScript)
              и localStorage для access-токена. Cookie не используются для отслеживания
              или рекламы. Вы можете очистить localStorage и cookie в настройках браузера.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Ваши права (152-ФЗ)</h2>
            <p>В соответствии с Федеральным законом «О персональных данных» № 152-ФЗ вы имеете право:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Получить информацию об обработке ваших персональных данных</li>
              <li>Требовать уточнения, блокирования или уничтожения ваших данных</li>
              <li>Отозвать согласие на обработку персональных данных</li>
              <li>Обжаловать действия оператора в уполномоченном органе</li>
            </ul>
            <p className="mt-2">
              Для запроса на удаление аккаунта обратитесь через форму обратной связи
              на странице /contact или напишите на почту администратора.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Контактная информация</h2>
            <p>
              По всем вопросам, связанным с обработкой персональных данных, обращайтесь
              через страницу обратной связи: <Link to="/contact" className="text-orange-500 hover:underline">/contact</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
