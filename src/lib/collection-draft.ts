// Persists in-progress text/dropdown field values for a collection form so a
// dropped connection, accidental refresh, or a phone app-switch doesn't lose
// what the user already typed. Deliberately excludes attachments (File
// objects can't survive a reload without IndexedDB) and the confirm password.

const PREFIX = "cms-collection-draft:";

export function saveDraft(typeKey: string, data: Record<string, unknown>) {
  try {
    localStorage.setItem(PREFIX + typeKey, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — draft-saving
    // is a nice-to-have, so fail silently rather than interrupt the user.
  }
}

export function loadDraft<T = Record<string, unknown>>(typeKey: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + typeKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearDraft(typeKey: string) {
  try {
    localStorage.removeItem(PREFIX + typeKey);
  } catch {
    // ignore
  }
}
