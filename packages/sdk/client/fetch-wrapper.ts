import { resolveBaseUrl, resolveUserId, resolveSource, resolveSessionId } from "./config.js";
import { ApiError } from "./errors.js";

const SSE_CONTENT_TYPE = "text/event-stream";

export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set("X-User-ID", resolveUserId());

  const source = resolveSource();
  if (source) headers.set("X-Source", source);

  const sessionId = resolveSessionId();
  if (sessionId) headers.set("X-Session-Id", sessionId);

  const response = await fetch(`${resolveBaseUrl()}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body?.error?.message || `HTTP ${response.status}`,
      response.status,
      body?.error?.code,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes(SSE_CONTENT_TYPE)) {
    return response as unknown as T;
  }

  const text = await response.text();
  const data = text.length > 0 ? JSON.parse(text) : undefined;
  return { data, status: response.status, headers: response.headers } as T;
};
