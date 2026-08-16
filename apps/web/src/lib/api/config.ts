/**
 * Public API base URL for browser requests.
 * Returns null when NEXT_PUBLIC_API_BASE_URL is missing — never falls back to localhost in production builds.
 */
export function getApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    return null;
  }

  return raw.replace(/\/$/, "");
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl() !== null;
}
