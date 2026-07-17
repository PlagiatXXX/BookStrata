export interface CuratedTier {
  id: string;
  title: string;
  color: string;
}

export interface CuratedBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string;
  description?: string;
  rating?: number;
  genre?: string;
  tags?: string;
  tierId: string | null; // null = unranked
}

export interface CuratedCollectionEditorProps {
  tiers: CuratedTier[];
  books: CuratedBook[];
  onTiersChange: (tiers: CuratedTier[]) => void;
  onBooksChange: (books: CuratedBook[]) => void;
}

let nextId = 1;
export function genId(): string {
  return `curated_${nextId++}_${Date.now()}`;
}

export const TIER_COLORS = [
  { label: "Красный", value: "#ef4444" },
  { label: "Оранжевый", value: "#f97316" },
  { label: "Жёлтый", value: "#eab308" },
  { label: "Зелёный", value: "#22c55e" },
  { label: "Голубой", value: "#06b6d4" },
  { label: "Синий", value: "#3b82f6" },
  { label: "Фиолетовый", value: "#8b5cf6" },
  { label: "Розовый", value: "#ec4899" },
  { label: "Серый", value: "#64748b" },
  { label: "Белый", value: "#f8fafc" },
];
