"use client";

import { useEffect, useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { api } from "@/lib/api-client";
import { useNotificationsContext } from "@/context/NotificationsContext";

interface Txn {
  transId: number;
  transRef: string;
  dateCreated: string;
}

export default function RecentTransactions() {
  const { lastArrivalAt } = useNotificationsContext();
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { transactions } = await api.getRecentTransactions();
        if (!cancelled) setTransactions(transactions);
      } catch {
        // keep whatever was already shown; user can retry by revisiting
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // Refetch whenever the shared notification poller detects a new
    // transaction, so this list reflects it without running its own poll loop.
  }, [lastArrivalAt]);

  return (
    <div className="mt-8">
      <p className="mb-3 text-sm font-semibold text-slate-500">Recent transactions</p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
          <Receipt className="mx-auto mb-3 h-7 w-7 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">No transactions yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Your recently submitted collections will show up here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {transactions.map((t) => (
            <li
              key={t.transId}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  Reference #: {t.transRef}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(t.dateCreated).toLocaleString("en-PH", {
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
