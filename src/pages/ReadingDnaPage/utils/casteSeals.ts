/**
 * Возвращает путь к оптимизированной WebP печати Ордена читателя.
 */
export function getCasteSealUrl(casteId?: string | null): string {
  if (casteId === "mind") return "/images/reading-dna/seal-mind.webp";
  if (casteId === "action") return "/images/reading-dna/seal-action.webp";
  if (casteId === "light") return "/images/reading-dna/seal-light.webp";
  if (casteId === "abyss") return "/images/reading-dna/seal-abyss.webp";
  return "/images/reading-dna/seal.webp";
}
