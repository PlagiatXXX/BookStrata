/**
 * Маппинг и форматирование событий аналитики.
 *
 * Переводит технические идентификаторы событий (включая data-analytics вида
 * `cta.dashboard.create_tierlist`, `nav.main.ratings_books`) в понятные русскоязычные
 * названия и задаёт цветовые стили бейджей в админ-панели.
 */

export const KNOWN_EVENT_LABELS: Record<string, string> = {
  // Базовые события страниц и жизненного цикла
  page_view: 'Просмотр страницы',
  user_register: 'Регистрация',
  login: 'Вход в систему',
  logout: 'Выход',
  session_heartbeat: 'Онлайн на странице',

  // Тир-листы
  tierlist_create: 'Создание тир-листа',
  tierlist_save: 'Сохранение тир-листа',
  tierlist_fork: 'Форк тир-листа',
  tierlist_like: 'Лайк тир-листа',
  tierlist_publish: 'Публикация тир-листа',
  tierlist_unpublish: 'Скрытие тир-листа',
  export_png: 'Экспорт в PNG',
  share_clicked: 'Поделились тир-листом',

  // Книги и полки
  book_add: 'Добавление книг',
  book_placed: 'Книга на полке',
  book_unranked: 'Книга в пуле (без тира)',
  book_search: 'Поиск книг',
  tier_create: 'Создание полки',
  tier_rename: 'Настройка полки',

  // Интерактив и фичи
  ai_librarian_message: 'Сообщение Букстражу',
  ai_librarian_suggestion: 'Подсказка Букстража',
  ai_avatar: 'Генерация аватара',
  donate_page_open: 'Открытие страницы угощения',
  donate_copy: 'Копирование реквизитов',
  review_write: 'Написание ревью',
  battle_participate: 'Участие в битве',
  battle_win: 'Победа в битве',

  // Авторизация и формы
  'auth.login_header': 'Клик «Войти» в шапке',
  'auth.login_landing': 'Клик «Войти» на лендинге',
  'auth.register_landing': 'Клик «Регистрация» на лендинге',
  'auth.tab_register': 'Вкладка регистрации',
  'auth.tab_login': 'Вкладка входа',
  'auth.submit_login': 'Отправка формы входа',
  'auth.submit_register': 'Отправка формы регистрации',
  'auth.forgot_password': 'Переход «Забыли пароль»',
  'auth.logout': 'Выход из профиля',
  'auth.logout_mobile': 'Выход (мобильное меню)',

  // Призывы к действию (CTA — дашборд, лендинг, футер)
  'cta.dashboard.create_tierlist': 'Создать тир-лист (дашборд)',
  'cta.dashboard.view_trends': 'Смотреть тренды (дашборд)',
  'cta.landing.open_collection': 'Открыть коллекцию (лендинг)',
  'cta.landing.start_free_hero': 'Начать бесплатно (лендинг)',
  'cta.landing.how_it_looks': 'Как это выглядит (лендинг)',
  'cta.landing.try_templates_all': 'Все шаблоны (лендинг)',
  'cta.landing.view_all_featured': 'Все популярные (лендинг)',
  'cta.landing.view_all_collections': 'Все коллекции (лендинг)',
  'cta.landing.register_after_try': 'Регистрация после пробы (лендинг)',
  'cta.landing.create_account_final': 'Создать аккаунт (финал лендинга)',
  'cta.landing.read_history': 'Читать историю (лендинг)',
  'cta.landing.donate': 'Поддержать проект (лендинг)',
  'cta.landing.start_now': 'Начать сейчас (тарифы)',
  'cta.footer.donate': 'Поддержать проект (футер)',
  'donate.footer.copy_card': 'Копирование карты (футер)',

  // Навигация
  'nav.main.ratings_books': 'Меню: Книги',
  'nav.main.ratings_celebrities': 'Меню: Знаменитости',
  'nav.main.ratings_authors': 'Меню: Авторы',
  'nav.main.shelf': 'Меню: Моя полка',
  'nav.main.donate': 'Меню: Поддержать',
  'nav.main.profile': 'Меню: Профиль',
  'nav.landing.features': 'Лендинг: Возможности',
  'nav.landing.featured': 'Лендинг: Популярное',
  'nav.landing.rankings': 'Лендинг: Рейтинги',
  'nav.landing.celebrities': 'Лендинг: Знаменитости',
  'nav.landing.authors': 'Лендинг: Авторы',
  'nav.mobile.ratings_books': 'Моб. меню: Книги',
  'nav.mobile.ratings_celebrities': 'Моб. меню: Знаменитости',
  'nav.mobile.ratings_authors': 'Моб. меню: Авторы',

  // UI
  'ui.landing.menu_toggle': 'Лендинг: Мобильное меню',
  'ui.landing.scroll_to_top': 'Кнопка «Наверх»',
}

