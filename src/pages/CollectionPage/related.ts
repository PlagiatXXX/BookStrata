import type { CollectionItem } from "@/types/collection";

/**
 * Выбор «похожих подборок» для страницы коллекции (SEO-перелинковка + UX).
 *
 * Трёхуровневая логика — категории в каталоге мелкие (часто 1–2 коллекции),
 * поэтому одной категории недостаточно:
 * 1. Та же категория (categoryId) — самые релевантные;
 * 2. Пересечение тегов (tags) — по убыванию числа общих тегов;
 * 3. Остальные опубликованные — по order (просто добить блок).
 *
 * Текущая коллекция всегда исключается. Результат детерминирован.
 */
export function pickRelatedCollections(
  current: CollectionItem,
  all: CollectionItem[],
  limit = 6,
): CollectionItem[] {
  const others = all.filter(
    (c) => c.slug !== current.slug && c.isPublished,
  );
  if (others.length === 0 || limit <= 0) return [];

  // 1. Та же категория
  const sameCategory = current.categoryId
    ? others.filter((c) => c.categoryId === current.categoryId)
    : [];
  const sameCategorySet = new Set(sameCategory.map((c) => c.slug));

  // 2. Общие теги (без уже выбранных по категории)
  const currentTags = new Set(current.tags);
  const byTags = others
    .filter((c) => !sameCategorySet.has(c.slug))
    .map((c) => ({
      collection: c,
      score: c.tags.filter((t) => currentTags.has(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.collection);
  const byTagsSet = new Set(byTags.map((c) => c.slug));

  // 3. Остальные — по порядку отображения
  const rest = others
    .filter((c) => !sameCategorySet.has(c.slug) && !byTagsSet.has(c.slug))
    .sort((a, b) => a.order - b.order);

  return [...sameCategory, ...byTags, ...rest].slice(0, limit);
}