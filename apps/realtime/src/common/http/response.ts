import type { ApiError, ApiResponse } from "@chating/contracts";

export function success<T>(data: T, message = "OK"): ApiResponse<T> {
  return { success: true, data, message };
}

export function failure(code: string, message: string, details?: unknown): ApiError {
  const error: ApiError["error"] = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return { success: false, error };
}
