# Agent Orchestration Monorepo

An orchestration harness: Sandcastle is the spine, app packages are thin targets for agents to work against.

## Language

**Orchestration harness**:
A repo whose primary job is to drive AI coding agents via Sandcastle — not to ship a product (yet).
_Avoid_: platform, framework

**Orchestrator**:
The TypeScript package (`packages/orchestrator`) that owns the escalation loop, worktree lifecycle, and Sandcastle API calls. `.sandcastle/main.ts` is a thin runner that imports from it.
_Avoid_: harness, runner, main

**Target app**:
An app package in the monorepo that agents modify — the thing being built, not the thing doing the building. Currently `apps/web`.
_Avoid_: host app, main project

**Run**:
An AFK agent invocation via Sandcastle's `run()` — the orchestrator drives the agent to completion and collects commits. Runs execute in a **Podman sandbox**. A run may occasionally need human input; that is a known edge case, not the default path. Always **human-triggered** — no auto-queue or CI triggers yet.
_Avoid_: batch, job, task (too generic)

**Interactive session**:
A human-in-the-loop agent session via Sandcastle's `interactive()` with **no sandbox** — for conversation, exploration, and research on the host worktree. Optional, not a prerequisite for a **Run**; also used during **Escalation**.
_Avoid_: chat, REPL, planning gate

**Sandbox**:
The isolated environment where an agent executes. This repo uses Podman for runs and none for interactive sessions.
_Avoid_: container, VM (unless referring to the provider specifically)

**Podman sandbox**:
The default sandbox provider for runs — rootless, bind-mounted worktree isolation.
_Avoid_: Docker (for runs — init may still scaffold Docker artifacts until re-inited for Podman)

**Worktree**:
A git worktree Sandcastle creates when using branch or merge-to-head strategies — the agent's working copy, separate from the host checkout. The orchestrator anchors on `createWorktree()` — a stable handle for interactive sessions, runs, escalation, and session resume on the same branch.
_Avoid_: workspace, clone

**Host repo**:
The monorepo checkout on the developer's machine — the anchor for `.sandcastle/` artifacts and git operations.
_Avoid_: main repo, root project

**Branch strategy**:
How agent commits relate to git branches. This repo uses **branch** — each run targets an explicitly named branch in a worktree (e.g. `agent/42-fix-login`). Agent work stays isolated until a human merges or discards it.
_Avoid_: merge-to-head, head (as default strategy names)

**Agent branch**:
The git branch a **Run** commits to. Named `agent/{tracker-id}-{slug}` — tracker ID for traceability, slug for readability.
_Avoid_: feature branch, agent branch (as a generic label)

**Task**:
A unit of agent work tracked as a flat markdown file — minimal, git-native, no formal schema yet. Structure and parsing conventions are deferred.
_Avoid_: issue, ticket, bead

**Beads**:
A graph-based issue tracker (Dolt-backed) with dependency tracking and multi-agent claim semantics. Consider later for parallel planner workflows — not the default here due to setup overhead and sandbox integration friction.
_Avoid_: bd, tracker

**Escalation**:
When a **Run** hits a blocking question, the orchestrator promotes to an **Interactive session** on the same worktree and branch — the human answers, then the **Run** resumes. Partial agent work is preserved.
_Avoid_: fail-fast, handoff, ping

**Escalation signal**:
An explicit tag the agent emits in stdout (e.g. `<promise>NEEDS_HUMAN</promise>`) to tell the orchestrator a run is blocked. Detected via Sandcastle's `completionSignal`; not inferred from heuristics.
_Avoid_: timeout, blocked status, needs-input

**Complete signal**:
The tag a **Run** emits when finished: Sandcastle's default `<promise>COMPLETE</promise>`. Paired with **Escalation signal** — two signals, no custom success vocabulary.
_Avoid_: TASK_DONE, DONE, finished

**Session resume**:
After **Escalation**, the orchestrator resumes the blocked **Run** via `resumeSession` — same agent session, human's answer injected as the next prompt. Preserves in-context reasoning from before the block.
_Avoid_: restart, new run, re-run

**Worktree dismissal**:
The human-controlled moment when a **Worktree** is closed via `wt.close()`. Happens after the human merges (or discards) the **Agent branch** — not automatically on run complete.
_Avoid_: cleanup, teardown, auto-close

**Merge target**:
The branch the human chooses to integrate an **Agent branch** into. No fixed trunk or per-app default — the human picks at merge time (typically whatever they have checked out in the **Host repo**).
_Avoid_: main, trunk, integration branch
