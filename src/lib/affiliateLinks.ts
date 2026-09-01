// src/lib/affiliateLinks.ts
// Генерация аффилиат-ссылок на книги

// Партнёрские ID (erid) — привязаны к аккаунту
const LITRES_ERID = "2VfnxyNkZrY";

interface BookForAffiliate {
  title: string;
  author?: string | null;
  isbn?: string | null;
  slug?: string | null;
}

export interface AffiliateLink {
  name: string;
  url: string;
  iconName: string; // для идентификации
  stub?: boolean;
}

/**
 * Генерирует аффилиат-ссылки для «Где читать»
 */
export function getAffiliateLinks(book: BookForAffiliate): AffiliateLink[] {
  const query = buildSearchQuery(book);

  return [
    {
      name: "Bookstrata",
      url: "#",
      iconName: "bookstrata",
      stub: true,
    },
    {
      name: "ЛитРес",
      url: buildLitresLink(query),
      iconName: "litres",
    },
  ];
}

function buildSearchQuery(book: BookForAffiliate): string {
  const parts: string[] = [];
  if (book.title) parts.push(book.title);
  if (book.author) parts.push(book.author);
  // URLSearchParams сам кодирует —encodeURIComponent не нужен
  return parts.join(" ");
}

/**
 * ЛитРес — поиск по названию/автору с erid
 * Формат: https://www.litres.ru/search/?q={query}&erid=...&utm_source=advcake&utm_medium=cpa
 */
function buildLitresLink(query: string): string {
  const params = new URLSearchParams({
    q: query,
    erid: LITRES_ERID,
    utm_source: "advcake",
    utm_medium: "cpa",
    utm_campaign: "affiliate",
  });

  return `https://www.litres.ru/search/?${params.toString()}`;
}
