"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            An unexpected error occurred. Please try again, or contact support if the
            problem continues.
          </p>
        </div>
        <button
          onClick={reset}
          className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
