import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/sdk", "packages/backend", "packages/desktop"],
  },
});
