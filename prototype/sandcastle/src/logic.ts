/**
 * Standalone Sandcastle orchestration logic — PROTOTYPE, delete when done.
 *
 * Question: Does createWorktree() + run / interactive / escalation fit this model?
 * All orchestrator logic lives here (no @repo/orchestrator). TUI is in tui.ts.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createWorktree, pi, type Worktree } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { podman } from "@ai-hero/sandcastle/sandboxes/podman";

// --- Constants ---

export const COMPLETE_SIGNAL = "<promise>COMPLETE</promise>";
export const ESCALATION_SIGNAL = "<promise>NEEDS_HUMAN</promise>";
export const DEFAULT_MODEL = "ollama-cloud/qwen3-coder-next";

export function agentBranch(trackerId: string, slug: string): string {
  return `agent/${trackerId}-${slug}`;
}

// --- Env ---

/** Load `.sandcastle/.env` into `process.env`. File values win over pre-set shell env. */
export function loadSandcastleEnv(cwd: string): void {
  const envPath = join(cwd, ".sandcastle", ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

export function setupPiAuth(cwd: string): void {
  const script = join(cwd, ".sandcastle", "setup-pi-auth.mjs");
  if (!existsSync(script)) return;

  const result = spawnSync(process.execPath, [script], {
    env: process.env,
    stdio: "pipe",
  });

  if (result.status !== 0) {
    const detail = result.stderr?.toString().trim() || "unknown error";
    throw new Error(`setup-pi-auth.mjs failed: ${detail}`);
  }
}

export function modelFromEnv(): string {
  return process.env.OLLAMA_CLOUD_MODEL ?? DEFAULT_MODEL;
}

// --- Orchestrator types ---

export type OrchestratorConfig = {
  cwd: string;
  branch: string;
};

export type RunOutcome = {
  kind: "complete" | "escalated";
  branch: string;
  commits: { sha: string }[];
  completionSignal?: string;
  sessionId?: string;
  stdoutPreview: string;
};

const PI_AUTH_SETUP = "node /home/agent/setup-pi-auth.mjs";

const agent = () => pi(modelFromEnv());

const prepare = (cwd: string) => {
  loadSandcastleEnv(cwd);
  setupPiAuth(cwd);
};

const runOptions = (prompt: string, resumeSession?: string) => ({
  agent: agent(),
  sandbox: podman(),
  prompt,
  maxIterations: 1,
  completionSignal: [COMPLETE_SIGNAL, ESCALATION_SIGNAL],
  logging: { type: "stdout" as const },
  hooks: { sandbox: { onSandboxReady: [{ command: PI_AUTH_SETUP }] } },
  name: resumeSession ? "orchestrator-resume" : "orchestrator-run",
  ...(resumeSession ? { resumeSession } : {}),
});

function toRunOutcome(result: Awaited<ReturnType<Worktree["run"]>>): RunOutcome {
  const lastIteration = result.iterations.at(-1);
  return {
    kind:
      result.completionSignal === ESCALATION_SIGNAL ? "escalated" : "complete",
    branch: result.branch,
    commits: result.commits,
    completionSignal: result.completionSignal,
    sessionId: lastIteration?.sessionId,
    stdoutPreview: result.stdout.slice(-500),
  };
}

export async function openWorktree(config: OrchestratorConfig) {
  prepare(config.cwd);
  return createWorktree({
    branchStrategy: { type: "branch", branch: config.branch },
    cwd: config.cwd,
  });
}

export async function runOnWorktree(
  wt: Worktree,
  prompt: string,
): Promise<RunOutcome> {
  const result = await wt.run(runOptions(prompt));
  return toRunOutcome(result);
}

export async function resumeRunOnWorktree(
  wt: Worktree,
  sessionId: string,
  humanAnswer: string,
): Promise<RunOutcome> {
  const result = await wt.run(
    runOptions(
      `Human answered: ${humanAnswer}\n\nContinue the task. Emit ${COMPLETE_SIGNAL} when done, or ${ESCALATION_SIGNAL} if still blocked.`,
      sessionId,
    ),
  );
  return toRunOutcome(result);
}

export async function interactiveOnWorktree(wt: Worktree, prompt: string) {
  return wt.interactive({
    agent: agent(),
    sandbox: noSandbox(),
    prompt,
    name: "orchestrator-interactive",
  });
}

export async function dismissWorktree(wt: Worktree) {
  return wt.close();
}

// --- Prototype state ---

export type PrototypeState = {
  branch: string;
  worktreePath: string | null;
  pendingEscalation: { sessionId: string } | null;
  lastAction: string | null;
  lastResult: Record<string, unknown> | null;
  lastError: string | null;
  running: boolean;
};

export const initialState = (): PrototypeState => ({
  branch: agentBranch("prototype", "sandcastle"),
  worktreePath: null,
  pendingEscalation: null,
  lastAction: null,
  lastResult: null,
  lastError: null,
  running: false,
});

export const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

const RUN_PROMPT =
  "PROTOTYPE TASK: Create or update prototype/sandcastle/PROTOTYPE_MARKER.txt with a single line: run-ok. Commit the change. Emit <promise>COMPLETE</promise> when done, or <promise>NEEDS_HUMAN</promise> if blocked.";

const INTERACTIVE_PROMPT =
  "PROTOTYPE: explore the repo — conversation, exploration, research. Exit when done.";

let worktree: Worktree | null = null;

async function ensureWorktree(state: PrototypeState): Promise<Worktree> {
  if (worktree) return worktree;
  worktree = await openWorktree({ cwd: repoRoot, branch: state.branch });
  return worktree;
}

function runResultPayload(outcome: RunOutcome) {
  return {
    kind: outcome.kind,
    branch: outcome.branch,
    commits: outcome.commits,
    completionSignal: outcome.completionSignal ?? null,
    sessionId: outcome.sessionId ?? null,
    stdoutPreview: outcome.stdoutPreview,
  };
}

// --- Prototype actions ---

export async function executeOpenWorktree(
  state: PrototypeState,
): Promise<PrototypeState> {
  try {
    const wt = await ensureWorktree(state);
    return {
      ...state,
      worktreePath: wt.worktreePath,
      lastAction: "open-worktree",
      lastError: null,
      lastResult: { branch: wt.branch, worktreePath: wt.worktreePath },
    };
  } catch (error) {
    return {
      ...state,
      lastAction: "open-worktree",
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function executeRun(state: PrototypeState): Promise<PrototypeState> {
  const next = { ...state, running: true, lastError: null, lastResult: null };
  try {
    const wt = await ensureWorktree(next);
    const outcome = await runOnWorktree(wt, RUN_PROMPT);

    return {
      ...next,
      running: false,
      worktreePath: wt.worktreePath,
      pendingEscalation:
        outcome.kind === "escalated" && outcome.sessionId
          ? { sessionId: outcome.sessionId }
          : null,
      lastAction: "run",
      lastResult: runResultPayload(outcome),
    };
  } catch (error) {
    return {
      ...next,
      running: false,
      lastAction: "run",
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function executeResume(
  state: PrototypeState,
  humanAnswer: string,
): Promise<PrototypeState> {
  const next = { ...state, running: true, lastError: null, lastResult: null };
  if (!worktree || !state.pendingEscalation) {
    return {
      ...next,
      running: false,
      lastAction: "resume",
      lastError: "No pending escalation — run must emit NEEDS_HUMAN first.",
    };
  }

  try {
    const outcome = await resumeRunOnWorktree(
      worktree,
      state.pendingEscalation.sessionId,
      humanAnswer,
    );

    return {
      ...next,
      running: false,
      pendingEscalation:
        outcome.kind === "escalated" && outcome.sessionId
          ? { sessionId: outcome.sessionId }
          : null,
      lastAction: "resume",
      lastResult: runResultPayload(outcome),
    };
  } catch (error) {
    return {
      ...next,
      running: false,
      lastAction: "resume",
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function executeInteractive(
  state: PrototypeState,
): Promise<PrototypeState> {
  const next = { ...state, running: true, lastError: null, lastResult: null };
  try {
    const wt = await ensureWorktree(next);
    const result = await interactiveOnWorktree(wt, INTERACTIVE_PROMPT);

    return {
      ...next,
      running: false,
      worktreePath: wt.worktreePath,
      lastAction: "interactive",
      lastResult: {
        branch: wt.branch,
        commits: result.commits ?? [],
        sessionId: "sessionId" in result ? result.sessionId : null,
      },
    };
  } catch (error) {
    return {
      ...next,
      running: false,
      lastAction: "interactive",
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function executeDismiss(
  state: PrototypeState,
): Promise<PrototypeState> {
  if (!worktree) {
    return {
      ...state,
      lastAction: "dismiss",
      lastError: "No open worktree.",
    };
  }

  try {
    const closeResult = await dismissWorktree(worktree);
    worktree = null;
    return {
      ...state,
      worktreePath: null,
      pendingEscalation: null,
      lastAction: "dismiss",
      lastError: null,
      lastResult: {
        preservedWorktreePath: closeResult.preservedWorktreePath ?? null,
      },
    };
  } catch (error) {
    return {
      ...state,
      lastAction: "dismiss",
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}
