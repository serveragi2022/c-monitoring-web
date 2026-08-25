"use client";

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function YesNo({
  value,
  onChange,
  name,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <div className="flex items-center gap-6">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="radio"
          name={name}
          checked={value === true}
          onChange={() => onChange(true)}
          className="h-4 w-4 accent-brand"
        />
        Yes
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="radio"
          name={name}
          checked={value === false}
          onChange={() => onChange(false)}
          className="h-4 w-4 accent-brand"
        />
        No
      </label>
    </div>
  );
}

export const inputClass =
  "rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
