import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND_HEALTH_URL = "http://localhost:23456/health";
const HEALTH_TIMEOUT_MS = 30_000;

let backend: ChildProcess | null = null;
let backendOutput = "";

async function waitForBackend(): Promise<void> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BACKEND_HEALTH_URL);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Backend did not become healthy within ${HEALTH_TIMEOUT_MS}ms\n${backendOutput}`);
}

export default async function globalSetup(): Promise<() => void> {
  const backendDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "backend");
  backend = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: backendDir,
    stdio: ["ignore", "pipe", "pipe"],
  });
  backend.stdout?.on("data", (chunk: Buffer) => {
    backendOutput += chunk.toString();
  });
  backend.stderr?.on("data", (chunk: Buffer) => {
    backendOutput += chunk.toString();
  });
  await waitForBackend();

  return () => {
    backend?.kill();
    backend = null;
  };
}
