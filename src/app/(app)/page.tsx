import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { COLLECTION_TYPES } from "@/lib/collection-config";
import { getSessionUser } from "@/lib/session";
import RecentTransactions from "@/components/RecentTransactions";

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand-dark to-brand p-6 text-white sm:p-8">
        <h1 className="text-xl font-semibold sm:text-2xl">
          Collection Monitoring System
        </h1>
        <p className="mt-1 max-w-lg text-sm text-white/80">
          Hi {user?.firstname ?? "there"}, pick a collection type below to record a new
          transaction, or check your recent activity in Notifications.
        </p>
      </div>

      <p className="mb-3 text-sm font-semibold text-slate-500">Record a collection</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COLLECTION_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <Link
              key={type.key}
              href={`/collection/${type.route}`}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand/40 hover:shadow-md"
            >
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-900">{type.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {type.description}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-brand opacity-0 transition group-hover:opacity-100">
                Start entry <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>

      <RecentTransactions />
    </div>
  );
}
