import { serve } from "@hono/node-server";
import { DEFAULT_HOST, DEFAULT_PORT } from "@tyvox/sdk/constants";
import { createApp } from "./server.js";
import { startMemoryScheduler } from "./services/memory/scheduler.js";
import { getLogger } from "./utils/logger.js";

const systemLogger = getLogger("system");

const app = createApp();
const port = Number(process.env.TYVOX_PORT) || DEFAULT_PORT;
const host = process.env.TYVOX_HOST || DEFAULT_HOST;
const stopMemoryScheduler = startMemoryScheduler();

serve({ fetch: app.fetch, port, hostname: host }, () => {
  systemLogger.info(`Backend running on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => {
    stopMemoryScheduler();
    process.exit(0);
  });
}
