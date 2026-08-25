import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand">
        <FileQuestion className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Page not found</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
