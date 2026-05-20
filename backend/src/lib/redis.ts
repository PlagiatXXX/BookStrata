import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

export interface RateLimitOptions {
  max: number;
  timeWindow: number;
  cache?: number;
  store?: FastifyRateLimitStore;
}

export interface FastifyRateLimitStore {
  incr(key: string, cb: (error: Error | null, result?: { current: number; ttl: number }) => void): void;
  child(routeOptions: { path: string; prefix?: string }): FastifyRateLimitStore;
}

class RedisRateLimitStore implements FastifyRateLimitStore {
  incr(key: string, cb: (error: Error | null, result?: { current: number; ttl: number }) => void): void {
    const cacheKey = `rl:${key}`;
    const ttlMs = 60 * 1000;

    redis.get(cacheKey)
      .then((val) => {
        const current = val ? parseInt(val, 10) : 0;
        redis.set(cacheKey, current + 1, 'PX', ttlMs)
          .then(() => {
            redis.pttl(cacheKey)
              .then((ttl) => {
                cb(null, { current: current + 1, ttl: ttl > 0 ? ttl : ttlMs });
              })
              .catch(() => cb(null, { current: current + 1, ttl: ttlMs }));
          })
          .catch(() => cb(null, { current: current + 1, ttl: ttlMs }));
      })
      .catch(() => cb(new Error('Redis error'), undefined));
  }

  child(): FastifyRateLimitStore {
    return this;
  }
}

export const redisStore = RedisRateLimitStore;

export default redis;