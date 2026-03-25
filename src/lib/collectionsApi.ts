import { COLLECTIONS } from "@/data/mockData";
import type { CollectionItem } from "@/data/mockData";

export type { CollectionItem };
export type CreateCollectionInput = Omit<
  CollectionItem,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateCollectionInput = Partial<CreateCollectionInput>;

// Получить все коллекции
export async function getCollections(): Promise<CollectionItem[]> {
  // Имитация задержки API
  await new Promise((resolve) => setTimeout(resolve, 100));
  return COLLECTIONS.filter((c) => c.isPublished);
}

// Получить все коллекции для админки (включая черновики)
export async function getAllCollectionsForAdmin(): Promise<CollectionItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return COLLECTIONS;
}

// Получить коллекцию по ID
export async function getCollectionById(
  id: number,
): Promise<CollectionItem | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return COLLECTIONS.find((c) => c.id === id) || null;
}

// Создать коллекцию
export async function createCollection(
  input: CreateCollectionInput,
): Promise<CollectionItem> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const newCollection: CollectionItem = {
    ...input,
    id: Math.max(...COLLECTIONS.map((c) => c.id), 0) + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // В реальном приложении здесь был бы API-вызов
  COLLECTIONS.push(newCollection);

  return newCollection;
}

// Обновить коллекцию
export async function updateCollection(
  id: number,
  input: UpdateCollectionInput,
): Promise<CollectionItem> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const index = COLLECTIONS.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error("Коллекция не найдена");
  }

  const updated: CollectionItem = {
    ...COLLECTIONS[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };

  COLLECTIONS[index] = updated;

  return updated;
}

// Удалить коллекцию
export async function deleteCollection(id: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const index = COLLECTIONS.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error("Коллекция не найдена");
  }

  COLLECTIONS.splice(index, 1);
}

// Переключить статус публикации
export async function toggleCollectionPublish(
  id: number,
): Promise<CollectionItem> {
  const collection = COLLECTIONS.find((c) => c.id === id);
  if (!collection) {
    throw new Error("Коллекция не найдена");
  }

  return updateCollection(id, { isPublished: !collection.isPublished });
}
