"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes idle

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

/**
 * Logs the user out after a period of no interaction. Unmounting the
 * authenticated shell (redirect to /login) also tears down
 * NotificationsProvider's poll interval, so idle sessions stop fetching
 * notifications instead of polling forever in the background.
 */
export function useInactivityLogout(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggedOutRef = useRef(false);

  useEffect(() => {
    async function doLogout() {
      if (loggedOutRef.current) return;
      loggedOutRef.current = true;
      try {
        await api.logout();
      } catch {
        // Even if the network call fails, still boot the user to /login —
        // the client no longer treats the session as active.
      }
      router.push("/login");
      router.refresh();
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(doLogout, timeoutMs);
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );

    // Also catch tab-becomes-visible after being backgrounded/idle a long
    // time on mobile (Chrome can suspend timers in background tabs).
    function onVisibilityChange() {
      if (document.visibilityState === "visible") resetTimer();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [timeoutMs, router]);
}