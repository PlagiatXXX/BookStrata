import type { TierListData } from '@/types';

// Функция для создания начальных данных для нового тир-листа
export function getInitialData(id: string, title: string): TierListData {
  return {
    id,
    title,

    // "Мастер-лист" всех доступных книг
    books: {},

    // Определяем структуру тиров (строк)
    tiers: {
      'tier-s': { id: 'tier-s', title: 'S', color: '#FF6B6B', bookIds: [] },
      'tier-a': { id: 'tier-a', title: 'A', color: '#4ECDC4', bookIds: [] },
      'tier-b': { id: 'tier-b', title: 'B', color: '#45B7D1', bookIds: [] },
      'tier-c': { id: 'tier-c', title: 'C', color: '#96CEB4', bookIds: [] },
      'tier-d': { id: 'tier-d', title: 'D', color: '#FFEAA7', bookIds: [] },
    },

    // Определяем порядок отображения тиров
    tierOrder: ['tier-s', 'tier-a', 'tier-b', 'tier-c', 'tier-d'],

    // Книги, которые еще не были распределены по тирам
    unrankedBookIds: [],
    tierIdToTempIdMap: {},
  };
}