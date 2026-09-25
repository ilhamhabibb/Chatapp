import type { ApiError, ApiResponse } from "@chating/contracts";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const body = (await response.json()) as ApiResponse<T> | ApiError;
  if (!response.ok || !body.success) {
    const message = "error" in body ? body.error.message : "Request gagal";
    throw new Error(message);
  }
  return body.data;
}

export function jsonBody(value: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(value) };
}

export function getApiUrl(): string {
  return apiUrl;
}
