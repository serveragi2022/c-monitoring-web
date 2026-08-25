"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "@/lib/api-client";
import { getSeenIds, saveSeenIds } from "@/lib/notifications-store";

export interface NotifToast {
  id: string;
  transRef: string;
}

interface NotificationsContextValue {
  /** Unread notification count for the bell badge (as reported by the backend). */
  count: number;
  /** Ephemeral toasts to show for transactions that just arrived. */
  toasts: NotifToast[];
  dismissToast: (id: string) => void;
  /** Bumps whenever a new transaction is detected — components can watch this
   *  to know it's worth refetching things like the recent-transactions list. */
  lastArrivalAt: number;
  /** Optimistically zero the badge count — call this right after the user has
   *  viewed/acknowledged notifications, instead of waiting up to 30s for the
   *  next poll to reflect it. */
  clearCount: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// One poll interval for the whole app (owned here, not duplicated per-component)
// so nothing double-fetches or double-alerts.
const POLL_INTERVAL_MS = 30_000;

export function NotificationsProvider({
  userId,
  children,
}: {
  userId: number;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(0);
  const [toasts, setToasts] = useState<NotifToast[]>([]);
  const [lastArrivalAt, setLastArrivalAt] = useState(0);

  // Ids we've already alerted this user about, persisted per-user so a reload
  // (or the 30s poll firing again) never re-announces the same transaction.
  const seenRef = useRef<Set<number> | null>(null);
  if (seenRef.current === null) {
    seenRef.current = getSeenIds(userId);
  }
  const primedRef = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearCount = useCallback(() => {
    setCount(0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const { notifications } = await api.getNotifications();
        if (cancelled) return;

        setCount(notifications.length);

        const seen = seenRef.current ?? new Set<number>();
        const newArrivals = notifications.filter((n) => !seen.has(n.transId));
        if (newArrivals.length === 0) return;

        newArrivals.forEach((n) => seen.add(n.transId));
        seenRef.current = seen;
        saveSeenIds(userId, seen);
        setLastArrivalAt(Date.now());

        // Don't toast on the very first poll after mount/login — those are
        // pre-existing unread notifications, not "new" transactions just in.
        // Only transactions that arrive *after* we've established a baseline
        // trigger a toast, which is what stops the endless repeat-alerting.
        if (primedRef.current) {
          setToasts((prev) => [
            ...prev,
            ...newArrivals.map((n) => ({
              id: `${n.transId}-${Date.now()}`,
              transRef: n.transRef,
            })),
          ]);
        }
      } catch {
        // Transient network/API error — the next poll will retry, no need to loop harder.
      } finally {
        primedRef.current = true;
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userId]);

  return (
    <NotificationsContext.Provider value={{ count, toasts, dismissToast, lastArrivalAt, clearCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotificationsContext must be used within a NotificationsProvider");
  }
  return ctx;
}
