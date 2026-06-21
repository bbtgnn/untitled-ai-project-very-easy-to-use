import { fileURLToPath } from "node:url";
import type { Worktree } from "@ai-hero/sandcastle";
import {
  agentBranch,
  dismissWorktree,
  interactiveOnWorktree,
  openWorktree,
  resumeRunOnWorktree,
  runOnWorktree,
  type RunOutcome,
} from "@repo/orchestrator";

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

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

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
    const outcome = await runOnWorktree(
      wt,
      "PROTOTYPE TASK: Create or update prototype/sandcastle/PROTOTYPE_MARKER.txt with a single line: run-ok. Commit the change. Emit <promise>COMPLETE</promise> when done, or <promise>NEEDS_HUMAN</promise> if blocked.",
    );

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
    const result = await interactiveOnWorktree(
      wt,
      "PROTOTYPE: explore the repo — conversation, exploration, research. Exit when done.",
    );

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
