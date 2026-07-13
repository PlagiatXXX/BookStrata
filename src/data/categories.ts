/**
 * Категории (жанры) для коллекций.
 * ID категорий хранятся в category-ids.json — единый источник правды
 * для фронта, бэкенда и prerender'а.
 */
import CATEGORY_IDS from "./category-ids.json";

export interface Category {
  id: string;
  label: string;
}

const LABELS: Record<string, string> = {
  fantasy: "Фэнтези",
  "sci-fi": "Sci-Fi",
  classics: "Классика",
  "non-fiction": "Нон-фикшн",
  fiction: "Художественная",
  "young-adult": "Young Adult",
  historical: "Исторические",
  horror: "Хоррор и мистика",
  cyberpunk: "Киберпанк",
  romance: "Любовные романы",
  "slavic-fantasy": "Славянское фэнтези",
  adventure: "Приключения",
  thriller: "Триллеры и детективы",
  dystopia: "Антиутопии",
  japanese: "Японская литература",
  "russian-classics": "Русская классика",
  "foreign-prose": "Зарубежная проза",
  military: "Военная проза",
  myths: "Сказки и мифы",
};

/** Категории с label для использования на фронте */
export const CATEGORIES: Category[] = [
  { id: "all", label: "Всё" },
  ...CATEGORY_IDS.map((id) => ({ id, label: LABELS[id] || id })),
];

export { CATEGORY_IDS };
