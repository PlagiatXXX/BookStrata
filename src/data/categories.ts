/**
 * Категории (жанры) для коллекций.
 * ID и labels хранятся в category-ids.json — единый источник правды
 * для фронта, бэкенда и prerender'а.
 */
import CATEGORY_ITEMS from "./category-ids.json";

export interface Category {
  id: string;
  label: string;
}

/** Все категории из category-ids.json */
export const CATEGORY_IDS: string[] = CATEGORY_ITEMS.map((c) => c.id);

/** Категории с label для использования на фронте */
export const CATEGORIES: Category[] = [
  { id: "all", label: "Всё" },
  ...CATEGORY_ITEMS,
];
