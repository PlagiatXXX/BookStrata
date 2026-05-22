export function pluralize(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n)
  const lastDigit = abs % 10
  const lastTwoDigits = abs % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return forms[2]
  if (lastDigit === 1) return forms[0]
  if (lastDigit >= 2 && lastDigit <= 4) return forms[1]
  return forms[2]
}

export function booksCountText(n: number): string {
  return `${n} ${pluralize(n, ["книга", "книги", "книг"])}`
}
