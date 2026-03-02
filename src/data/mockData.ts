// src/pages/CommunityPage/data/mockData.ts
import { BookOpen, Book, History, Landmark, Rocket, SearchCheck, TrendingUp } from 'lucide-react';
import type { CreateTemplateData } from '@/types/templates';

export type TemplateItem = {
  id: number;
  title: string;
  category: string;
  categoryId: string;
  uses: string;
  author: string;
  image: string;
  size: 'large' | 'standard' | 'tall' | 'wide';
  badge?: { text: string; color: string };
  borderColor: string;
  templateData: CreateTemplateData;
};

export type NewsItem = {
  id: number;
  title: string;
  excerpt: string;
  tag: string;
  readTime: string;
};

export type CollectionItem = {
  id: number;
  title: string;
  coverImages: string[];
};


export const CATEGORIES = [
  { id: 'actual', label: 'Актуально', icon: TrendingUp },
  { id: 'fiction', label: 'Художественная', icon: Book },
  { id: 'non-fiction', label: 'Нон-фикшн', icon: History },
  { id: 'fantasy', label: 'Фэнтези', icon: BookOpen },
  { id: 'classics', label: 'Классика', icon: Landmark },
  { id: 'sci-fi', label: 'Sci-Fi', icon: Rocket },
  { id: 'mystery', label: 'Детективы', icon: SearchCheck },
];


