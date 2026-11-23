export interface ArticleMeta {
  slug: string
  title: string
  description: string
  date: string
  readingTime: string
  image?: string
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
    description: "Prerender через headless Chrome, nginx-прокси для ботов и никакой миграции на Next.js. Практический опыт индексации SPA-сайта в поисковых системах.",
    date: "2026-07-17",
    readingTime: "5 мин",
  },
  {
    slug: "kakoy-ya-chitatel",
    title: "Какой я читатель: тест на читательский ДНК",
    description: "Узнайте, какой вы читатель. Пройдите тест «Какой я читатель», расшифруйте книжный ДНК по 6 осям, получите читательский билет и сравните вкусы с друзьями.",
    date: "2026-11-23",
    readingTime: "6 мин",
    image: "/og-reading-dna.webp",
  },
  {
    slug: "matematika-chitatelskogo-dnk",
    title: "Математика читательского ДНК: как считается совместимость",
    description: "Разбор алгоритма Книжного ДНК: 6 осей, 16 архетипов, совместимость двух читателей, Жаккар, sigmoid-калибровка. Формулы и константы из открытого кода.",
    date: "2026-11-23",
    readingTime: "8 мин",
    image: "/og-reading-dna.webp",
  },
]
