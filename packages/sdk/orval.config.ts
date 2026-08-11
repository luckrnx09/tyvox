import { defineConfig } from "orval";

export default defineConfig({
  tyvox: {
    input: {
      target: "./openapi.yaml",
    },
    output: {
      target: "./client/client.ts",
      client: "fetch",
      override: {
        mutator: {
          path: "./client/fetch-wrapper.ts",
          name: "customFetch",
        },
      },
    },
  },
});
