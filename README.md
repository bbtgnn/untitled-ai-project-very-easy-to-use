# untitled-ai-project

Bun monorepo prototyping [Sandcastle](https://github.com/mattpocock/sandcastle) agent orchestration.

## Structure

| Path | Purpose |
|------|---------|
| `apps/web` | Minimal host app — something for agents to target |
| `prototype/sandcastle` | **PROTOTYPE** — throwaway TUI to exercise `run()` and `interactive()` |
| `.sandcastle/` | Sandcastle config (scaffolded via `sandcastle init`) |

## Quick start

```bash
bun install
cp .sandcastle/.env.example .sandcastle/.env   # add CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY
bun run prototype:sandcastle
```

Domain language lives in [CONTEXT.md](./CONTEXT.md). Scope and future work in [docs/ROADMAP.md](./docs/ROADMAP.md).
