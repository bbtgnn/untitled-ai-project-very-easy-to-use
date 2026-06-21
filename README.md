# untitled-ai-project

Bun monorepo prototyping [Sandcastle](https://github.com/mattpocock/sandcastle) agent orchestration.

## Structure

| Path | Purpose |
|------|---------|
| `apps/web` | **Target app** — something for agents to modify |
| `packages/orchestrator` | **Orchestrator** — worktree lifecycle, run/interactive/escalation |
| `prototype/sandcastle` | **PROTOTYPE** — throwaway TUI to exercise the model |
| `.sandcastle/` | Sandcastle config; `main.ts` is a thin runner |

## Quick start

```bash
bun install
cp .sandcastle/.env.example .sandcastle/.env   # add OLLAMA_API_KEY (see ollama.com/settings/keys)
bun run sandcastle:build-image                 # Podman sandbox image (pi + ollama-cloud)
bun run prototype:sandcastle                   # TUI prototype
```

Agent stack: **pi** coding agent, **Ollama Cloud** via Podman. Set `OLLAMA_CLOUD_MODEL=ollama-cloud/<model>` in `.sandcastle/.env` (see `pi --list-models` in the sandbox).

Domain language lives in [CONTEXT.md](./CONTEXT.md). Scope and future work in [docs/ROADMAP.md](./docs/ROADMAP.md).
