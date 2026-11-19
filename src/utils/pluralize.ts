/**
 * Склонение существительного по числу (русский язык).
 *
 * @example pluralize(1, "книга", "книги", "книг") // "книга"
 * @example pluralize(2, "книга", "книги", "книг") // "книги"
 * @example pluralize(5, "книга", "книги", "книг") // "книг"
 */
export function pluralize(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}
