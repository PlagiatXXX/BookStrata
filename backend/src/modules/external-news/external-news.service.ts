import crypto from "crypto"
import { parseStringPromise } from "xml2js"
import { createLogger } from "../../lib/logger.js"
import { getFromCache, setToCache } from "../../lib/cache.js"

const logger = createLogger("ExternalNews", { color: "cyan" })

interface FeedConfig {
  url: string
  source: string
  lang: "ru" | "en"
}

const RSS_FEEDS: FeedConfig[] = [
  {
    url: "https://www.theguardian.com/books/rss",
    source: "The Guardian",
    lang: "en",
  },
  {
    url: "https://godliteratury.ru/rss",
    source: "Год Литературы",
    lang: "ru",
  },
]

export interface ExternalNewsItem {
  id: string
  title: string
  excerpt: string
  imageUrl: string | null
  url: string
  source: string
  lang: "ru" | "en"
  publishedAt: string
}

const FALLBACK_IMAGE = null

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim()
}

function extractImage(
  content: string | undefined,
  enclosure?: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
): string | null {
  const enclosureUrl = enclosure?.$?.url ?? enclosure?.url
  if (enclosureUrl) return enclosureUrl
  if (!content) return null
  const match = content.match(/<img[^>]+src="([^">]+)"/)
  return match ? (match[1] ?? null) : null
}

function buildId(link: string | undefined, title: string | undefined, source: string): string {
  const raw = link ?? title ?? `${source}-${Date.now()}`
  const hash = crypto.createHash("md5").update(raw).digest("hex").slice(0, 12)
  return `${source}-${hash}`
}

/** Extract items from both standard RSS (item inside channel) and non-standard (item at rss level) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRssItems(parsed: Record<string, any>): Record<string, any>[] {
  const rss = parsed.rss
  if (!rss) return []

  // Try items at rss level (non-standard, e.g. godliteratury.ru)
  if (Array.isArray(rss.item)) return rss.item

  // Try items inside channel (standard RSS 2.0)
  const channel = Array.isArray(rss.channel) ? rss.channel[0] : null
  if (channel && Array.isArray(channel.item)) return channel.item

  return []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseItem(item: Record<string, any>, cfg: FeedConfig): ExternalNewsItem | null {
  const title = item.title?.[0]?.trim()
  if (!title) return null

  const link = item.link?.[0] ?? ""
  const description = item.description?.[0] ?? ""
  const pubDate = item.pubDate?.[0] ?? item.isoDate ?? ""
  const enclosure = item.enclosure?.[0] ?? {}

  return {
    id: buildId(link, title, cfg.source),
    title,
    excerpt: stripHtml(description).slice(0, 200),
    imageUrl: extractImage(description, enclosure) ?? FALLBACK_IMAGE,
    url: link,
    source: cfg.source,
    lang: cfg.lang,
    publishedAt: pubDate,
  }
}

async function fetchFeed(cfg: FeedConfig): Promise<ExternalNewsItem[]> {
  try {
    const response = await fetch(cfg.url)
    const xml = await response.text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = await parseStringPromise(xml) as Record<string, any>
    const items = getRssItems(parsed)
    return items.map((item) => parseItem(item, cfg)).filter(Boolean) as ExternalNewsItem[]
  } catch (error) {
    logger.error(`Ошибка парсинга RSS: ${cfg.source}`, { error })
    return []
  }
}

function interleave(arrays: ExternalNewsItem[][]): ExternalNewsItem[] {
  const result: ExternalNewsItem[] = []
  let i = 0
  while (arrays.some((arr) => i < arr.length)) {
    for (const arr of arrays) {
      if (i < arr.length) {
        result.push(arr[i]!)
      }
    }
    i++
  }
  return result
}

const CACHE_KEY = "external-news:books"
const CACHE_TTL = 15 * 60 // 15 минут

export class ExternalNewsService {
  async getBooksNews(limit = 6): Promise<ExternalNewsItem[]> {
    const cached = await getFromCache<ExternalNewsItem[]>(CACHE_KEY)
    if (cached) {
      logger.info("Возвращаем кешированные RSS-новости", { count: cached.length })
      return cached.slice(0, limit)
    }

    const results = await Promise.allSettled(
      RSS_FEEDS.map((cfg) => fetchFeed(cfg)),
    )

    const items: ExternalNewsItem[][] = results.map(
      (r) => (r.status === "fulfilled" ? r.value : []),
    )

    const mixed = interleave(items)
    const allNews = mixed.slice(0, limit)

    // Не блокируем ответ ожиданием записи в кеш
    setToCache(CACHE_KEY, allNews, CACHE_TTL)
      .then(() => logger.info("RSS-новости закешированы", { count: allNews.length }))
      .catch((err) => logger.error("Ошибка записи кеша RSS-новостей", { error: err }))

    return allNews
  }
}
