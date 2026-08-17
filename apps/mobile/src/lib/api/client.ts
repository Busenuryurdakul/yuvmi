import { getApiBaseUrl } from "./config";
import { refreshAuthToken } from "./yuvmi";
import { loadStoredSession, persistSession } from "@/lib/auth/session";

export class ApiError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

type RequestOptions = {
  method?: string;
  token?: string | null;
  refreshToken?: string | null;
  body?: unknown;
  onTokenRefreshed?: (tokens: { token: string; refreshToken: string }) => void;
};

type TokenPair = { token: string; refreshToken: string };

let onSessionTokensRefreshed: ((tokens: TokenPair) => void) | null = null;

/**
 * Raised when the request never reached the server. Carries code 0 so callers
 * can tell a connectivity failure apart from an API rejection. The base URL is
 * only appended in development — it is an internal address and means nothing
 * to a user.
 */
function networkError(): ApiError {
  const message = "Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.";
  return new ApiError(__DEV__ ? `${message} [${getApiBaseUrl()}]` : message, 0);
}

/** Hard deadline for every request. Without one, a stalled connection never
 *  settles and the caller's loading state stays up forever. */
const REQUEST_TIMEOUT_MS = 15_000;

/** Uploads push real bytes over the wire, so this stays a separate knob even
 *  though it currently matches REQUEST_TIMEOUT_MS. Raise it here if large
 *  photos start timing out on slow connections. */
const UPLOAD_TIMEOUT_MS = 15_000;

/** Same code 0 as networkError: from the caller's side "the deadline passed"
 *  and "the connection died" are the same situation — nothing reached the
 *  server, so the request is safe to queue and replay. */
function timeoutError(timeoutMs: number): ApiError {
  return new ApiError(
    `Sunucu ${Math.round(timeoutMs / 1000)} saniye içinde yanıt vermedi. Bağlantını kontrol edip tekrar dene.`,
    0,
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw controller.signal.aborted ? timeoutError(timeoutMs) : networkError();
  } finally {
    clearTimeout(timer);
  }
}

export function setSessionTokenListener(listener: ((tokens: TokenPair) => void) | null) {
  onSessionTokensRefreshed = listener;
}

function parseApiError(payload: Record<string, unknown>, status: number): ApiError {
  const nested = payload.error;
  if (nested && typeof nested === "object" && "message" in nested) {
    const err = nested as { message?: string; code?: number };
    return new ApiError(
      err.message ?? `İstek başarısız (${status})`,
      err.code ?? status,
    );
  }

  if (typeof nested === "string" && nested.length > 0) {
    return new ApiError(nested, status);
  }

  if (typeof payload.message === "string" && payload.message.length > 0) {
    return new ApiError(payload.message, (payload.code as number | undefined) ?? status);
  }

  return new ApiError(`İstek başarısız (${status})`, status);
}

async function resolveRefreshToken(explicit?: string | null): Promise<string | null> {
  if (explicit) return explicit;
  const session = await loadStoredSession();
  return session?.refreshToken ?? null;
}

async function persistRefreshedTokens(tokens: TokenPair, notify?: RequestOptions["onTokenRefreshed"]) {
  const session = await loadStoredSession();
  if (session) {
    await persistSession({ ...session, token: tokens.token, refreshToken: tokens.refreshToken });
  }
  notify?.(tokens);
  onSessionTokensRefreshed?.(tokens);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestWithRefresh(path, options, false);
}

async function requestWithRefresh<T>(
  path: string,
  options: RequestOptions,
  retried: boolean,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  }).catch(() => {
    throw networkError();
  });

  const text = await response.text();
  let payload: Record<string, unknown> = {};
  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new ApiError(`Geçersiz API yanıtı: ${text.slice(0, 100)}`, response.status);
    }
  }

  const canRefresh = response.status === 401 && !retried && !path.includes("/auth/refresh");
  if (canRefresh) {
    const refreshToken = await resolveRefreshToken(options.refreshToken);
    if (refreshToken) {
      try {
        const refreshed = await refreshAuthToken(refreshToken);
        const tokens = { token: refreshed.token, refreshToken: refreshed.refresh_token };
        await persistRefreshedTokens(tokens, options.onTokenRefreshed);
        return requestWithRefresh(
          path,
          {
            ...options,
            token: tokens.token,
            refreshToken: tokens.refreshToken,
          },
          true,
        );
      } catch {
        // fall through to error handling
      }
    }
  }

  if (!response.ok) {
    throw parseApiError(payload, response.status);
  }

  if ("data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export async function apiUpload<T>(
  path: string,
  token: string,
  formData: FormData,
  refreshToken?: string | null,
  onTokenRefreshed?: RequestOptions["onTokenRefreshed"],
  _retried = false,
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }).catch(() => {
    throw networkError();
  });

  if (response.status === 401 && !_retried) {
    const sessionRefresh = await resolveRefreshToken(refreshToken);
    if (sessionRefresh) {
      try {
        const refreshed = await refreshAuthToken(sessionRefresh);
        const tokens = { token: refreshed.token, refreshToken: refreshed.refresh_token };
        await persistRefreshedTokens(tokens, onTokenRefreshed);
        return apiUpload(path, refreshed.token, formData, refreshed.refresh_token, onTokenRefreshed, true);
      } catch {
        // fall through to error handling
      }
    }
  }

  const text = await response.text();
  let payload: Record<string, unknown> = {};
  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new ApiError(`Geçersiz API yanıtı: ${text.slice(0, 100)}`, response.status);
    }
  }

  if (!response.ok) {
    throw parseApiError(payload, response.status);
  }

  if ("data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}
