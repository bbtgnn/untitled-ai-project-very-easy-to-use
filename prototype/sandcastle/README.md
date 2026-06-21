# Sandcastle prototype — PROTOTYPE, delete when done

**Question:** Does the basic Sandcastle orchestration model (`run` vs `interactive`) fit this bun monorepo, and which sandbox provider should we default to?

## Run

From repo root:

```bash
bun install
cp .sandcastle/.env.example .sandcastle/.env   # fill in CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY
bun run prototype:sandcastle
```

## Keys

| Key | Action |
|-----|--------|
| `r` | AFK `run()` — Podman sandbox, branch `prototype/sandcastle-run` |
| `i` | `interactive()` — no sandbox, for exploration/research |
| `q` | Quit |

Sandbox pairing is fixed: **run → Podman**, **interactive → no-sandbox**.

After each action the full prototype state is re-rendered.

## Prerequisites

- Git
- For `docker` sandbox: Docker Desktop running
- For any agent call: `.sandcastle/.env` with auth configured

See [NOTES.md](./NOTES.md) for the verdict once you've driven it.
