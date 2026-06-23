# Sandcastle prototype — PROTOTYPE, delete when done

**Question:** Does `createWorktree()` + `wt.run()` / `wt.interactive()` + escalation fit this monorepo?

**Standalone:** No `@repo/orchestrator` dependency. Logic split by layer:

| File | Layer |
|------|-------|
| [`src/tui.ts`](./src/tui.ts) | TUI shell |
| [`src/actions.ts`](./src/actions.ts) | Prototype actions → state updates |
| [`src/state.ts`](./src/state.ts) | `PrototypeState` + initial values |
| [`src/orchestrator.ts`](./src/orchestrator.ts) | Sandcastle worktree API |
| [`src/env.ts`](./src/env.ts) | `.env` load + pi auth |
| [`src/constants.ts`](./src/constants.ts) | Signals, model, branch naming |

## Run

```bash
bun install
cp .sandcastle/.env.example .sandcastle/.env   # OLLAMA_API_KEY
bun run sandcastle:build-image
bun run prototype:sandcastle
```

## Keys

| Key | Action |
|-----|--------|
| `w` | `createWorktree()` on `agent/prototype-sandcastle` |
| `r` | `wt.run()` — pi + Podman + Ollama Cloud |
| `i` | `wt.interactive()` — pi, no sandbox |
| `a` | Resume after `NEEDS_HUMAN` escalation |
| `d` | `wt.close()` — human dismissal |
| `q` | Quit |

See [NOTES.md](./NOTES.md) for the verdict.
