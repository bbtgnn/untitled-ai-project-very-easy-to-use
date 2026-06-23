# Sandcastle prototype — PROTOTYPE, delete when done

**Question:** Does `createWorktree()` + `wt.run()` / `wt.interactive()` + escalation fit this monorepo?

**Standalone:** All orchestrator logic is in [`src/logic.ts`](./src/logic.ts) — no `@repo/orchestrator` dependency. [`src/tui.ts`](./src/tui.ts) is a thin shell.

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
