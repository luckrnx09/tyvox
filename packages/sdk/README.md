# @tyvox/sdk

The contract layer for Tyvox. Zod schemas define every API data shape, zod-openapi route definitions serve both the backend's wiring and the OpenAPI spec, and a TypeScript fetch client is generated from that spec via [orval](https://orval.dev/). Backend and desktop never hand-roll request types — they import from here.

## Usage

```ts
import { setup, healthCheck, listASRModels, prepareASRModel } from "@tyvox/sdk/client";

setup({ baseUrl: "http://127.0.0.1:23456", userId: "default" });

const { data } = await listASRModels();
const { data: health } = await healthCheck();
await prepareASRModel("whisper:small");
```

## Codegen

```bash
pnpm codegen    # from repo root: openapi.yaml from routes → client.ts → PascalCase type fixes
```

The pipeline:

1. `tsx scripts/generate-openapi.ts` builds `openapi.yaml` from the route definitions (wired against `scripts/mock-services.ts`, since only the schemas matter)
2. `orval` generates `client/client.ts`
3. `tsx scripts/fix-codegen-types.ts` renames camelCase type identifiers to PascalCase via AST

## Structure

```
contracts/
  index.ts           Zod contracts — source of truth for API data shapes
constants/
  index.ts           DEFAULT_PORT / DEFAULT_HOST / DEFAULT_BASE_URL
server/
  routes/            Route definitions (backend wiring + OpenAPI generation)
  router.ts          createApiRouter
  types.ts           Services interface, AppEnv
client/
  client.ts          Generated fetch client (do not edit)
  index.ts           Public API re-exports
  config.ts          setup(), session id
  fetch-wrapper.ts   Transport layer (customFetch)
  sse-response.ts    SSE streaming responses
  errors.ts          ApiError
openapi.yaml         Generated API contract
orval.config.ts      Codegen config
scripts/
  generate-openapi.ts   Routes → openapi.yaml
  fix-codegen-types.ts  Post-process PascalCase types
  mock-services.ts      Stub Services used during spec generation
```
