// Simple in-memory rate limiter for development/when Redis not available
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export class SimpleRateLimiter {
  async limit(key: string) {
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { count: 0, resetTime: now + 3600000 };

    if (now > entry.resetTime) {
      // Reset the window
      entry.count = 1;
      entry.resetTime = now + 3600000;
    } else {
      entry.count++;
    }

    rateLimitMap.set(key, entry);

    const success = entry.count <= 5;
    const remaining = Math.max(0, 5 - entry.count);

    return {
      success,
      limit: 5,
      remaining,
      reset: entry.resetTime,
      pending: Promise.resolve(),
    };
  }
}

// Default to simple rate limiter when Redis not available
export const aiPromptRatelimit = new SimpleRateLimiter();
