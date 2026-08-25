"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useNotificationsContext } from "@/context/NotificationsContext";

const AUTO_DISMISS_MS = 6000;

export default function NotificationToasts() {
  const { toasts, dismissToast } = useNotificationsContext();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} transRef={t.transRef} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

function ToastItem({
  id,
  transRef,
  onDismiss,
}: {
  id: string;
  transRef: string;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">Your transaction is successful.</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">Reference #: {transRef}</p>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
