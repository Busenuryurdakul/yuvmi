/**
 * Public API base URL for browser requests.
 * Returns null when NEXT_PUBLIC_API_BASE_URL is missing — never falls back to localhost in production builds.
 * In the browser, use same-origin `/api/...` so Vercel rewrites can proxy to the Go API (avoids CORS on preview URLs).
 */
export function getApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    return null;
  }

  if (typeof window !== "undefined") {
    // Same-origin so Vercel rewrites proxy /api to the Go backend.
    // Must be a non-empty string: callers treat "" as "not configured".
    return window.location.origin;
  }

  return raw.replace(/\/$/, "");
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl() !== null;
}
