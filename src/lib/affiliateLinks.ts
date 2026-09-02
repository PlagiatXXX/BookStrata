// src/lib/affiliateLinks.ts
// Генерация аффилиат-ссылок на книги

// Партнёрские ID — привязаны к аккаунтам
const CHITAI_GOROD_PARTNER_ID = "1006433";
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
  disclaimer?: string; // реквизиты рекламодателя (ФЗ-38)
}

/**
 * Генерирует аффилиат-ссылки для «Где читать»
 */
export function getAffiliateLinks(book: BookForAffiliate): AffiliateLink[] {
  const query = buildSearchQuery(book);

  return [
    {
      name: "Читай-город",
      url: buildChitaiGorodLink(query),
      iconName: "chitai-gorod",
      disclaimer: "Реклама. ООО «ГРАМОТА», ИНН 7706293136, partner ID: 1006433.",
    },
    {
      name: "ЛитРес",
      url: buildLitresLink(query),
      iconName: "litres",
      disclaimer: "Реклама. ООО «ЛИТРЕС», ИНН 7719571260, erid: 2VfnxyNkZrY.",
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
 * Читай-город — поиск по названию/автору с partnerId
 * Формат из виджета: https://www.chitai-gorod.ru/search?phrase={query}&utm_source=affiliate&utm_medium=cpa&partnerId=...
 */
function buildChitaiGorodLink(query: string): string {
  const params = new URLSearchParams({
    phrase: query,
    utm_source: "affiliate",
    utm_medium: "cpa",
    partnerId: CHITAI_GOROD_PARTNER_ID,
    utm_campaign: CHITAI_GOROD_PARTNER_ID,
  });

  return `https://www.chitai-gorod.ru/search?${params.toString()}`;
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
