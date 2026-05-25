import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate-limit result returned by every check.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window size in seconds. */
  windowSeconds: number;
}

/**
 * Abstract rate-limiter. Backed by Upstash Redis when
 * UPSTASH_REDIS_REST_URL is set, otherwise by an in-memory map
 * (development only).
 */
export interface RateLimiter {
  check(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
}

/* ─── In-memory implementation (development fallback) ──────────── */

class InMemoryRateLimiter implements RateLimiter {
  private readonly store = new Map<
    string,
    { count: number; expiresAt: number }
  >();

  async check(
    key: string,
    { limit, windowSeconds }: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const existing = this.store.get(key);

    if (!existing || existing.expiresAt <= now) {
      const expiresAt = now + windowMs;
      this.store.set(key, { count: 1, expiresAt });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: new Date(expiresAt),
      };
    }
    if (existing.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(existing.expiresAt),
      };
    }
    existing.count += 1;
    return {
      allowed: true,
      remaining: limit - existing.count,
      resetAt: new Date(existing.expiresAt),
    };
  }
}

/* ─── Upstash implementation (production) ──────────────────────── */

class UpstashRateLimiter implements RateLimiter {
  private readonly redis: Redis;
  /**
   * @upstash/ratelimit is configured per (limit, window) pair, so
   * we memoize one Ratelimit instance per pair. Avoids creating
   * a new instance on every check.
   */
  private readonly cache = new Map<string, Ratelimit>();

  constructor(redis: Redis) {
    this.redis = redis;
  }

  private getLimiter(opts: RateLimitOptions): Ratelimit {
    const cacheKey = `${opts.limit}:${opts.windowSeconds}`;
    let limiter = this.cache.get(cacheKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(
          opts.limit,
          `${opts.windowSeconds} s`,
        ),
        analytics: false,
        prefix: 'rl',
      });
      this.cache.set(cacheKey, limiter);
    }
    return limiter;
  }

  async check(
    key: string,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    try {
      const limiter = this.getLimiter(options);
      const { success, remaining, reset } = await limiter.limit(key);
      return {
        allowed: success,
        remaining,
        resetAt: new Date(reset),
      };
    } catch (err) {
      // Fail open on Upstash outage. Better to let a real customer
      // through than to silently block submissions during an
      // infrastructure incident. We log loudly so it surfaces.
      console.error('[rate-limit] Upstash check failed; failing open', err);
      return {
        allowed: true,
        remaining: 0,
        resetAt: new Date(Date.now() + options.windowSeconds * 1000),
      };
    }
  }
}

/* ─── Singleton selection ─────────────────────────────────────── */

let singleton: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (singleton) return singleton;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const redis = new Redis({ url, token });
    singleton = new UpstashRateLimiter(redis);
    return singleton;
  }

  // Local development without Upstash credentials. Warn loudly so
  // it's obvious in logs if this ever fires on a production deploy.
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[rate-limit] UPSTASH_REDIS_REST_URL not set in production. ' +
        'Falling back to in-memory limiter -- this is not effective ' +
        'across cold starts or multiple regions. Set UPSTASH_REDIS_* ' +
        'env vars in Vercel project settings.',
    );
  }
  singleton = new InMemoryRateLimiter();
  return singleton;
}

/**
 * Quote-form limits, per IP. These match the Round 2 security
 * contract (Phase 2 §2.12 item 3).
 */
export const QUOTE_RATE_LIMITS = {
  hour: { limit: 5, windowSeconds: 60 * 60 },
  day: { limit: 20, windowSeconds: 60 * 60 * 24 },
} as const satisfies Record<string, RateLimitOptions>;
