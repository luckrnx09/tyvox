import { defineConfig } from "tsup";

export default defineConfig({
  noExternal: [/.*/],
  splitting: false,
  outExtension: () => ({ js: ".mjs" }),
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
