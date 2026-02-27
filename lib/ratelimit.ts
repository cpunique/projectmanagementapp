// Simple in-memory rate limiter for development/when Redis not available
export class SimpleRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly map = new Map<string, { count: number; resetTime: number }>();

  constructor(maxRequests = 5, windowMs = 3_600_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async limit(key: string) {
    const now = Date.now();
    const entry = this.map.get(key) || { count: 0, resetTime: now + this.windowMs };

    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + this.windowMs;
    } else {
      entry.count++;
    }

    this.map.set(key, entry);

    const success = entry.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - entry.count);

    return {
      success,
      limit: this.maxRequests,
      remaining,
      reset: entry.resetTime,
      pending: Promise.resolve(),
    };
  }
}

// Default to simple rate limiter when Redis not available
export const aiPromptRatelimit = new SimpleRateLimiter(5);
