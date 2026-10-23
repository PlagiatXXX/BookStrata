// src/components/SimilarTierLists/seo.ts
// JSON-LD (Schema.org ItemList) для блока «Похожие тир-листы».
// Вынесен в отдельный файл — react-refresh запрещает экспорт не-компонентов
// из файлов компонентов.

import type { TierListShort } from "@/lib/tierListApi";

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://bookstrata.ru";

export function buildSimilarTierListsJsonLd(
  items: TierListShort[],
): Record<string, unknown> | null {
  if (!items || items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Похожие тир-листы",
    itemListOrder: "https://schema.org/ItemListUnordered",
    numberOfItems: items.length,
    itemListElement: items.map((tl, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Article",
        name: tl.title,
        url: `${SITE_URL}/tier-lists/${tl.slug || tl.id}`,
        ...(tl.coverImageUrl ? { image: tl.coverImageUrl } : {}),
        ...(tl.authorName || tl.user?.username
          ? {
              author: {
                "@type": "Person",
                name: tl.authorName || tl.user?.username,
              },
            }
          : {}),
      },
    })),
  };
}