export interface ArticleMeta {
  slug: string
  title: string
  description: string
  date: string
  readingTime: string
}

export const articlesMeta: ArticleMeta[] = [
  {
    slug: "why-not-goodreads",
    title: "Почему мы не стали копировать Goodreads",
    description: "Пятибалльная шкала не говорит о вкусе. Тир-листы — говорят. Разбираем, чем BookStrata отличается от крупнейшего книжного каталога.",
    date: "2026-07-17",
    readingTime: "4 мин",
  },
  {
    slug: "ssr-without-nextjs",
    title: "Как мы сделали SSR для React SPA без Next.js",
    description: "Prerender через headless Chrome, nginx-прокси для ботов и никакой миграции. Практический опыт индексации SPA-сайта.",
    date: "2026-07-17",
    readingTime: "5 мин",
  },
]
