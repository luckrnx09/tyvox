import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: true,
    outDir: "out/preload",
    rollupOptions: {
      external: ["electron"],
      input: {
        index: fileURLToPath(new URL("electron-src/preload.ts", import.meta.url)),
      },
      output: {
        format: "cjs",
        entryFileNames: "index.js",
      },
    },
  },
});
