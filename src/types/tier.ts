export interface TierItem {
  id: string;
  title: string;
  imageUrl: string;
}

export interface TierRow {
  id: string;
  label: string;
  color: string;
  itemIds: string[];
}

export interface TierState {
  items: Record<string, TierItem>;
  rows: TierRow[];
  unrankedItemIds: string[];
}
