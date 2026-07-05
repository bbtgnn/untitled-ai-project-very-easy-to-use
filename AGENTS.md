# AGENTS.md

## Aim of the project

The final aim is an **app for students** (high school / university). Its defining trait: it **shows the concepts it's built on — git, skills, agent workflows, etc. — without hiding them, but also without forcing students to use them directly**. Students should see what a branch, a run, or a skill is and what it's doing for them, without needing to operate git or an agent CLI themselves. The highest-value property of the product is **ease of use** — when a trade-off arises between exposing a concept and keeping the app easy, favor a presentation that keeps both: visible, but never in the way.

The current stage toward that goal is an **agent orchestration harness** built around [Sandcastle](https://github.com/mattpocock/sandcastle): worktree lifecycle, sandboxed runs, human-in-the-loop escalation. This harness is the machinery the student app will eventually be built on and expose — it is the current focus, not the end product.

### Product requirements (keep in mind for all product-facing work)

- **Target users**: high-school and university students — assume no git, terminal, or AI-tooling experience.
- **Show, don't hide, don't require**: underlying concepts (git, skills, runs, worktrees…) are surfaced and named honestly in the UI, but the student never has to drive them manually.
- **Ease of use is the top priority**: prefer fewer steps, sensible defaults, and plain language over configurability.

## Current stage: the orchestration harness

The core model being validated:

- **Run**: an AFK agent invocation via Sandcastle's `run()`, executed in a **Podman sandbox** on an isolated git worktree. Always human-triggered.
- **Interactive session**: a human-in-the-loop session via `interactive()`, **no sandbox**, on the same worktree.
- **Escalation**: when a run is blocked, the agent emits `<promise>NEEDS_HUMAN</promise>`; the orchestrator promotes to an interactive session on the same worktree/branch, then resumes the run (`resumeSession`) with the human's answer. `<promise>COMPLETE</promise>` signals success — those are the only two signals.
- **Worktrees**: each run targets an explicit branch named `agent/{tracker-id}-{slug}` in a Sandcastle-created worktree. Work stays isolated until a human merges or discards it; the human also decides when to close the worktree (`wt.close()`).

Agent stack: **pi** coding agent + **Ollama Cloud**, sandboxed with Podman (built from `.sandcastle/Containerfile`).

The long-term direction (see `docs/ROADMAP.md`) is to route work from multiple AI coding workflows (Superpowers, Compound Engineering, GSD) via per-workflow adapters. That is **out of scope for now**: tasks are plain markdown files, treated as opaque text — no parsing, no schemas, no adapters unless explicitly asked.

## Monorepo layout

Bun workspaces monorepo (`bun@1.3.x`), workspaces: `apps/*`, `packages/*`, `prototype/*`.

| Path | Package | Role |
|------|---------|------|
| `packages/orchestrator` | `@repo/orchestrator` | The orchestrator: worktree lifecycle, run/interactive/escalation, Sandcastle API calls. The heart of the repo. |
| `apps/web` | `@apps/web` | A **target app** — a thin app for agents to modify, and the natural home for the future student-facing app. It's the thing being built, not the thing doing the building. |
| `prototype/sandcastle` | `@prototype/sandcastle` | Standalone throwaway TUI exercising the orchestration model (see prototype rule below). |
| `.sandcastle/` | — | Sandcastle config: `Containerfile`, `.env`, `main.ts` (a thin runner that imports from `@repo/orchestrator`), worktrees. |
| `docs/ROADMAP.md` | — | Scope boundaries: what's prototype-now vs v2-later. |
| `CONTEXT.md` | — | Domain vocabulary (Run, Escalation, Worktree, etc.). Use its terminology, but note it's partially outdated and doesn't describe every project in the repo. |
| `AGENTS.dictionary.md` | — | The shared dictionary between the AI and the dev. Use its words; see the file for how to add one. |

Common commands (from repo root):

```bash
bun install
bun run sandcastle:build-image    # build the Podman sandbox image
bun run prototype:sandcastle      # start the TUI prototype
bun run sandcastle:run            # trigger a run via .sandcastle/main.ts
```

## Rule: `prototype/` holds standalone projects

Anything under `prototype/` is a **standalone project** meant to answer a question quickly. When it's validated, it gets **upgraded into one of the packages** (typically `packages/orchestrator`) and the prototype folder is deleted.

Consequences for agents working here:

- Prototypes must **not** depend on workspace packages like `@repo/orchestrator` — they stay standalone so they can be evaluated and folded in cleanly. They may depend on external packages (e.g. `@ai-hero/sandcastle`) directly.
- Don't polish prototypes for production: no premature abstraction, no backwards compatibility, hardcoded paths/conventions are fine.
- Don't import *from* `prototype/*` in `apps/` or `packages/` — the dependency direction is prototype → graduate → package, never package → prototype.
- Each prototype keeps its own `README.md` (the question it answers, how to run it) and `NOTES.md` (the verdict). Update the verdict when you learn something.
- When a prototype graduates, port the validated logic into the target package and delete the prototype folder.

## Working conventions

- Use the domain language from `CONTEXT.md` (say "run", not "job"; "worktree", not "clone"; "escalation", not "handoff"). `AGENTS.dictionary.md` is the shared dictionary between the AI and the dev — check it before coining a new term.
- Tasks are flat markdown files with no schema. Do not build parsers, adapters, or workflow detection for them — that's v2 (`docs/ROADMAP.md`).
- Runs use Podman, never Docker. Interactive sessions use no sandbox.
- Agent branches follow `agent/{tracker-id}-{slug}`. Merging and worktree dismissal are human decisions — don't automate them.
