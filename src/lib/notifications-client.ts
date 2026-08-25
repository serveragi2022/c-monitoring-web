"use client";

import { api } from "@/lib/api-client";

export interface Notif {
  transId: number;
  transRef: string;
  dateCreated: string;
}

// Every mounted component (TopBar bell, Notifications page) shares this single store
// instead of each running its own fetch + setInterval. That means:
//  - only one poller ever runs, no matter how many components are mounted
//  - polling pauses while the tab is in the background
//  - a fresh subscriber gets the cached result instantly instead of triggering another
//    request, unless the cache is stale
// All of this cuts down on serverless-function invocations (billed usage on Vercel).

const POLL_INTERVAL_MS = 60_000; // was 20s per-component; now one shared 60s poll
const STALE_AFTER_MS = 15_000; // don't refetch on mount/focus if data is newer than this

type Listener = (notifs: Notif[]) => void;

let cache: Notif[] = [];
let lastFetchedAt = 0;
let inFlight: Promise<Notif[]> | null = null;
const listeners = new Set<Listener>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function notifyListeners() {
  for (const l of listeners) l(cache);
}

async function fetchNow(): Promise<Notif[]> {
  if (inFlight) return inFlight; // dedupe concurrent callers
  inFlight = api
    .getNotifications()
    .then(({ notifications }) => {
      cache = notifications;
      lastFetchedAt = Date.now();
      notifyListeners();
      return cache;
    })
    .catch(() => cache) // keep last-known-good on error
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function maybePoll() {
  if (document.visibilityState !== "visible") return; // skip while tab is hidden
  fetchNow();
}

function ensurePolling() {
  if (intervalId) return;
  intervalId = setInterval(maybePoll, POLL_INTERVAL_MS);
  document.addEventListener("visibilitychange", onVisibilityChange);
}

function stopPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  document.removeEventListener("visibilitychange", onVisibilityChange);
}

function onVisibilityChange() {
  if (document.visibilityState === "visible" && Date.now() - lastFetchedAt > STALE_AFTER_MS) {
    fetchNow();
  }
}

/**
 * Subscribe to notifications. Returns an unsubscribe function. Fires `cb` immediately with
 * whatever is cached (even if empty), then again whenever fresh data arrives.
 */
export function subscribeNotifications(cb: Listener): () => void {
  listeners.add(cb);
  cb(cache);

  if (Date.now() - lastFetchedAt > STALE_AFTER_MS) {
    fetchNow();
  }
  ensurePolling();

  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) stopPolling();
  };
}

/** Force an immediate refresh (e.g. right after submitting a new collection). */
export function refreshNotifications(): Promise<Notif[]> {
  return fetchNow();
}

export async function markNotificationsViewed(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await api.markNotificationsViewed(ids);
  // Reflect locally right away instead of waiting for the next poll tick.
  cache = cache.filter((n) => !ids.includes(n.transId));
  notifyListeners();
}
