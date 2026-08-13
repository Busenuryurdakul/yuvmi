import { getApiBaseUrl } from "./config";
import { refreshAuthToken } from "./yuvmi";

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
    throw new ApiError(
      `API'ye ulaşılamadı (${getApiBaseUrl()}). Backend çalışıyor mu?`,
      0,
    );
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (response.status === 401 && !retried && options.refreshToken) {
    try {
      const refreshed = await refreshAuthToken(options.refreshToken);
      options.onTokenRefreshed?.({
        token: refreshed.token,
        refreshToken: refreshed.refresh_token,
      });
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
      // fall through to error handling
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
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (response.status === 401 && refreshToken) {
    const refreshed = await refreshAuthToken(refreshToken);
    onTokenRefreshed?.({ token: refreshed.token, refreshToken: refreshed.refresh_token });
    return apiUpload(path, refreshed.token, formData, refreshed.refresh_token, onTokenRefreshed);
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    throw parseApiError(payload, response.status);
  }

  if ("data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}
