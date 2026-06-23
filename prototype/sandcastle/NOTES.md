# Verdict

**Question:** Does the basic Sandcastle orchestration model (`run` vs `interactive`) fit this bun monorepo?

**Answer:** Yes — with `createWorktree()` as the anchor, Podman for runs, no-sandbox for interactive, and escalation via `NEEDS_HUMAN` + session resume.

**Standalone prototype:** Logic split by layer under `src/` (see README). When validated, fold into `packages/orchestrator` and delete this folder.

**Deferred:** Task file schema, Beads, full escalation loop validation end-to-end.

**Next:** Drive the TUI (`w` → `r` → optional `a`), update this verdict, then delete `prototype/sandcastle/`.
