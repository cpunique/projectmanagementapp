import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

export const aiPromptRatelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 requests per hour
  analytics: true,
  prefix: 'ai-prompt',
});
