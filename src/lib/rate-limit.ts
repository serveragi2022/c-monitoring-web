import "server-only";

// In-memory, per-server-instance rate limiter for the login endpoint.
// Good enough for a single-instance deployment; on multi-instance/serverless
// hosting each instance tracks its own counts, so this is a first line of
// defense rather than a hard guarantee — pair with backend-side throttling
// if that's available.

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically forget old buckets so this map doesn't grow unbounded.
function sweep() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkLoginRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  if (buckets.size > 5000) sweep();

  const existing = buckets.get(identifier);

  if (!existing || existing.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Call after a successful login to clear the counter for that identifier. */
export function resetLoginRateLimit(identifier: string) {
  buckets.delete(identifier);
}
