import type { DnaArchetypeCatalogItem, DnaAxesData } from "@/lib/readingDnaApi";

export const AXIS_KEYS: (keyof DnaAxesData)[] = [
  "storyFocus",
  "emotionalWeight",
  "pace",
  "darkness",
  "scope",
  "complexity",
];

/**
 * Находит архетип по идентификатору или любому из его названий (dark / craft).
 */
export function findArchetypeByIdOrName(
  items: DnaArchetypeCatalogItem[],
  idOrName?: string | null
): DnaArchetypeCatalogItem | undefined {
  if (!idOrName || !items || items.length === 0) return undefined;
  const clean = idOrName.trim().toLowerCase();
  return items.find(
    (a) =>
      a.id.toLowerCase() === clean ||
      a.names.dark.toLowerCase() === clean ||
      a.names.craft.toLowerCase() === clean
  );
}

/**
 * Разрешает читательский архетип по диапазонам осей.
 */
export function resolveArchetypeByRanges(
  items: DnaArchetypeCatalogItem[],
  axes: DnaAxesData
): DnaArchetypeCatalogItem | undefined {
  if (!items || items.length === 0) return undefined;

  let best: DnaArchetypeCatalogItem = items[0]!;
  let maxHits = -1;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const arch of items) {
    let hits = 0;
    let distance = 0;

    for (const key of AXIS_KEYS) {
      const val = axes[key];
      const range = arch.axisRanges[key];
      if (!range) continue;

      if (val >= range.min && val <= range.max) {
        hits++;
      } else if (val < range.min) {
        distance += (range.min - val) / 100;
      } else {
        distance += (val - range.max) / 100;
      }
    }

    if (hits > maxHits || (hits === maxHits && distance < minDistance)) {
      maxHits = hits;
      minDistance = distance;
      best = arch;
    }
  }

  return best;
}
