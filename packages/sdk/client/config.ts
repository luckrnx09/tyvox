import { DEFAULT_BASE_URL } from "../constants/index.js";

let baseUrl = DEFAULT_BASE_URL;
let userId = "default";
let source = "";
let currentSessionId = "";

export function setup(
  config: { baseUrl?: string; userId?: string },
  options?: { source?: string },
) {
  if (config.baseUrl !== undefined) baseUrl = config.baseUrl;
  if (config.userId !== undefined) userId = config.userId;
  if (options?.source !== undefined) source = options.source;
}

export function setSessionId(id: string): void {
  currentSessionId = id;
}

export function resolveBaseUrl(): string {
  return baseUrl;
}

export function resolveUserId(): string {
  return userId;
}

export function resolveSource(): string {
  return source;
}

export function resolveSessionId(): string {
  return currentSessionId;
}
