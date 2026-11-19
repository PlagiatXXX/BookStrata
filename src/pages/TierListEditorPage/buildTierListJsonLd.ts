import type { TierListData } from "@/types";

export interface TierListJsonLdApiData {
  title?: string | null;
  user?: {
    username?: string | null;
    id?: number | string;
  } | null;
}

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://bookstrata.ru";

/**
 * Строит JSON-LD (ItemList + Book) для публичного тир-листа.
 * Возвращает null, если список пуст (нет книг) — тогда <script> не рендерится.
 */
export function buildTierListJsonLd(
  listData: TierListData,
  apiData: TierListJsonLdApiData | null | undefined,
  pageUrl: string,
): Record<string, unknown> | null {
  const itemListElement = listData.tierOrder
    .map((tierId) => {
      const tier = listData.tiers[tierId];
      if (!tier) return [];
      return tier.bookIds
        .map((bookId) => {
          const book = listData.books[bookId];
          if (!book) return null;
          return {
            "@type": "ListItem",
            position: 0, // будет перезаписан сквозной нумерацией ниже
            item: {
              "@type": "Book",
              name: book.title,
              author: book.author
                ? { "@type": "Person", name: book.author }
                : undefined,
              ...(book.coverImageUrl ? { image: book.coverImageUrl } : {}),
              ...(book.description ? { description: book.description } : {}),
            },
          };
        })
        .filter(Boolean);
    })
    .flat()
    .map((entry, i) => (entry ? { ...entry, position: i + 1 } : entry))
    .filter(Boolean);

  if (!apiData) return null;
  if (itemListElement.length === 0) return null;

  const title = apiData?.title ?? null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title ?? undefined,
    description: title
      ? `Тир-лист «${title}» — визуальный рейтинг книг, созданный на BookStrata`
      : undefined,
    url: `${SITE_URL}/tier-lists/${pageUrl}`,
    author: apiData?.user
      ? {
          "@type": "Person",
          name: apiData.user.username || "Anonymous",
          url: `${SITE_URL}/users/${apiData.user.id}`,
        }
      : undefined,
    itemListElement,
  };
}
