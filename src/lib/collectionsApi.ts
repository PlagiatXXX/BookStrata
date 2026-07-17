import type { CollectionItem } from "@/types/collection";
import { apiClient, ApiRequestError } from "./api-client";

export type CreateCollectionInput = Omit<
  CollectionItem,
  "slug" | "id" | "createdAt" | "updatedAt"
>;
export type UpdateCollectionInput = Partial<CreateCollectionInput>;

// Получить все опубликованные коллекции (для публичного листинга)
export async function getCollections(): Promise<CollectionItem[]> {
  const res = await apiClient.get<{ data: CollectionItem[] }>("/collections");
  return (res.data || []).sort((a, b) => a.order - b.order);
}

// Получить все коллекции для админки (включая черновики)
export async function getAllCollectionsForAdmin(): Promise<CollectionItem[]> {
  return apiClient.get<CollectionItem[]>("/collections/admin");
}

// Получить коллекцию по ID (для админки)
export async function getCollectionById(
  id: number,
): Promise<CollectionItem | null> {
  try {
    const res = await apiClient.get<CollectionItem>(`/collections/admin?id=${id}`);
    return res;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// Получить коллекцию по slug
export async function getCollectionBySlug(
  slug: string,
): Promise<CollectionItem | null> {
  try {
    return await apiClient.get<CollectionItem>(`/collections/${slug}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// Получить коллекцию по slug с пропуском isPublished (для админ-превью)
export async function getCollectionPreviewBySlug(
  slug: string,
): Promise<CollectionItem | null> {
  try {
    return await apiClient.get<CollectionItem>(`/collections/admin/preview/${slug}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}



export async function getFeaturedCollections(): Promise<CollectionItem[]> {
  const res = await apiClient.get<{ data: CollectionItem[] }>("/collections?isFeatured=true");
  return (res.data || []).sort((a, b) => a.order - b.order);
}

// Получить не-featured коллекции (для страницы Сообщества)
export async function getCommunityCollections(): Promise<CollectionItem[]> {
  const res = await apiClient.get<{ data: CollectionItem[] }>("/collections?isFeatured=false");
  return (res.data || []).sort((a, b) => a.order - b.order);
}

// Создать коллекцию
export async function createCollection(
  input: CreateCollectionInput,
): Promise<CollectionItem> {
  return apiClient.post<CollectionItem>("/collections", input);
}

// Обновить коллекцию
export async function updateCollection(
  id: number,
  input: UpdateCollectionInput,
): Promise<CollectionItem> {
  return apiClient.put<CollectionItem>(`/collections/${id}`, input);
}

// Удалить коллекцию
export async function deleteCollection(id: number): Promise<void> {
  return apiClient.delete(`/collections/${id}`);
}

// Переключить статус публикации
export async function toggleCollectionPublish(
  id: number,
): Promise<CollectionItem> {
  return apiClient.patch<CollectionItem>(`/collections/${id}/toggle-publish`);
}

// Спарсить книги из статьи по URL
export async function parseBooksFromUrl(
  url: string,
): Promise<{ title: string; author: string; coverImageUrl: string }[]> {
  return apiClient.post<{ title: string; author: string; coverImageUrl: string }[]>(
    "/collections/admin/parse-url",
    { url },
  );
}

// Найти обложки для книг
export async function fetchCoversForBooks(
  books: { title: string; author: string }[],
): Promise<{ title: string; author: string; coverImageUrl: string }[]> {
  return apiClient.post<{ title: string; author: string; coverImageUrl: string }[]>(
    "/collections/admin/fetch-covers",
    { books },
  );
}

// Загрузить обложку коллекции
export async function uploadCollectionCover(
  file: File,
): Promise<{ coverImageUrl: string }> {
  const base64 = await fileToBase64(file);
  return apiClient.post<{ coverImageUrl: string }>(
    "/collections/upload-cover",
    { coverImageUrl: base64 },
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
