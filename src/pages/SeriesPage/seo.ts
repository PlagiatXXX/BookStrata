import type { SeriesDetail } from "@/lib/seriesApi";

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://bookstrata.ru";

export function formatSeriesOrder(order: number): string {
  return Number.isInteger(order) ? String(order) : String(order).replace(".", ",");
}

export function buildSeriesJsonLd(
  series: SeriesDetail,
  heroCover: string | null,
): Record<string, unknown> {
  const url = `${SITE_URL}/series/${series.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BookSeries",
    name: series.name,
    url,
    inLanguage: "ru",
    ...(series.description ? { description: series.description } : {}),
    ...(heroCover ? { image: heroCover } : {}),
    ...(series.author
      ? { author: { "@type": "Person", name: series.author.name } }
      : {}),
    ...(series.books.length > 0
      ? {
          hasPart: series.books.map((book, idx) => ({
            "@type": "Book",
            position: book.seriesOrder ?? idx + 1,
            name: book.title,
            ...(book.slug ? { url: `${SITE_URL}/books/${book.slug}` } : {}),
            ...(book.author
              ? { author: { "@type": "Person", name: book.author } }
              : {}),
            ...(book.publishedYear
              ? { datePublished: String(book.publishedYear) }
              : {}),
          })),
        }
      : {}),
  };
}
