import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: true,
    outDir: "out/main",
    rollupOptions: {
      external: ["electron", "uiohook-napi"],
      input: {
        index: fileURLToPath(new URL("electron-src/main.ts", import.meta.url)),
      },
      output: {
        banner: [
          'import __cjsShimModule from "node:module";',
          "const require = __cjsShimModule.createRequire(import.meta.url);",
          "const __filename = import.meta.filename;",
          "const __dirname = import.meta.dirname;",
        ].join("\n"),
      },
    },
  },
});
