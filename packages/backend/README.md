# @tyvox/backend

The API server behind Tyvox. A [Hono](https://hono.dev/) app that takes audio from the desktop client and returns text: speech recognition, optional LLM polish/translation, plus the endpoints that back settings, vocabulary, history, and logs.

## Commands

```bash
pnpm dev         # tsx watch, binds TYVOX_HOST:TYVOX_PORT
pnpm build       # tsup → dist/
pnpm start       # node dist/index.mjs
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
pnpm eval        # polish-prompt eval against a live LLM
```

| Variable     | Default     | Description             |
| ------------ | ----------- | ----------------------- |
| `TYVOX_PORT` | `23456`     | Port to bind.           |
| `TYVOX_HOST` | `127.0.0.1` | Interface to listen on. |

From the repo root, `docker compose up` runs the backend in a container with data in the `tyvox-data` volume.

## How it fits together

Route definitions live in [`@tyvox/sdk`](../sdk) (zod-openapi), so the API contract and its OpenAPI spec come from one source. This package supplies the implementations:

```
src/
  index.ts         entrypoint — env, port, server bootstrap
  server.ts        app assembly
  middleware/      error handling, request logging, user resolution
  repositories/    file-backed persistence keyed by userId
  services/
    asr/           provider abstraction; local whisper/sensevoice binaries
                   (downloaded per platform at runtime) + cloud ASR APIs
    llm/           OpenAI-compatible client for polish & translation
    transcribe/    WAV assembly → ASR pipeline
    transform/     polish / translate
    vocabulary/    personal dictionary
    memory/        global scheduler that learns user profile & style from history
    user-config/   settings read/write
    logs/          log collection
  eval/            eval harness for the polish prompt
  utils/           locks, dates, timeouts, system CA trust
```

Conventions worth knowing before editing:

- Services are stateless functions parameterized by `userId` — never by file path.
- All storage goes through the repository interfaces in `repositories/`; a single module composes the file-based implementation, so swapping storage means swapping that one module.
- One global memory scheduler scans all users; there are no per-user schedulers.
- Local ASR downloads whisper/sensevoice binaries on demand, with mirror fallback when the primary source fails.

All runtime data (config, vocabulary, models, logs) lives under `~/.tyvox`.

## Eval

`pnpm eval` scores the polish prompt against a live LLM. Configuration via environment: `EVAL_LLM_BASE_URL`, `EVAL_LLM_MODEL`, `EVAL_LLM_API_KEY`, optionally `EVAL_LLM_PROVIDER` and `EVAL_JUDGE_MODEL`.
