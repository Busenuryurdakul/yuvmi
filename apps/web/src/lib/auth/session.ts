import { AUTH_STORAGE_KEY, type AuthUser } from "./types";

export function loadStoredSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistSession(user: AuthUser): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
