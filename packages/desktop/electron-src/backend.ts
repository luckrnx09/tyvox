import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";
import { app } from "electron";
import { DEFAULT_HOST, DEFAULT_PORT } from "@tyvox/sdk/constants";
import type { LocalSettings } from "../shared/types/settings.js";
import { logger } from "./utils/logger.js";

const HEALTH_TIMEOUT_MS = 15_000;
const HEALTH_POLL_INTERVAL_MS = 500;

let backendProcess: ChildProcess | null = null;
let runtimeBaseUrl = "";
let currentSettings: LocalSettings | null = null;
let startPromise: Promise<string> | null = null;

export function getRuntimeBaseUrl(): string {
  return runtimeBaseUrl;
}

function settingsEqual(a: LocalSettings, b: LocalSettings): boolean {
  return a.useLocalBackend === b.useLocalBackend && a.serverUrl === b.serverUrl;
}

async function findFreePort(startPort: number): Promise<number> {
  const lastPort = startPort + 100;
  for (let port = startPort; port <= lastPort; port += 1) {
    const isFree = await new Promise<boolean>((resolve) => {
      const server = createServer();
      server.on("error", () => resolve(false));
      server.listen(port, DEFAULT_HOST, () => {
        server.close(() => resolve(true));
      });
    });
    if (isFree) return port;
  }
  throw new Error(`No free port found between ${startPort} and ${lastPort}`);
}

async function isBackendUp(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForBackend(url: string): Promise<boolean> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isBackendUp(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_INTERVAL_MS));
  }
  return false;
}

export function startBackend(settings: LocalSettings): Promise<string> {
  if (runtimeBaseUrl && currentSettings && settingsEqual(currentSettings, settings)) {
    return Promise.resolve(runtimeBaseUrl);
  }

  currentSettings = { ...settings };

  if (startPromise) {
    return startPromise;
  }

  startPromise = (async () => {
    try {
      stopBackend();

      if (!settings.useLocalBackend) {
        const reachable = await isBackendUp(settings.serverUrl);
        if (!reachable) {
          throw new Error(`Remote backend is not reachable: ${settings.serverUrl}`);
        }
        runtimeBaseUrl = settings.serverUrl;
        return runtimeBaseUrl;
      }

      const port = await findFreePort(DEFAULT_PORT);
      const baseUrl = `http://${DEFAULT_HOST}:${port}`;

      if (app.isPackaged) {
        const entry = join(process.resourcesPath, "backend", "index.mjs");
        backendProcess = spawn(process.execPath, ["--use-system-ca", entry], {
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
            TYVOX_PORT: String(port),
            TYVOX_HOST: DEFAULT_HOST,
          },
          stdio: "ignore",
        });
        backendProcess.on("exit", (code) => {
          logger.warn("Backend process exited", { code });
          backendProcess = null;
        });
        if (!(await waitForBackend(baseUrl))) {
          throw new Error(`Embedded backend did not become healthy within ${HEALTH_TIMEOUT_MS} ms`);
        }
        logger.info("Embedded backend started", { port });
        runtimeBaseUrl = baseUrl;
        return runtimeBaseUrl;
      }

      // Dev mode: reuse a backend the developer already started.
      const devUrl = settings.serverUrl || baseUrl;
      if (await isBackendUp(devUrl)) {
        logger.info("Reusing dev backend", { url: devUrl });
        runtimeBaseUrl = devUrl;
        return runtimeBaseUrl;
      }
      logger.warn("Backend not running; start it with `pnpm dev` at the repo root");
      runtimeBaseUrl = devUrl;
      return runtimeBaseUrl;
    } finally {
      startPromise = null;
    }
  })();

  return startPromise;
}

export function stopBackend(): void {
  backendProcess?.kill();
  backendProcess = null;
  runtimeBaseUrl = "";
}
