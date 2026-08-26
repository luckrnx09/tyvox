import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The renderer cannot reliably import outside its root (the repo assets dir
// lives two levels up), so the logo SVG is mirrored into client-src/assets at
// config load. assets/logo/logo.svg stays the single source of truth.
copyFileSync(
  fileURLToPath(new URL("../../assets/logo/logo.svg", import.meta.url)),
  fileURLToPath(new URL("client-src/assets/logo.svg", import.meta.url)),
);

export default defineConfig({
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("out/renderer", import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("client-src/index.html", import.meta.url)),
      },
    },
  },
  plugins: [react()],
  publicDir: fileURLToPath(new URL("client-src/assets", import.meta.url)),
  root: fileURLToPath(new URL("client-src", import.meta.url)),
});
