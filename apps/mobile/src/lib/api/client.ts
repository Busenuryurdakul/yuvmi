import { getApiBaseUrl } from "./config";
import { refreshAuthToken } from "./yuvmi";
import type { ApiErrorBody } from "./types";

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
    const err = payload as ApiErrorBody;
    const message =
      err.error?.message ?? err.message ?? `İstek başarısız (${response.status})`;
    throw new ApiError(message, err.error?.code ?? response.status);
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
    const err = payload as ApiErrorBody;
    const message =
      err.error?.message ?? err.message ?? `İstek başarısız (${response.status})`;
    throw new ApiError(message, err.error?.code ?? response.status);
  }

  if ("data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}
