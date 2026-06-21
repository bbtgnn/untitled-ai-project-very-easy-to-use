# Roadmap

## Fundamental principle

This app is designed to work with **multiple AI coding workflows**. Each workflow has its own conventions, artifacts, and markdown formats. The orchestrator must eventually understand and route work from any of them — but **not in the prototype**.

### Supported workflows (target, not prototype scope)

| Workflow | Repository |
|----------|------------|
| Superpowers | https://github.com/obra/superpowers |
| Compound Engineering | https://github.com/everyinc/compound-engineering-plugin |
| Get Shit Done (GSD) | https://github.com/open-gsd/gsd-core |

Each workflow produces its own kind of markdown (plans, specs, task lists, etc.). Different workflows → different markdown shapes → different issue-creation logic.

---

## Prototype decision (v1)

**Use plain markdown. Ignore structure.**

- Tasks live as markdown files (see **Task** in [CONTEXT.md](../CONTEXT.md)).
- Do not parse, validate, or normalize markdown format.
- Do not build workflow-specific adapters yet.
- Hardcode whatever minimal paths/conventions the prototype needs.

The prototype validates Sandcastle orchestration (`run` vs `interactive`, sandbox, escalation) — not multi-workflow compatibility.

---

## Out of scope (prototype)

- Workflow detection or routing
- Parsing workflow-specific markdown (Superpowers plans, GSD phases, Compound specs, etc.)
- Dynamic issue creation from arbitrary markdown shapes
- LLM-backed adapter generation

---

## Future / v2 (TODO — nice to have)

### Workflow adapters

For each supported workflow, build an **adapter** that:

1. Reads that workflow's markdown artifacts
2. Maps them to this repo's **Task** format (`tasks/{id}-{slug}.md`)
3. Creates or updates issues accordingly

Start with **hardcoded adapters** for one workflow; generalize later.

### LLM-backed adapter service (exploratory)

A service that **writes adapters on the fly** for new workflow products:

- Input: sample markdown + workflow metadata
- Output: adapter logic or config that maps artifacts → tasks
- Use when a workflow has no hand-written adapter yet

Treat as v2+ — only after the hardcoded path proves the model.

---

## Implementation guidance for agents

When working on the **prototype**:

1. Assume markdown is opaque text — no schema, no AST, no workflow-specific parsers.
2. Do not block prototype work on adapter design or multi-workflow support.
3. If you need task data, use the existing hardcoded `tasks/` convention.
4. When you encounter workflow-specific markdown, note it under **Future / v2** — do not implement adapters unless explicitly asked.

When working on **v2+**:

1. Pick one workflow first; ship a hardcoded adapter end-to-end.
2. Extract a shared adapter interface only after two adapters exist.
3. Consider the LLM-backed service only when manual adapters don't scale.

---

## Summary

| | Prototype (now) | v2+ (later) |
|---|----------------|-------------|
| Markdown | Plain files, structure ignored | Parsed per workflow |
| Workflows | One implicit convention | Superpowers, Compound, GSD, … |
| Issue creation | Hardcoded / manual | Per-workflow adapters |
| New workflows | N/A | Hardcoded first, then LLM-assisted adapters |
