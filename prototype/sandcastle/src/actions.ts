import type { Worktree } from "@ai-hero/sandcastle";
import {
  dismissWorktree,
  interactiveOnWorktree,
  openWorktree,
  resumeRunOnWorktree,
  runOnWorktree,
  type RunOutcome,
} from "./orchestrator.ts";
import { repoRoot, type PrototypeState } from "./state.ts";

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
