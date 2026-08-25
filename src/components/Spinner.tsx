export default function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-2 border-slate-200 border-t-brand ${className}`}
    />
  );
}
