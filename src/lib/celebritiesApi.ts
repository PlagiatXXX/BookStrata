import type { Book, Tier } from "@/types";
import { apiClient, ApiRequestError } from "./api-client";

export interface CelebrityItem {
  id: number;
  slug: string;
  name: string;
  photoUrl: string;
  biography: string | null;
  category: string;
  isPublished: boolean;
  order: number;
  // Tier list data (curated)
  tiers?: Record<string, Tier>;
  tierOrder?: string[];
  books?: Record<string, Book>;
  unrankedBookIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CelebrityCategory {
  category: string;
  count: number;
}

export type CreateCelebrityInput = {
  name: string;
  photoUrl?: string;
  biography?: string;
  category?: string;
  isPublished?: boolean;
  order?: number;
  tiers?: Record<string, Tier>;
  tierOrder?: string[];
  books?: Record<string, Book>;
  unrankedBookIds?: string[];
};

export type UpdateCelebrityInput = Partial<CreateCelebrityInput>;

// Категории знаменитостей для отображения
export const CELEBRITY_CATEGORIES: Record<string, string> = {
  all: "Все",
  singer: "Певцы",
  actor: "Актёры",
  financier: "Финансисты",
  sportsman: "Спортсмены",
  writer: "Писатели",
  "tv-host": "Телеведущие",
  scientist: "Учёные",
  philosopher: "Философы",
  director: "Режиссёры",
  musician: "Музыканты",
  blogger: "Блогеры",
  other: "Другое",
};

// Получить всех опубликованных знаменитостей
export async function getCelebrities(): Promise<CelebrityItem[]> {
  const res = await apiClient.get<{ data: CelebrityItem[]; meta: { totalItems: number } }>("/celebrities");
  return res.data || [];
}

// Получить всех знаменитостей (для админки)
export async function getAllCelebritiesForAdmin(): Promise<CelebrityItem[]> {
  const res = await apiClient.get<{ data: CelebrityItem[]; meta: { totalItems: number } }>("/celebrities/admin");
  return res.data || [];
}

// Получить знаменитость по slug
export async function getCelebrityBySlug(slug: string): Promise<CelebrityItem | null> {
  try {
    return await apiClient.get<CelebrityItem>(`/celebrities/${slug}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// Получить знаменитость по ID (для админки)
export async function getCelebrityById(id: number): Promise<CelebrityItem | null> {
  try {
    const res = await apiClient.get<CelebrityItem>(`/celebrities/admin?id=${id}`);
    return res;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// Создать знаменитость
export async function createCelebrity(input: CreateCelebrityInput): Promise<CelebrityItem> {
  return apiClient.post<CelebrityItem>("/celebrities", input);
}

// Обновить знаменитость
export async function updateCelebrity(id: number, input: UpdateCelebrityInput): Promise<CelebrityItem> {
  return apiClient.put<CelebrityItem>(`/celebrities/${id}`, input);
}

// Удалить знаменитость
export async function deleteCelebrity(id: number): Promise<void> {
  return apiClient.delete(`/celebrities/${id}`);
}

// Переключить публикацию
export async function toggleCelebrityPublish(id: number): Promise<CelebrityItem> {
  return apiClient.patch<CelebrityItem>(`/celebrities/${id}/toggle-publish`);
}

// Загрузить фото знаменитости
export async function uploadCelebrityPhoto(file: File): Promise<{ photoUrl: string }> {
  const base64 = await fileToBase64(file);
  return apiClient.post<{ photoUrl: string }>(
    "/celebrities/upload-photo",
    { photoUrl: base64 },
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
