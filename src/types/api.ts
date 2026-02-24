// Описывает одну книгу, как она приходит из Prisma
export interface ApiBook {
  id: number;
  title: string;
  author: string | null;
  coverImageUrl: string;
  description: string | null;
  thoughts: string | null;
  createdAt: string;
}

// Описывает размещение книги (BookPlacement)
export interface ApiBookPlacement {
  rank: number;
  book: ApiBook;
}

// Описывает тир, как он приходит из Prisma
export interface ApiTier {
  id: number;
  title: string;
  color: string;
  rank: number;
  items: ApiBookPlacement[]; // Книги вложены сюда
}

// Описывает полный ответ от нашего GET /api/tier-lists/:id
export interface ApiTierListResponse {
  id: number;
  title: string;
  year: number | null;
  isPublic: boolean;
  user?: {
    id: number;
    username: string;
    avatarUrl?: string | null;
  };
  tiers: ApiTier[];
  unrankedBooks: ApiBookPlacement[];
  likesCount?: number;
}

// Описывает тир-шаблон, как он приходит из API
export interface ApiTemplate {
  id: number;  // Prisma возвращает number для auto-increment полей
  title: string;
  description?: string;
  tiers: ApiTierTemplate[];
  defaultBooks?: ApiBook[];
  isPublic: boolean;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
}

// Описывает тир в шаблоне
export interface ApiTierTemplate {
  id: number;
  name: string;
  color: string;
  order: number;
}

// Описывает ответ от API при получении списка шаблонов
export interface ApiTemplateListResponse {
  data: ApiTemplate[];
}

// Описывает ответ от API при получении одного шаблона
export interface ApiTemplateResponse {
  data: ApiTemplate;
}

// Описывает данные для создания шаблона
export interface CreateTemplateRequest {
  title: string;
  description?: string;
  tiers: ApiTierTemplate[];
  defaultBooks?: ApiBook[];
  isPublic?: boolean;
}

// Описывает данные для обновления шаблона
export interface UpdateTemplateRequest {
  title?: string;
  description?: string;
  tiers?: ApiTierTemplate[];
  defaultBooks?: ApiBook[];
  isPublic?: boolean;
}
