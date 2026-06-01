import { useNavigate } from "react-router-dom"

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
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Сведения об операторе</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Оператор персональных данных: {import.meta.env.VITE_OPERATOR_NAME}</li>
              <li>Контактный email: <a href={`mailto:${import.meta.env.VITE_OPERATOR_EMAIL}`} className="text-orange-500 hover:underline">{import.meta.env.VITE_OPERATOR_EMAIL}</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Какие данные мы собираем</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Имя пользователя (логин) и адрес электронной почты — для создания и идентификации аккаунта</li>
              <li>Пароль — в зашифрованном виде (bcrypt), мы не храним пароли в открытом виде</li>
              <li>Аватар и изображения — которые вы загружаете или генерируете через сервис</li>
              <li>Данные OAuth-аккаунтов (VK, Google) — ID, имя и email при входе через соцсети</li>
              <li>Контент тир-листов — списки книг, оценки, расположение по категориям</li>
              <li>Сообщения в обсуждениях и чате</li>
              <li>Голосования в битвах и оценки книг</li>
              <li>Статус Pro-подписки и информация о донатах</li>
              <li>Опыт (xp) и звания</li>
              <li>Информация о блокировках и предупреждениях (модерация)</li>
              <li>Дата и время регистрации, последнего входа</li>
              <li>IP-адрес и данные User-Agent — для защиты от злоупотреблений и аналитики</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Как мы используем данные</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Для предоставления доступа к сервису (авторизация, сохранение контента)</li>
              <li>Для коммуникации: уведомления о подтверждении email, сбросе пароля</li>
              <li>Для модерации: проверка NSFW-контента, обработка жалоб, блокировки нарушителей</li>
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
              <li>Для отправки email: Яндекс.Почта (Российская Федерация)</li>
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
            <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Срок хранения данных</h2>
            <p>
              Ваши персональные данные хранятся до момента удаления учётной записи.
              Неподтверждённые аккаунты (без верификации email) автоматически удаляются
              через 24 часа после регистрации. После удаления аккаунта все связанные
              с ним данные безвозвратно уничтожаются.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Ваши права (152-ФЗ)</h2>
            <p>В соответствии с Федеральным законом «О персональных данных» № 152-ФЗ вы имеете право:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Получить информацию об обработке ваших персональных данных</li>
              <li>Требовать уточнения, блокирования или уничтожения ваших данных</li>
              <li>Отозвать согласие на обработку персональных данных</li>
              <li>Обжаловать действия оператора в уполномоченном органе</li>
            </ul>
            <p className="mt-2">
              Для запроса на удаление аккаунта или по иным вопросам, связанным с
              персональными данными, напишите на email:
              <a href={`mailto:${import.meta.env.VITE_OPERATOR_EMAIL}`} className="text-orange-500 hover:underline ml-1">{import.meta.env.VITE_OPERATOR_EMAIL}</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Контактная информация</h2>
            <p>
              По всем вопросам, связанным с обработкой персональных данных, обращайтесь:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Email: <a href={`mailto:${import.meta.env.VITE_OPERATOR_EMAIL}`} className="text-orange-500 hover:underline">{import.meta.env.VITE_OPERATOR_EMAIL}</a></li>
              <li>Оператор: {import.meta.env.VITE_OPERATOR_NAME}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
