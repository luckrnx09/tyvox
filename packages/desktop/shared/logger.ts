import type { ClientLogEntry } from "@tyvox/sdk/contracts";

const FLUSH_INTERVAL_MS = 5000;
const BATCH_SIZE = 20;

export interface RemoteLogger {
  debug: (message: string, extra?: Record<string, unknown>) => void;
  info: (message: string, extra?: Record<string, unknown>) => void;
  warn: (message: string, extra?: Record<string, unknown>) => void;
  error: (message: string, extra?: Record<string, unknown>) => void;
}

export interface CreateRemoteLoggerOptions {
  send: (entries: ClientLogEntry[]) => Promise<unknown> | unknown;
  getSessionId?: () => string;
}

export function createRemoteLogger(options: CreateRemoteLoggerOptions): RemoteLogger {
  const { send, getSessionId } = options;
  let buffer: ClientLogEntry[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleFlush(): void {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, FLUSH_INTERVAL_MS);
  }

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const entries = buffer.splice(0, buffer.length);
    try {
      await send(entries);
    } catch {
      // Drop silently to avoid log-loop on transport failure.
    }
  }

  function enqueue(
    level: ClientLogEntry["level"],
    message: string,
    extra?: Record<string, unknown>,
    immediate = false,
  ): void {
    buffer.push({
      level,
      message,
      sessionId: getSessionId?.() || undefined,
      extra,
    });

    if (immediate || buffer.length >= BATCH_SIZE) {
      flush();
    } else {
      scheduleFlush();
    }
  }

  return {
    debug: (message, extra) => enqueue("debug", message, extra),
    info: (message, extra) => enqueue("info", message, extra),
    warn: (message, extra) => enqueue("warn", message, extra, true),
    error: (message, extra) => enqueue("error", message, extra, true),
  };
}
