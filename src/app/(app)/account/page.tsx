"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword || !newUsername || !newPassword || !confirmPassword) {
      setError("Incomplete information.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Confirm password does not match.");
      return;
    }

    const ok = window.confirm("Are you sure you want to save?");
    if (!ok) return;

    setLoading(true);
    try {
      await api.changePassword({ currentPassword, newUsername, newPassword, confirmPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Account</h1>
      <p className="mb-6 text-sm text-slate-500">
        Update your username and password. You&apos;ll need your current password to confirm.
      </p>

      <form onSubmit={onSave} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="mb-3 text-sm font-semibold text-brand">Current</p>
        <label className="mb-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <p className="mb-3 text-sm font-semibold text-brand">New</p>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Username</span>
            <input
              id="newUsername"
              name="newUsername"
              autoComplete="username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Confirm Password</span>
            <input
              id="confirmNewPassword"
              name="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {success && (
          <p className="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <ShieldCheck className="h-4 w-4" /> Saved successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>
      </form>
    </div>
  );
}
