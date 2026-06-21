# Sandcastle prototype — PROTOTYPE, delete when done

**Question:** Does `createWorktree()` + `wt.run()` / `wt.interactive()` + escalation fit this monorepo?

Uses `@repo/orchestrator` — the logic worth keeping lives there, not here.

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

Thin runner (no TUI): `bun run sandcastle:run [trackerId] [slug] [prompt]`

See [NOTES.md](./NOTES.md) for the verdict.
