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

type RateLimitCallback = (error: Error | null, result?: { current: number; ttl: number }) => void;

interface ChildRouteOptions {
  continueExceeding?: boolean;
  exponentialBackoff?: boolean;
  cache?: number;
  routeInfo?: { method?: string; url?: string };
}

// Redis-backed rate limit store для @fastify/rate-limit
export class RedisRateLimitStore {
  private continueExceeding: boolean;
  private exponentialBackoff: boolean;
  private key: string;

  constructor(options: { continueExceeding?: boolean; exponentialBackoff?: boolean; key?: string } = {}) {
    this.continueExceeding = options.continueExceeding ?? false;
    this.exponentialBackoff = options.exponentialBackoff ?? false;
    this.key = options.key ?? 'rl:';
  }

  incr(key: string, cb: RateLimitCallback, timeWindow = 60000, max = 0): void {
    const cacheKey = `${this.key}${key}`;

    redis.incr(cacheKey)
      .then((current) => {
        if (current === 1 || (this.continueExceeding && current > max)) {
          return redis.pexpire(cacheKey, timeWindow).then(() => {
            redis.pttl(cacheKey).then((ttl) => {
              cb(null, { current, ttl: ttl > 0 ? ttl : timeWindow });
            });
          });
        }
        if (this.exponentialBackoff && current > max) {
          const backoffExponent = current - max - 1;
          const ttl = Math.min(timeWindow * Math.pow(2, backoffExponent), Number.MAX_SAFE_INTEGER);
          return redis.pexpire(cacheKey, ttl).then(() => {
            cb(null, { current, ttl });
          });
        }
        return redis.pttl(cacheKey).then((ttl) => {
          cb(null, { current, ttl: ttl > 0 ? ttl : timeWindow });
        });
      })
      .catch((err) => cb(err, undefined));
  }

  child(routeOptions: ChildRouteOptions): RedisRateLimitStore {
    const prefix = routeOptions.routeInfo
      ? `${this.key}${routeOptions.routeInfo.method}:${routeOptions.routeInfo.url}:`
      : this.key;
    return new RedisRateLimitStore({
      continueExceeding: routeOptions.continueExceeding ?? this.continueExceeding,
      exponentialBackoff: routeOptions.exponentialBackoff ?? this.exponentialBackoff,
      key: prefix,
    });
  }
}

export default redis;