/**
 * Преобразует строковый идентификатор события в читаемую русскую подпись.
 * Если событие известно — возвращает заданное название.
 * Для динамических событий шаблонов или неизвестных событий с префиксами строит человекопонятный заголовок.
 */
export function formatEventLabel(event: string): string {
  if (KNOWN_EVENT_LABELS[event]) {
    return KNOWN_EVENT_LABELS[event]
  }

  // Динамические шаблоны: cta.landing.try_template_12
  const templateMatch = event.match(/^cta\.landing\.try_template_(\w+)$/)
  if (templateMatch) {
    return `Шаблон тир-листа #${templateMatch[1]}`
  }

  // Динамические навигационные ключи: nav.mobile.home
  const mobileNavMatch = event.match(/^nav\.mobile\.(\w+)$/)
  if (mobileNavMatch) {
    return `Моб. навигация: ${mobileNavMatch[1]}`
  }

  // Общий парсинг точечной нотации (category.section.action)
  if (event.includes('.')) {
    const parts = event.split('.')
    const category = parts[0]
    const details = parts.slice(1).join(': ').replace(/_/g, ' ')

    let prefix = `[${category.toUpperCase()}]`
    if (category === 'cta') prefix = '[Кнопка]'
    else if (category === 'nav') prefix = '[Навигация]'
    else if (category === 'ui') prefix = '[Интерфейс]'
    else if (category === 'auth') prefix = '[Авторизация]'

    return `${prefix} ${details}`
  }

  return event
}

/**
 * Цветовой стиль для плашки события в интерфейсе админки.
 */
export function getEventBadgeStyle(event: string): string {
  // Навигация
  if (event.startsWith('nav.')) {
    return 'bg-sky-500/10 text-sky-400 border-sky-500/30'
  }
  // CTA кнопки
  if (event.startsWith('cta.') || event === 'tierlist_create') {
    return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  }
  // Авторизация
  if (event.startsWith('auth.') || event === 'login' || event === 'user_register') {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  }
  // Просмотры страниц
  if (event === 'page_view') {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  }
  // Донаты и поддержка
  if (event.startsWith('donate') || event.includes('donate')) {
    return 'bg-pink-500/10 text-pink-400 border-pink-500/30'
  }
  // Книги и полки
  if (event.startsWith('book_') || event.startsWith('tier_')) {
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  }
  // ИИ Букстраж
  if (event.startsWith('ai_')) {
    return 'bg-violet-500/10 text-violet-400 border-violet-500/30'
  }
  // Битвы
  if (event.startsWith('battle_')) {
    return 'bg-red-500/10 text-red-400 border-red-500/30'
  }

  return 'bg-white/5 text-gray-300 border-gray-700'
}

export interface EventOption {
  value: string
  label: string
}

/**
 * Полный отсортированный список опций для выпадающего списка фильтра админки.
 */
export const ALL_EVENT_OPTIONS: EventOption[] = Object.entries(KNOWN_EVENT_LABELS)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
