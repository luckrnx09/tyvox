import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { copyFileSync } from "node:fs";
import path from "node:path";

copyFileSync(
  path.resolve(__dirname, "..", "..", "assets", "logo", "logo.svg"),
  path.resolve(__dirname, "client-src", "assets", "logo.svg"),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client-src"),
    },
  },
  test: {
    coverage: {
      exclude: [
        "client-src/main.tsx",
        "client-src/index.html",
        "electron-src/main.ts",
        "electron-src/preload.ts",
        "**/*.d.ts",
        "**/__tests__/**",
      ],
      include: [
        "shared/**/*.ts",
        "electron-src/config/**/*.ts",
        "electron-src/services/**/*.ts",
        "client-src/**/*.tsx",
        "client-src/**/*.ts",
        "../../tests/e2e/**/*.test.ts",
      ],
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    environment: "jsdom",
    exclude: [
      "**/node_modules/**",
      "e2e/**",
      "electron-src/resources/backend/**",
      "release/**",
      "out/**",
    ],
    globals: true,
    setupFiles: ["./client-src/test-setup.ts"],
  },
});
