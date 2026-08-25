"use client";

// Tracks which notification/transaction ids this user has already been
// alerted about, so the same transaction never triggers a toast twice —
// not even across a page reload or the next poll cycle. Keyed by userId so
// switching accounts on the same browser never leaks state between users.

const SEEN_KEY_PREFIX = "cms_notif_seen_";
const MAX_SEEN_IDS = 500;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getSeenIds(userId: number): Set<number> {
  if (typeof window === "undefined") return new Set();
  const raw = window.localStorage.getItem(`${SEEN_KEY_PREFIX}${userId}`);
  return new Set(safeParse<number[]>(raw, []));
}

export function saveSeenIds(userId: number, ids: Set<number>) {
  if (typeof window === "undefined") return;
  const arr = Array.from(ids).slice(-MAX_SEEN_IDS);
  window.localStorage.setItem(`${SEEN_KEY_PREFIX}${userId}`, JSON.stringify(arr));
}
