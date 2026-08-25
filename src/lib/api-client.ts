export interface ApiError extends Error {
  status?: number;
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: ApiError = new Error(data?.message || "Something went wrong.");
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).then((r) => handle<{ user: unknown }>(r)),

  logout: () => fetch("/api/auth/logout", { method: "POST" }).then((r) => handle(r)),

  getBanks: () => fetch("/api/banks").then((r) => handle<{ banks: { bankId: number; bank: string }[] }>(r)),

  getPrincipalAccounts: (q: string) =>
    fetch(`/api/principal-accounts?q=${encodeURIComponent(q)}`).then((r) =>
      handle<{ principalAccounts: string[] }>(r)
    ),

  submitCollection: (formData: FormData) =>
    fetch("/api/collections", { method: "POST", body: formData }).then((r) =>
      handle<{ transRef: string; dateCreated: string }>(r)
    ),

  getNotifications: () =>
    fetch("/api/notifications").then((r) =>
      handle<{ notifications: { transId: number; transRef: string; dateCreated: string }[] }>(r)
    ),

  getRecentTransactions: (take = 20) =>
    fetch(`/api/transactions?take=${take}`).then((r) =>
      handle<{ transactions: { transId: number; transRef: string; dateCreated: string }[] }>(r)
    ),

  markNotificationsViewed: (transIds: number[]) =>
    fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transIds }),
    }).then((r) => handle(r)),

  changePassword: (payload: {
    currentPassword: string;
    newUsername: string;
    newPassword: string;
    confirmPassword: string;
  }) =>
    fetch("/api/account/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => handle<{ user: unknown }>(r)),
};
