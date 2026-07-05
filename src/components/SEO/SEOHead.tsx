import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "BookStrata";
const DEFAULT_DESC = "BookStrata — интерактивный рейтинг книг. Составляй визуальный топ лучших книг, узнавай что почитать, собирай подборки по жанрам, участвуй в баттлах и получай ИИ-рекомендации.";
const DEFAULT_IMAGE = "/logo.svg";
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://bookstrata.ru";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  author?: string;
  noindex?: boolean;
  breadcrumbs?: { name: string; url: string }[];
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  description: DEFAULT_DESC,
  sameAs: [
    "https://t.me/PasFedor",
    "https://vk.com/club237287277",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}#website`,
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export function SEOHead({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  publishedTime,
  author,
  noindex,
  breadcrumbs,
}: SEOHeadProps) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : `Интерактивный рейтинг книг — топ лучших книг и что почитать | ${SITE_NAME}`;
  const pageUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  // Fallback: react-helmet-async v3 + React 19 не всегда корректно hoist'ит
  // динамические <title>/<meta> в head. Напрямую обновляем DOM.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const head = document.head || document.querySelector("head");
    if (!head) return;

    document.title = pageTitle;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        const match = selector.match(/\[(name|property)="(.+?)"\]/);
        if (match) {
          el.setAttribute(match[1]!, match[2]!);
        }
        head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    const setLink = (selector: string, attr: string, value: string) => {
      let el = head.querySelector(selector) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        const match = selector.match(/\[rel="(.+?)"\]/);
        if (match) el.setAttribute("rel", match[1]!);
        head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", pageTitle);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:image"]', "content", imageUrl);
    setMeta('meta[property="og:url"]', "content", pageUrl);
    setMeta('meta[property="og:type"]', "content", type);
    setMeta('meta[name="twitter:title"]', "content", pageTitle);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]', "content", imageUrl);
    setMeta('meta[name="twitter:image:alt"]', "content", description);

    if (noindex) {
      setMeta('meta[name="robots"]', "content", "noindex, nofollow");
    } else {
      const robots = head.querySelector('meta[name="robots"]');
      if (robots?.getAttribute("content") === "noindex, nofollow") {
        robots.remove();
      }
    }

    setLink('link[rel="canonical"]', "href", pageUrl);
  }, [pageTitle, description, imageUrl, pageUrl, type, noindex, title]);

  const breadcrumbJsonLd = breadcrumbs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: crumb.name,
          item: crumb.url.startsWith("http") ? crumb.url : `${SITE_URL}${crumb.url}`,
        })),
      }
    : null;

  const articleJsonLd =
    type === "article" && publishedTime
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description,
          image: imageUrl,
          author: author ? { "@type": "Person", name: author } : undefined,
          datePublished: publishedTime,
          publisher: { "@type": "Organization", name: SITE_NAME },
        }
      : null;

  // WebPage JSON-LD — базовая разметка для всех страниц
  const webpageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description,
    url: pageUrl,
    publisher: { "@id": `${SITE_URL}#organization` },
    ...(breadcrumbs
      ? { breadcrumb: { "@id": `${pageUrl}#breadcrumb` } }
      : {}),
  };

  return (
    <Helmet>
      {title && <title>{pageTitle}</title>}
      <meta name="description" content={description} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="ru_RU" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={description} />

      <link rel="canonical" href={pageUrl} />
      <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} — Новости книжного рейтинга`} href={`${SITE_URL}/rss.xml`} />

      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {author && <meta name="author" content={author} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <script type="application/ld+json">
        {JSON.stringify(organizationJsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteJsonLd)}
      </script>
      {breadcrumbJsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd)}
        </script>
      )}
      {articleJsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(articleJsonLd)}
        </script>
      )}
      <script type="application/ld+json">
        {JSON.stringify(webpageJsonLd)}
      </script>
    </Helmet>
  );
}
