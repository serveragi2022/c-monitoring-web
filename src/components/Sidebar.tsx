"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, User } from "lucide-react";
import { COLLECTION_TYPES } from "@/lib/collection-config";
import clsx from "@/lib/clsx";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand-light">
          <Image src="/logo.png" alt="C-Monitoring" width={28} height={28} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-900">C-Monitoring</p>
          <p className="text-xs leading-tight text-slate-500">Collection System</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        <Link
          href="/"
          onClick={onNavigate}
          className={clsx(
            "mb-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
            isActive("/")
              ? "bg-brand text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Home className="h-4 w-4" />
          Main
        </Link>

        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          New Collection
        </p>
        <ul className="flex flex-col gap-0.5">
          {COLLECTION_TYPES.map((type) => {
            const href = `/collection/${type.route}`;
            const Icon = type.icon;
            const active = isActive(href);
            return (
              <li key={type.key}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-brand text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{type.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <Link
            href="/account"
            onClick={onNavigate}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              isActive("/account")
                ? "bg-brand text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <User className="h-4 w-4" />
            Account
          </Link>
        </div>
      </nav>
    </div>
  );
}
