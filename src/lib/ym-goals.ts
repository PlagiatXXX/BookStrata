/**
 * Маппинг ID целей Яндекс.Метрики.
 *
 * reachGoal принимает либо строковое имя, либо числовой ID.
 * Используем ID — они стабильны и не зависят от переименования
 * целей в интерфейсе Метрики.
 *
 * Чтобы обновить: см. Management API → /management/v1/counter/{id}/goals
 */

export const YM_GOALS = {
  /** Создание тир-листа (action) */
  TIERLIST_CREATE: 593381662,

  /** Вход (action) */
  LOGIN: 567555195,

  /** Регистрация (action) */
  REGISTER: 567555266,

  /** Лайк (action) */
  LIKE: 567555383,

  /** Поиск книги (action) */
  BOOK_SEARCH: 567555439,

  /** Экспорт PNG (action) */
  EXPORT_PNG: 567555565,

  /** Обращение к ИИ-библиотекарю (action) */
  AI_LIBRARIAN: 567555942,

  /** Генерация аватара (action) */
  AI_AVATAR: 567555996,

  /** Копирование карты доната (action) */
  DONATE_COPY: 567554592,
} as const;

export type YmGoalId = (typeof YM_GOALS)[keyof typeof YM_GOALS];