export const TEMPLATES: TemplateItem[] = [
    {
    id: 1,
    title: 'БЕСТСЕЛЛЕРЫ ВСЕХ ВРЕМЁН',
    category: 'Бестселлеры',
    categoryId: 'actual',
    uses: '85k',
    author: 'BookWorm99',
    image: '/images/bestseller.webp',
    size: 'large',
    badge: { text: 'Избранное', color: 'accent-blue' },
    borderColor: 'accent-blue',
    templateData: {
      title: 'Бестселлеры всех времён',
      description: 'Классический шаблон для рейтинга лучших книг.',
      isPublic: false,
      tiers: [
        { id: 'tier_s', name: 'S', color: '#ef4444', order: 1 },
        { id: 'tier_a', name: 'A', color: '#f97316', order: 2 },
        { id: 'tier_b', name: 'B', color: '#eab308', order: 3 },
        { id: 'tier_c', name: 'C', color: '#84cc16', order: 4 },
        { id: 'tier_d', name: 'D', color: '#10b981', order: 5 },
      ],
    },
  },
  {
    id: 2,
    title: 'ОБЯЗАТЕЛЬНЫЕ КНИГИ 2024',
    category: 'Обязательное',
    categoryId: 'actual',
    uses: '15k',
    author: 'ReadFan',
    image: '/images/mandatory.webp',
    size: 'standard',
    borderColor: 'accent-green',
    templateData: {
      title: 'Обязательные книги 2024',
      description: 'Подборка для чтения в этом году.',
      isPublic: false,
      tiers: [
        { id: 'tier_gold', name: 'Must', color: '#f59e0b', order: 1 },
        { id: 'tier_silver', name: 'Very Good', color: '#22c55e', order: 2 },
        { id: 'tier_bronze', name: 'Maybe', color: '#3b82f6', order: 3 },
      ],
    },
  },
  {
    id: 6,
    title: 'ПОПУЛЯРНОЕ НА НЕДЕЛЕ',
    category: 'Тренд',
    categoryId: 'actual',
    uses: '42k',
    author: 'TrendWatcher',
    image: '/images/fantasy2.webp',
    size: 'standard',
    badge: { text: 'Hot', color: 'accent-orange' },
    borderColor: 'accent-orange',
    templateData: {
      title: 'Популярное на неделе',
      description: 'Самое обсуждаемое за последние 7 дней.',
      isPublic: false,
      tiers: [
        { id: 'tier_hot', name: 'Hot', color: '#ef4444', order: 1 },
        { id: 'tier_trending', name: 'Trending', color: '#f97316', order: 2 },
        { id: 'tier_rising', name: 'Rising', color: '#eab308', order: 3 },
      ],
    },
  },
  {
    id: 19,
    title: 'КЛАССИЧЕСКАЯ ЛИТЕРАТУРА',
    category: 'Классика',
    categoryId: 'actual',
    uses: '28k',
    author: 'ClassicReader',
    image: '/images/classic.webp',
    size: 'tall',
    badge: { text: 'Топ', color: 'primary' },
    borderColor: 'primary',
    templateData: {
      title: 'Классическая литература',
      description: 'Личное ранжирование классиков.',
      isPublic: false,
      tiers: [
        { id: 'tier_master', name: 'Шедевр', color: '#ef4444', order: 1 },
        { id: 'tier_strong', name: 'Сильно', color: '#f97316', order: 2 },
        { id: 'tier_ok', name: 'Неплохо', color: '#84cc16', order: 3 },
        { id: 'tier_later', name: 'Позже', color: '#3b82f6', order: 4 },
      ],
    },
  },
  {
    id: 3,
    title: 'ЭПИЧЕСКИЕ ФЭНТЕЗИ СЕРИИ',
    category: 'Фэнтези',
    categoryId: 'fantasy',
    uses: '32k',
    author: 'FantasyLover',
    image: '/images/fantasy.webp',
    size: 'large',
    badge: { text: 'Топ', color: 'accent-orange' },
    borderColor: 'accent-orange',
    templateData: {
      title: 'Эпические фэнтези серии',
      description: 'Ранжируйте саги, циклы и вселенные.',
      isPublic: false,
      tiers: [
        { id: 'tier_legend', name: 'Legend', color: '#8b5cf6', order: 1 },
        { id: 'tier_epic', name: 'Epic', color: '#ec4899', order: 2 },
        { id: 'tier_good', name: 'Good', color: '#22c55e', order: 3 },
        { id: 'tier_skip', name: 'Skip', color: '#64748b', order: 4 },
      ],
    },
  },
  {
    id: 7,
    title: 'YOUNG ADULT ФЭНТЕЗИ',
    category: 'Фэнтези',
    categoryId: 'fantasy',
    uses: '24k',
    author: 'YAFan',
    image: '/images/fantasy2.webp',
    size: 'standard',
    borderColor: 'accent-purple',
    templateData: {
      title: 'YA Фэнтези',
      description: 'Романтическое и приключенческое фэнтези для молодёжи.',
      isPublic: false,
      tiers: [
        { id: 'tier_s', name: 'S-Tier', color: '#8b5cf6', order: 1 },
        { id: 'tier_a', name: 'A-Tier', color: '#a855f7', order: 2 },
        { id: 'tier_b', name: 'B-Tier', color: '#c084fc', order: 3 },
        { id: 'tier_c', name: 'C-Tier', color: '#d8b4fe', order: 4 },
      ],
    },
  },
  {
    id: 8,
    title: 'ЛИТРПГ И ПРОГРЕССИВ',
    category: 'Фэнтези',
    categoryId: 'fantasy',
    uses: '18k',
    author: 'GamerReader',
    image: '/images/fantasy.webp',
    size: 'standard',
    borderColor: 'accent-blue',
    templateData: {
      title: 'ЛитРПГ и Прогрессив',
      description: 'Книги с системами, уровнями и игровыми механиками.',
      isPublic: false,
      tiers: [
        { id: 'tier_god', name: 'God Tier', color: '#ef4444', order: 1 },
        { id: 'tier_op', name: 'OP', color: '#f97316', order: 2 },
        { id: 'tier_strong', name: 'Strong', color: '#22c55e', order: 3 },
        { id: 'tier_trash', name: 'Skip', color: '#64748b', order: 4 },
      ],
    },
  },
  {
    id: 9,
    title: 'РОМАНТИЧЕСКОЕ ФЭНТЕЗИ',
    category: 'Фэнтези',
    categoryId: 'fantasy',
    uses: '21k',
    author: 'RomanceReader',
    image: '/images/fantasy2.webp',
    size: 'tall',
    badge: { text: 'Романтика', color: 'accent-pink' },
    borderColor: '#ec4899',
    templateData: {
      title: 'Романтическое фэнтези',
      description: 'Любовь, магия и приключения.',
      isPublic: false,
      tiers: [
        { id: 'tier_otp', name: 'OTP', color: '#ec4899', order: 1 },
        { id: 'tier_fave', name: 'Favorite', color: '#f472b6', order: 2 },
        { id: 'tier_good', name: 'Good', color: '#f9a8d4', order: 3 },
        { id: 'tier_meh', name: 'Meh', color: '#cbd5e1', order: 4 },
      ],
    },
  },
  // Фэнтези - Тёмное
  {
    id: 10,
    title: 'ТЁМНОЕ ФЭНТЕЗИ',
    category: 'Фэнтези',
    categoryId: 'fantasy',
    uses: '12k',
    author: 'DarkFantasyFan',
    image: '/images/fantasy.webp',
    size: 'standard',
    borderColor: '#b91c1c', // accent-red
    templateData: {
      title: 'Тёмное фэнтези',
      description: 'Мрачные миры, антигерои и жестокие истории.',
      isPublic: false,
      tiers: [
        { id: 'tier_masterpiece', name: 'Masterpiece', color: '#7f1d1d', order: 1 },
        { id: 'tier_dark', name: 'Dark', color: '#b91c1c', order: 2 },
        { id: 'tier_atmospheric', name: 'Atmospheric', color: '#dc2626', order: 3 },
        { id: 'tier_skip', name: 'Skip', color: '#64748b', order: 4 },
      ],
    },
  },
  // Классика
  {
    id: 11,
    title: 'КЛАССИЧЕСКАЯ ЛИТЕРАТУРА',
    category: 'Классика',
    categoryId: 'classics',
    uses: '28k',
    author: 'ClassicReader',
    image: '/images/classic.webp',
    size: 'tall',
    badge: { text: 'Топ', color: 'primary' },
    borderColor: 'primary',
    templateData: {
      title: 'Классическая литература',
      description: 'Личное ранжирование классиков.',
      isPublic: false,
      tiers: [
        { id: 'tier_master', name: 'Шедевр', color: '#ef4444', order: 1 },
        { id: 'tier_strong', name: 'Сильно', color: '#f97316', order: 2 },
        { id: 'tier_ok', name: 'Неплохо', color: '#84cc16', order: 3 },
        { id: 'tier_later', name: 'Позже', color: '#3b82f6', order: 4 },
      ],
    },
  },
  // Детективы
  {
    id: 5,
    title: 'ТРИЛЛЕРЫ И ДЕТЕКТИВЫ',
    category: 'Детективы',
    categoryId: 'mystery',
    uses: '19k',
    author: 'MysteryFan',
    image: '/images/detectiv.webp',
    size: 'standard',
    borderColor: 'accent-blue',
    templateData: {
      title: 'Триллеры и детективы',
      description: 'Отметьте лучшие расследования и повороты.',
      isPublic: false,
      tiers: [
        { id: 'tier_twist', name: 'Twist', color: '#ef4444', order: 1 },
        { id: 'tier_strong', name: 'Strong', color: '#f97316', order: 2 },
        { id: 'tier_ok', name: 'OK', color: '#eab308', order: 3 },
        { id: 'tier_skip', name: 'Skip', color: '#64748b', order: 4 },
      ],
    },
  },
  // Художественная литература
  {
    id: 12,
    title: 'СОВРЕМЕННАЯ ПРОЗА',
    category: 'Художественная',
    categoryId: 'fiction',
    uses: '22k',
    author: 'ProseLover',
    image: '/images/prosa.webp',
    size: 'large',
    badge: { text: 'Популярное', color: 'accent-blue' },
    borderColor: 'accent-blue',
    templateData: {
      title: 'Современная проза',
      description: 'Рейтинг современной художественной литературы.',
      isPublic: false,
      tiers: [
        { id: 'tier_master', name: 'Шедевр', color: '#ef4444', order: 1 },
        { id: 'tier_great', name: 'Отлично', color: '#f97316', order: 2 },
        { id: 'tier_good', name: 'Хорошо', color: '#eab308', order: 3 },
        { id: 'tier_ok', name: 'Нормально', color: '#84cc16', order: 4 },
      ],
    },
  },
  {
    id: 13,
    title: 'РУССКАЯ ПРОЗА',
    category: 'Художественная',
    categoryId: 'fiction',
    uses: '16k',
    author: 'RussianLitFan',
    image: '/images/prosa1.webp',
    size: 'standard',
    borderColor: 'primary',
    templateData: {
      title: 'Русская проза',
      description: 'Лучшие произведения русских авторов.',
      isPublic: false,
      tiers: [
        { id: 'tier_classic', name: 'Классика', color: '#ef4444', order: 1 },
        { id: 'tier_modern', name: 'Современная', color: '#f97316', order: 2 },
        { id: 'tier_new', name: 'Новая', color: '#22c55e', order: 3 },
      ],
    },
  },
  // Нон-фикшн
  {
    id: 14,
    title: 'НАУКА И ПОЗНАНИЕ',
    category: 'Нон-фикшн',
    categoryId: 'non-fiction',
    uses: '11k',
    author: 'ScienceBuff',
    image: '/images/classic.webp',
    size: 'standard',
    borderColor: 'accent-green',
    templateData: {
      title: 'Наука и познание',
      description: 'Научные книги и научно-популярная литература.',
      isPublic: false,
      tiers: [
        { id: 'tier_revolution', name: 'Революционное', color: '#8b5cf6', order: 1 },
        { id: 'tier_fundamental', name: 'Фундаментальное', color: '#a855f7', order: 2 },
        { id: 'tier_popular', name: 'Популярное', color: '#c084fc', order: 3 },
      ],
    },
  },
  {
    id: 15,
    title: 'БИЗНЕС И САМОРАЗВИТИЕ',
    category: 'Нон-фикшн',
    categoryId: 'non-fiction',
    uses: '34k',
    author: 'SelfGrowth',
    image: '/images/bestseller.webp',
    size: 'tall',
    badge: { text: 'Бестселлер', color: 'accent-orange' },
    borderColor: 'accent-orange',
    templateData: {
      title: 'Бизнес и саморазвитие',
      description: 'Книги для личностного роста и бизнеса.',
      isPublic: false,
      tiers: [
        { id: 'tier_must', name: 'Must Read', color: '#f59e0b', order: 1 },
        { id: 'tier_recommend', name: 'Рекомендую', color: '#22c55e', order: 2 },
        { id: 'tier_once', name: 'Прочитать', color: '#3b82f6', order: 3 },
      ],
    },
  },
  // Sci-Fi
  {
    id: 16,
    title: 'НАУЧНАЯ ФАНТАСТИКА',
    category: 'Sci-Fi',
    categoryId: 'sci-fi',
    uses: '27k',
    author: 'SciFiFan',
    image: '/images/fantasy.webp',
    size: 'large',
    badge: { text: 'Sci-Fi', color: 'accent-blue' },
    borderColor: 'accent-blue',
    templateData: {
      title: 'Научная фантастика',
      description: 'Космос, технологии и будущее.',
      isPublic: false,
      tiers: [
        { id: 'tier_masterpiece', name: 'Шедевр', color: '#0ea5e9', order: 1 },
        { id: 'tier_great', name: 'Отлично', color: '#38bdf8', order: 2 },
        { id: 'tier_good', name: 'Хорошо', color: '#7dd3fc', order: 3 },
        { id: 'tier_meh', name: 'Так себе', color: '#64748b', order: 4 },
      ],
    },
  },
  {
    id: 17,
    title: 'КИБЕРПАНК',
    category: 'Sci-Fi',
    categoryId: 'sci-fi',
    uses: '14k',
    author: 'CyberPunkFan',
    image: '/images/fantasy2.webp',
    size: 'standard',
    borderColor: 'accent-purple',
    templateData: {
      title: 'Киберпанк',
      description: 'Высокие технологии и низкая жизнь.',
      isPublic: false,
      tiers: [
        { id: 'tier_classic', name: 'Классика', color: '#a855f7', order: 1 },
        { id: 'tier_modern', name: 'Современное', color: '#c084fc', order: 2 },
        { id: 'tier_other', name: 'Другое', color: '#e9d5ff', order: 3 },
      ],
    },
  },
  {
    id: 18,
    title: 'КОСМИЧЕСКАЯ ОПЕРА',
    category: 'Sci-Fi',
    categoryId: 'sci-fi',
    uses: '9k',
    author: 'SpaceOperaFan',
    image: '/images/fantasy.webp',
    size: 'standard',
    borderColor: 'accent-blue',
    templateData: {
      title: 'Космическая опера',
      description: 'Галактические войны и приключения в космосе.',
      isPublic: false,
      tiers: [
        { id: 'tier_epic', name: 'Эпическое', color: '#0ea5e9', order: 1 },
        { id: 'tier_good', name: 'Хорошее', color: '#38bdf8', order: 2 },
        { id: 'tier_average', name: 'Среднее', color: '#7dd3fc', order: 3 },
      ],
    },
  },
];

