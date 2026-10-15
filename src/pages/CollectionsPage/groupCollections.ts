import type { CollectionItem } from "@/types/collection";
import categoryIds from "@/data/category-ids.json";

export type CollectionGroup = { id: string; label: string; items: CollectionItem[] };
export type GroupedCollections = { groups: CollectionGroup[]; rest: CollectionItem[] };

/**
 * Группирует подборки по жанрам из category-ids.json (порядок файла = порядок групп).
 * Подборки без categoryId или с категорией вне справочника идут в rest —
 * их отображает хаб-страница отдельной секцией «Все подборки».
 */
export function groupCollections(
  collections: CollectionItem[],
  categories: { id: string; label: string }[] = categoryIds,
): GroupedCollections {
  const groups: CollectionGroup[] = [];
  const groupedIds = new Set<number>();

  for (const cat of categories) {
    const items = collections.filter((c) => c.categoryId === cat.id);
    if (items.length > 0) {
      groups.push({ id: cat.id, label: cat.label, items });
      for (const item of items) groupedIds.add(item.id);
    }
  }

  const rest = collections.filter((c) => !groupedIds.has(c.id));
  return { groups, rest };
}
