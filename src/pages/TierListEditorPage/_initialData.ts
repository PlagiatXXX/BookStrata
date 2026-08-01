import type { Book, Tier, TierListData } from '@/types';
import type { CreateTemplateData } from '@/types/templates';

// Версия демо-данных. При изменении набора книг — увеличивать,
// чтобы у пользователей сбрасывался старый черновик в localStorage.
export const DEMO_DATA_VERSION = 1;

// 8 популярных книг для демо-режима (чтобы новички сразу могли попробовать перетаскивание)
// Используем обложки из public/images/books/ — все файлы физически присутствуют
const DEMO_BOOKS: Book[] = [
  {
    id: 'demo-master-i-margarita',
    title: 'Мастер и Маргарита',
    author: 'Михаил Булгаков',
    coverImageUrl: '/images/books/master-i-margarita.webp',
  },
  {
    id: 'demo-prestuplenie-i-nakazanie',
    title: 'Преступление и наказание',
    author: 'Фёдор Достоевский',
    coverImageUrl: '/images/books/prestuplenie-i-nakazanie.webp',
  },
  {
    id: 'demo-anna-karenina',
    title: 'Анна Каренина',
    author: 'Лев Толстой',
    coverImageUrl: '/images/books/anna-karenina.webp',
  },
  {
    id: 'demo-bratya-karamazovy',
    title: 'Братья Карамазовы',
    author: 'Фёдор Достоевский',
    coverImageUrl: '/images/books/bratya-karamazovy.webp',
  },
  {
    id: 'demo-shantaram',
    title: 'Шантарам',
    author: 'Грегори Дэвид Робертс',
    coverImageUrl: '/images/books/shantaram.webp',
  },
  {
    id: 'demo-sto-let-odinochestva',
    title: 'Сто лет одиночества',
    author: 'Габриэль Гарсиа Маркес',
    coverImageUrl: '/images/books/sto-let-odinochestva.webp',
  },
  {
    id: 'demo-voyna-i-mir',
    title: 'Война и мир',
    author: 'Лев Толстой',
    coverImageUrl: '/images/books/voyna-i-mir.webp',
  },
  {
    id: 'demo-shadow-wind',
    title: 'Тень ветра',
    author: 'Карлос Руис Сафон',
    coverImageUrl: '/images/books/shadow-wind.webp',
  },
];

// Функция для создания начальных данных нового тир-листа
export function getInitialData(id: string, title: string): TierListData {
  return {
    id,
    title,

    // "Мастер-лист" всех доступных книг
    books: {},

    // Определяем структуру тиров (строк)
    tiers: {
      'tier-s': { id: 'tier-s', title: 'Шедевр', color: '#FF6B6B', bookIds: [] },
      'tier-a': { id: 'tier-a', title: 'Отлично', color: '#4ECDC4', bookIds: [] },
      'tier-b': { id: 'tier-b', title: 'Хорошо', color: '#45B7D1', bookIds: [] },
      'tier-c': { id: 'tier-c', title: 'Средне', color: '#96CEB4', bookIds: [] },
      'tier-d': { id: 'tier-d', title: 'Плохо', color: '#FFEAA7', bookIds: [] },
    },

    // Определяем порядок отображения тиров
    tierOrder: ['tier-s', 'tier-a', 'tier-b', 'tier-c', 'tier-d'],

    // Книги, которые еще не были распределены по тирам
    unrankedBookIds: [],
    tierIdToTempIdMap: {},
  };
}

// Функция для создания начальных данных демо-тир-листа (с предзаполненными книгами)
export function getDemoInitialData(id: string, title: string): TierListData {
  const books: Record<string, Book> = {};
  const unrankedBookIds: string[] = [];

  for (const book of DEMO_BOOKS) {
    books[book.id] = book;
    unrankedBookIds.push(book.id);
  }

  return {
    ...getInitialData(id, title),
    books,
    unrankedBookIds,
  };
}

/**
 * Создаёт начальные данные тир-листа из шаблона (для /tier-lists/new?template=N).
 * Все книги складываются в «Книги без рейтинга» — пользователь сам распределяет их
 * по полкам (как в демо-режиме). Полки создаются из тиров шаблона, но пустые.
 * Префикс "tpl-" гарантирует, что бэкенд создаст книги и тиры как новые (temp-IDs).
 */
export function getTemplateInitialData(id: string, template: CreateTemplateData): TierListData {
  const books: Record<string, Book> = {};
  const tiers: Record<string, Tier> = {};
  const tierOrder: string[] = [];
  const unrankedBookIds: string[] = [];
  const tierIdToTempIdMap: Record<string, string> = {};

  for (const t of template.tiers) {
    const tempTierId = `tpl-${t.id}`;
    tierIdToTempIdMap[t.id] = tempTierId;
    tiers[tempTierId] = { id: tempTierId, title: t.name, color: t.color, bookIds: [] };
    tierOrder.push(tempTierId);
  }

  (template.defaultBooks || []).forEach((b, index) => {
    const tempBookId = `tpl-book-${index}`;
    books[tempBookId] = {
      id: tempBookId,
      title: b.title,
      author: b.author || '',
      coverImageUrl: b.coverImageUrl || '',
    };
    unrankedBookIds.push(tempBookId);
  });

  return {
    id,
    title: template.title,
    books,
    tiers,
    tierOrder,
    unrankedBookIds,
    isPublic: false,
    tierIdToTempIdMap,
  };
}