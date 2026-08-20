import { getApiBaseUrl } from "./config";
import type { LoginResponse } from "./types";

export class ApiError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

type SessionBridge = {
  getRefreshToken: () => string | undefined;
  onTokenRefreshed: (tokens: { token: string; refreshToken: string }) => void;
};

let sessionBridge: SessionBridge | null = null;

export function bindAuthSession(bridge: SessionBridge | null) {
  sessionBridge = bridge;
}

type RequestOptions = {
  method?: string;
  token?: string | null;
  refreshToken?: string | null;
  body?: unknown;
  onTokenRefreshed?: (tokens: { token: string; refreshToken: string }) => void;
};

function parseApiError(payload: Record<string, unknown>, status: number): ApiError {
  const nested = payload.error;
  if (nested && typeof nested === "object" && "message" in nested) {
    const err = nested as { message?: string; code?: number };
    return new ApiError(err.message ?? `İstek başarısız (${status})`, err.code ?? status);
  }

  if (typeof payload.message === "string" && payload.message.length > 0) {
    return new ApiError(payload.message, (payload.code as number | undefined) ?? status);
  }

  if (typeof nested === "string" && nested.length > 0) {
    return new ApiError(nested, status);
  }

  return new ApiError(`İstek başarısız (${status})`, status);
}

function parsePayload(text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function refreshSession(refreshToken: string): Promise<LoginResponse> {
  const baseUrl = getApiBaseUrl();
  if (baseUrl === null) {
    throw new ApiError("API adresi yapılandırılmamış (NEXT_PUBLIC_API_BASE_URL).", 0);
  }

  const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const payload = parsePayload(await response.text());
  if (!response.ok) throw parseApiError(payload, response.status);
  if ("data" in payload) return payload.data as LoginResponse;
  return payload as unknown as LoginResponse;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestWithRefresh(path, options, false);
}

async function requestWithRefresh<T>(
  path: string,
  options: RequestOptions,
  retried: boolean,
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (baseUrl === null) {
    throw new ApiError("API adresi yapılandırılmamış (NEXT_PUBLIC_API_BASE_URL).", 0);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  }).catch(() => {
    throw new ApiError(`API'ye ulaşılamadı (${baseUrl}). Backend çalışıyor mu?`, 0);
  });

  const payload = parsePayload(await response.text());

  const refreshToken = options.refreshToken ?? sessionBridge?.getRefreshToken();
  if (response.status === 401 && !retried && refreshToken) {
    try {
      const refreshed = await refreshSession(refreshToken);
      const tokens = { token: refreshed.token, refreshToken: refreshed.refresh_token };
      options.onTokenRefreshed?.(tokens);
      sessionBridge?.onTokenRefreshed(tokens);
      return requestWithRefresh(
        path,
        {
          ...options,
          token: refreshed.token,
          refreshToken: refreshed.refresh_token,
        },
        true,
      );
    } catch {
      // fall through
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
