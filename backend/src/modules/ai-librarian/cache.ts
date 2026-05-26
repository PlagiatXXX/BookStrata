import { createLogger } from '../../lib/logger.js'
import crypto from 'crypto'

const logger = createLogger('AiCache', { color: 'cyan' })

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  response: string
  expiresAt: number
}

const memoryCache = new Map<string, CacheEntry>()

function hashKey(systemPrompt: string, messages: Array<{ role: string; content: string }>): string {
  const raw = systemPrompt + '|||' + messages.map((m) => `${m.role}:${m.content}`).join('|||')
  return crypto.createHash('md5').update(raw).digest('hex')
}

export function getCachedResponse(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
): string | null {
  const key = hashKey(systemPrompt, messages)
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key)
    return null
  }
  logger.info('Cache hit', { key: key.slice(0, 8) })
  return entry.response
}

export function setCachedResponse(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  response: string,
): void {
  const key = hashKey(systemPrompt, messages)
  memoryCache.set(key, {
    response,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
  logger.info('Cache set', { key: key.slice(0, 8) })
}

export function clearCache(): void {
  memoryCache.clear()
  logger.info('Cache cleared')
}
