# Verdict

**Question:** Does the basic Sandcastle orchestration model (`run` vs `interactive`) fit this bun monorepo?

**Answer:** Yes — with `createWorktree()` as the anchor, Podman for runs, no-sandbox for interactive, and escalation via `NEEDS_HUMAN` + session resume.

**Deferred:** Task file schema, Beads, live run validation with Ollama Cloud auth.

**Next:** Delete `prototype/sandcastle/` once you've driven the TUI and validated escalation; keep `packages/orchestrator`.
