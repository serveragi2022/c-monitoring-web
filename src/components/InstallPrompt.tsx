"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

const DISMISS_KEY = "cms-install-prompt-dismissed-at";
const DISMISS_DAYS = 7; // re-show after a week rather than nagging every visit

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own flag for "launched from home screen"
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function recentlyDismissed() {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const days = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
  return days < DISMISS_DAYS;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Android / Chrome / Edge: browser fires this when the site meets install
    // criteria. Stash the event so we can trigger it later from our own button —
    // otherwise the browser's default mini-infobar UI shows instead.
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // iOS Safari never fires beforeinstallprompt — there's no programmatic install,
    // so show static "how to" instructions instead if we're on iOS and not installed.
    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setDeferredPrompt(null);
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 bg-brand px-4 py-2.5 text-sm text-white">
      <Download className="h-4 w-4 shrink-0" />
      {showIosHint ? (
        <p className="min-w-0 flex-1">
          Install this app: tap <Share className="mb-0.5 inline h-3.5 w-3.5" /> Share, then
          &nbsp;&quot;Add to Home Screen&quot;.
        </p>
      ) : (
        <p className="min-w-0 flex-1">Install this app for faster, full-screen access.</p>
      )}
      {!showIosHint && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="shrink-0 rounded-md bg-white/15 px-3 py-1 font-medium hover:bg-white/25"
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-white/80 hover:bg-white/15 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
