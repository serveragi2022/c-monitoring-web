"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface Notif {
  transId: number;
  transRef: string;
  dateCreated: string;
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const idsRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { notifications } = await api.getNotifications();
        if (!cancelled) {
          setNotifs(notifications);
          idsRef.current = notifications.map((n) => n.transId);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
      if (idsRef.current.length > 0) {
        api.markNotificationsViewed(idsRef.current).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Notifications</h1>
      <p className="mb-6 text-sm text-slate-500">
        Confirmations for your recently submitted transactions.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : notifs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <BellRing className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">No new notifications</p>
          <p className="mt-1 text-xs text-slate-500">
            You&apos;ll see a confirmation here after each successful submission.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifs.map((n) => (
            <li
              key={n.transId}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                <BellRing className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  Your transaction is successful.
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  Reference #: {n.transRef}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(n.dateCreated).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