export const COLLECTIONS: CollectionItem[] = [
  {
    id: 1,
    title: 'Лауреаты Нобелевской премии',
    coverImages: [
      '/images/bunin.webp',
      '/images/pasternak.webp',
      '/images/sholohov.webp',
    ],
  },
  {
    id: 2,
    title: 'Фавориты BookStrata',
    coverImages: [
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=400&auto=format&fit=crop',
    ],
  },
  {
    id: 3,
    title: 'Историческая проза',
    coverImages: [
      '/images/prosa.webp',
      '/images/prosa1.webp',
      '/images/prosa3.webp',
    ],
  },
];

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 1,
    title: 'Новые шаблоны недели: фэнтези, классика и sci‑fi',
    excerpt: 'Собрали свежие подборки, которые быстрее всего набирают оценки.',
    tag: 'Обновление',
    readTime: '2 мин',
  },
  {
    id: 2,
    title: 'Комьюнити‑лист: лучшие подборки марта',
    excerpt: 'Смотрите топ‑рейтинги и идеи, как оформить свой тир‑лист.',
    tag: 'Комьюнити',
    readTime: '3 мин',
  },
  {
    id: 3,
    title: 'Как делать компактные шаблоны без потери качества',
    excerpt: 'Мини‑гайд по оптимизации изображений и структуры списков.',
    tag: 'Гайд',
    readTime: '4 мин',
  }
];