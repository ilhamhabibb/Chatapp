import type { ApiError, ApiResponse } from "@chating/contracts";

const configuredUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

let cachedApiUrl = configuredUrl;

export function getApiUrl(): string {
  if (typeof window === "undefined") return cachedApiUrl;

  cachedApiUrl = `${window.location.protocol}//${window.location.hostname}:${new URL(configuredUrl).port || "4000"}`;
  return cachedApiUrl;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const body = (await response.json()) as ApiResponse<T> | ApiError;
  if (!response.ok || !body.success) {
    const message = "error" in body ? body.error.message : "Request gagal";
    throw new ApiRequestError(message, response.status);
  }
  return body.data;
}

export function jsonBody(value: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(value) };
}
