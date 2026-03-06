import { RefreshCw, SearchX, AlertCircle, List } from 'lucide-react';
import type { EmptyStatesProps } from '../types';

export function EmptyStates({
  isLoading,
  hasError,
  hasSearchQuery,
  isEmpty,
  onRetry,
  onCreateClick,
  onClearSearch,
  error,
}: EmptyStatesProps) {
  // Загрузка
  if (isLoading) {
    return (
      <div className="dashboard-state">
        <RefreshCw className="animate-spin" size={20} />
        <span>Загрузка тир-листов...</span>
      </div>
    );
  }

  // Поиск без результатов
  if (hasSearchQuery && isEmpty) {
    return (
      <div className="dashboard-state dashboard-state--centered">
        <SearchX size={56} />
        <h2>Рейтинги не найдены</h2>
        <p>Попробуйте изменить поисковый запрос</p>
        <button
          onClick={onClearSearch}
          className="dashboard-btn dashboard-btn--primary"
          type="button"
        >
          Показать все
        </button>
      </div>
    );
  }

  // Ошибка
  if (hasError) {
    return (
      <div className="dashboard-state dashboard-state--centered">
        <AlertCircle size={56} className="dashboard-state__error" />
        <h2>Ошибка загрузки тир-листов</h2>
        <p>
          {error instanceof Error
            ? error.message
            : 'Не удалось загрузить ваши тир-листы. Убедитесь, что вы авторизованы.'}
        </p>
        <button
          onClick={onRetry}
          className="dashboard-btn dashboard-btn--primary"
          type="button"
        >
          <RefreshCw size={16} />
          Попробовать снова
        </button>
      </div>
    );
  }

  // Пустой список
  if (isEmpty) {
    return (
      <div className="dashboard-state dashboard-state--centered">
        <List size={56} />
        <h2>У вас еще нет тир-листов</h2>
        <p>Начните с создания первого рейтинга</p>
        <button
          onClick={onCreateClick}
          className="dashboard-btn dashboard-btn--primary"
          type="button"
        >
          Создать первый тир-лист
        </button>
      </div>
    );
  }

  return null;
}
