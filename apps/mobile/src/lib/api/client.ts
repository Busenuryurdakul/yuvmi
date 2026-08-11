import { getApiBaseUrl } from "./config";
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
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
