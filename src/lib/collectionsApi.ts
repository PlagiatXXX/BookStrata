import { apiClient } from "./api-client";
import type { CollectionItem } from "@/data/mockData";

export type { CollectionItem };
export type CreateCollectionInput = Omit<
  CollectionItem,
  "slug" | "id" | "createdAt" | "updatedAt"
>;
export type UpdateCollectionInput = Partial<CreateCollectionInput>;

// Получить все опубликованные коллекции
export async function getCollections(): Promise<CollectionItem[]> {
  const res = await apiClient.get<{ data: CollectionItem[] }>("/collections");
  return res.data;
}

// Получить все коллекции для админки (включая черновики)
export async function getAllCollectionsForAdmin(): Promise<CollectionItem[]> {
  const res = await apiClient.get<{ data: CollectionItem[] }>("/collections/admin");
  return res.data;
}

// Получить коллекцию по ID (для админки)
export async function getCollectionById(
  id: number,
): Promise<CollectionItem | null> {
  try {
    const res = await apiClient.get<CollectionItem>(`/collections/admin?id=${id}`);
    return res;
  } catch {
    return null;
  }
}

// Получить коллекцию по slug
export async function getCollectionBySlug(
  slug: string,
): Promise<CollectionItem | null> {
  try {
    return await apiClient.get<CollectionItem>(`/collections/${slug}`);
  } catch {
    return null;
  }
}

// Получить все опубликованные коллекции (для публичного листинга)
export async function getPublishedCollections(): Promise<CollectionItem[]> {
  const res = await apiClient.get<{ data: CollectionItem[] }>("/collections");
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
