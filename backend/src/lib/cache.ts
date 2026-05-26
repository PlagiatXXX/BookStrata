import { redis } from './redis.js';

const DEFAULT_TTL = 3600; // 1 час по умолчанию

export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Cache GET error for key ${key}:`, error);
    return null;
  }
}

export async function setToCache<T>(
  key: string,
  value: T,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error(`Cache SET error for key ${key}:`, error);
  }
}

export async function deleteFromCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Cache DELETE error for key ${key}:`, error);
  }
}

export async function clearPattern(pattern: string): Promise<void> {
  try {
    let cursor = '0'
    const pipeline = redis.pipeline()

    do {
      const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = result[0]
      const keys = result[1]
      if (keys.length > 0) {
        pipeline.del(...keys)
      }
    } while (cursor !== '0')

    await pipeline.exec()
  } catch (error) {
    console.error(`Cache CLEAR error for pattern ${pattern}:`, error);
  }
}