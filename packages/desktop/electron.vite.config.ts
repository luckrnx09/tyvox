import { defineConfig } from "electron-vite";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

const dir =
  typeof __dirname !== "undefined" ? __dirname : fileURLToPath(new URL(".", import.meta.url));

// The renderer cannot reliably import outside its root (the repo assets dir
// lives two levels up), so the logo SVG is mirrored into client-src/assets at
// config load. assets/logo/logo.svg stays the single source of truth.
copyFileSync(
  resolve(dir, "..", "..", "assets", "logo", "logo.svg"),
  resolve(dir, "client-src", "assets", "logo.svg"),
);

export default defineConfig({
  main: {
    build: {
      ssr: true,
      rollupOptions: {
        external: ["electron", "uiohook-napi"],
        input: {
          index: resolve(dir, "electron-src/main.ts"),
        },
      },
    },
  },
  preload: {
    build: {
      ssr: true,
      rollupOptions: {
        external: ["electron"],
        input: {
          index: resolve(dir, "electron-src/preload.ts"),
        },
        output: {
          format: "cjs",
          entryFileNames: "index.js",
        },
      },
    },
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(dir, "client-src/index.html"),
        },
      },
    },
    plugins: [react()],
    publicDir: resolve(dir, "client-src/assets"),
    root: resolve(dir, "client-src"),
  },
});
