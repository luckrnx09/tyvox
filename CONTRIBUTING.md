# Contributing to Tyvox

## Development setup

```bash
pnpm install
pnpm dev        # backend + desktop
pnpm test       # all tests
```

## Pull request process

1. Open an issue first for large changes.
2. Create a feature branch.
3. Run `pnpm lint`, `pnpm format:check`, and `pnpm typecheck`.
4. Keep commits focused and follow conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`).
5. Update `AGENTS.md` and `README.md` if your change affects contributor or user workflows.

## Code style

See `AGENTS.md` for the project style guide.
