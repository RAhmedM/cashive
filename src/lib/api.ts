/**
 * Client-side API utility.
 *
 * Thin typed wrapper around fetch that:
 * - Sends credentials (httpOnly session cookie) automatically
 * - Parses JSON responses
 * - Throws ApiError with status code on non-2xx responses
 */

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => ({
    error: res.statusText || "Unknown error",
  }));

  if (!res.ok) {
    throw new ApiError(
      body.error || res.statusText || "Request failed",
      res.status,
      body.errors
    );
  }

  return body as T;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },
};
