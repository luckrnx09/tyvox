import { spawn } from "node:child_process";
import { build, createServer } from "vite";
import electronPath from "electron";

let electronProcess = null;
let rendererUrl = "";

const restartElectron = () => {
  if (!rendererUrl) return;
  electronProcess?.kill();
  electronProcess = spawn(electronPath, ["."], {
    stdio: "inherit",
    env: { ...process.env, ELECTRON_RENDERER_URL: rendererUrl },
  });
  electronProcess.on("exit", () => process.exit(0));
};

const watchMainProcess = {
  name: "restart-electron",
  closeBundle: restartElectron,
};

const server = await createServer({ configFile: "vite.renderer.config.ts" });
await server.listen();
rendererUrl = server.resolvedUrls.local[0].replace(/\/$/, "");
console.log(`Renderer dev server: ${rendererUrl}`);

await build({
  configFile: "vite.main.config.ts",
  build: { watch: {} },
  plugins: [watchMainProcess],
});
await build({
  configFile: "vite.preload.config.ts",
  build: { watch: {} },
  plugins: [watchMainProcess],
});

process.on("SIGINT", () => {
  electronProcess?.kill();
  process.exit(0);
});
