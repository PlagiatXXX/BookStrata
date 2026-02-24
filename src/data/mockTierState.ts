import type { TierItem, TierState } from "@/types"
import { uid } from "@/utils/id"

const items: Record<string, TierItem> = Array.from({ length: 10 }).reduce((acc: Record<string, TierItem>, _, i) => {
  const id = uid()
  acc[id] = {
    id,
    title: `Item ${i + 1}`,
    imageUrl: `https://picsum.photos/seed/${i}/200/200`,
  }
  return acc
}, {} as Record<string, TierItem>)

const itemIds = Object.keys(items)

export const mockTierState: TierState = {
  rows: [
    { id: uid(), label: "Место 1", color: "#ff4d4f", itemIds: [] },
    { id: uid(), label: "Место 2", color: "#ff7a45", itemIds: [] },
    { id: uid(), label: "Место 3", color: "#ffa940", itemIds: [] },
    { id: uid(), label: "Место 4", color: "#ffd666", itemIds: [] },
  ],
  items,
  unrankedItemIds: itemIds,
}