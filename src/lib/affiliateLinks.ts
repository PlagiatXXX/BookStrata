// src/lib/affiliateLinks.ts
// Генерация аффилиат-ссылок на книги

// Партнёрские ID — привязаны к аккаунтам
const CHITAI_GOROD_PARTNER_ID = "1006433";
// const LITRES_ERID = "2VfnxyNkZrY"; // ЛитРес — скрыт временно

const AFFILIATES_ENABLED = false;

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
  disclaimer?: string; // реквизиты рекламодателя (ФЗ-38)
}

/**
 * Генерирует аффилиат-ссылки для «Где читать»
 */
export function getAffiliateLinks(book: BookForAffiliate): AffiliateLink[] {
  if (!AFFILIATES_ENABLED) return [];

  const query = buildSearchQuery(book);
  return [
    {
      name: "Читай-город",
      url: buildChitaiGorodLink(query),
      iconName: "chitai-gorod",
      disclaimer: "Реклама. ООО «ГРАМОТА», ИНН 7706293136, partner ID: 1006433.",
    },
  ];
}

function buildSearchQuery(book: BookForAffiliate): string {
  const parts: string[] = [];
  if (book.title) parts.push(book.title);
  if (book.author) parts.push(book.author);
  // URLSearchParams сам кодирует — encodeURIComponent не нужен
  return parts.join(" ");
}

/**
 * Ссылки «где читать» для страницы автора /authors/:slug — поиск по имени.
 */
export function getAuthorAffiliateLink(authorName: string): AffiliateLink[] {
  if (!AFFILIATES_ENABLED) return [];

  return [
    {
      name: "Читай-город",
      url: buildChitaiGorodLink(authorName),
      iconName: "chitai-gorod",
      disclaimer: "Реклама. ООО «ГРАМОТА», ИНН 7706293136, partner ID: 1006433.",
    },
  ];
}

/**
 * Читай-город — поиск по названию/автору с partnerId
 * Формат из виджета: https://www.chitai-gorod.ru/search?phrase={query}&utm_source=affiliate&utm_medium=cpa&partnerId=...
 */
export function buildChitaiGorodLink(query: string): string {
  const params = new URLSearchParams({
    phrase: query,
    utm_source: "affiliate",
    utm_medium: "cpa",
    partnerId: CHITAI_GOROD_PARTNER_ID,
    utm_campaign: CHITAI_GOROD_PARTNER_ID,
  });

  return `https://www.chitai-gorod.ru/search?${params.toString()}`;
}
