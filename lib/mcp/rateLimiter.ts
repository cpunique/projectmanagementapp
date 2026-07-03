/**
 * In-memory sliding-window rate limiter for MCP write routes.
 * Keyed by uid:boardId — effectively per-token since a user can only have
 * one board per token, and each board-scoped token is enforced upstream.
 *
 * Limits:
 *   - All writes (create / update / move / comment / delete): 20 / 60s
 *   - Deletes additionally capped at 5 / 60s (separate bucket)
 *
 * Process-scoped state. A cold start resets counters — acceptable pre-launch.
 * If horizontal scaling becomes a requirement, move to Redis.
 */

const WINDOW_MS = 60_000;
const MAX_WRITES = 20;
const MAX_DELETES = 5;

const writeBuckets = new Map<string, number[]>();
const deleteBuckets = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

function slide(bucket: Map<string, number[]>, key: string): number[] {
  const cutoff = Date.now() - WINDOW_MS;
  const ts = (bucket.get(key) ?? []).filter((t) => t > cutoff);
  bucket.set(key, ts);
  return ts;
}

/** Call for create / update / move / comment routes. */
export function checkWriteLimit(uid: string, boardId: string): RateLimitResult {
  const key = `${uid}:${boardId}`;
  const now = Date.now();
  const recent = slide(writeBuckets, key);

  if (recent.length >= MAX_WRITES) {
    return { ok: false, retryAfterSec: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) };
  }

  recent.push(now);
  writeBuckets.set(key, recent);
  return { ok: true, retryAfterSec: 0 };
}

/**
 * Call for the delete route only.
 * Checks the delete-specific bucket FIRST so the global write budget is not
 * consumed when the delete limit is already exhausted.
 */
export function checkDeleteLimit(uid: string, boardId: string): RateLimitResult {
  const key = `${uid}:${boardId}`;
  const now = Date.now();

  const recentDeletes = slide(deleteBuckets, key);
  if (recentDeletes.length >= MAX_DELETES) {
    return { ok: false, retryAfterSec: Math.ceil((recentDeletes[0] + WINDOW_MS - now) / 1000) };
  }

  const recentWrites = slide(writeBuckets, key);
  if (recentWrites.length >= MAX_WRITES) {
    return { ok: false, retryAfterSec: Math.ceil((recentWrites[0] + WINDOW_MS - now) / 1000) };
  }

  recentDeletes.push(now);
  deleteBuckets.set(key, recentDeletes);
  recentWrites.push(now);
  writeBuckets.set(key, recentWrites);
  return { ok: true, retryAfterSec: 0 };
}
