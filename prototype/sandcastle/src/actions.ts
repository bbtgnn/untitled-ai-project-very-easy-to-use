import {
  createWorktree,
  type CreateWorktreeOptions,
  type Worktree,
  type WorktreeInteractiveOptions,
  type WorktreeRunOptions,
} from "@ai-hero/sandcastle";
import { failAction, withAction } from "./action-utils.ts";
import { COMPLETE_SIGNAL, ESCALATION_SIGNAL } from "./constants.ts";
import { type PrototypeState } from "./state.ts";

const RUN_DEFAULTS = {
  maxIterations: 1,
  completionSignal: [COMPLETE_SIGNAL, ESCALATION_SIGNAL],
} satisfies Pick<WorktreeRunOptions, "maxIterations" | "completionSignal">;

export type RunActionOptions = Omit<
  WorktreeRunOptions,
  "completionSignal" | "maxIterations"
>;

function withRunDefaults(options: RunActionOptions): WorktreeRunOptions {
  return { ...RUN_DEFAULTS, ...options };
}

export type RunOutcome = {
  kind: "complete" | "escalated";
  branch: string;
  commits: { sha: string }[];
  completionSignal?: string;
  sessionId?: string;
  stdoutPreview: string;
};

export function toRunOutcome(
  result: Awaited<ReturnType<Worktree["run"]>>,
): RunOutcome {
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

function escalationFrom(outcome: RunOutcome) {
  return outcome.kind === "escalated" && outcome.sessionId
    ? { sessionId: outcome.sessionId }
    : null;
}

export async function executeOpenWorktree(
  state: PrototypeState,
  options: CreateWorktreeOptions,
): Promise<{ state: PrototypeState; worktree: Worktree | null }> {
  let opened: Worktree | null = null;
  const nextState = await withAction(state, "open-worktree", async () => {
    opened = await createWorktree(options);
    return {
      worktreePath: opened.worktreePath,
      lastResult: { branch: opened.branch, worktreePath: opened.worktreePath },
    };
  });

  return { state: nextState, worktree: opened };
}

export async function executeRun(
  state: PrototypeState,
  worktree: Worktree,
  options: RunActionOptions,
): Promise<PrototypeState> {
  return withAction(
    state,
    "run",
    async () => {
      const outcome = toRunOutcome(await worktree.run(withRunDefaults(options)));
      return {
        worktreePath: worktree.worktreePath,
        pendingEscalation: escalationFrom(outcome),
        lastResult: { ...outcome },
      };
    },
    { running: true },
  );
}

export async function executeResume(
  state: PrototypeState,
  worktree: Worktree,
  options: RunActionOptions,
): Promise<PrototypeState> {
  const running = { ...state, running: true, lastError: null, lastResult: null };

  if (!state.pendingEscalation) {
    return failAction(
      running,
      "resume",
      "No pending escalation — run must emit NEEDS_HUMAN first.",
    );
  }

  return withAction(running, "resume", async () => {
    const outcome = toRunOutcome(await worktree.run(withRunDefaults(options)));
    return {
      pendingEscalation: escalationFrom(outcome),
      lastResult: { ...outcome },
    };
  });
}

export async function executeInteractive(
  state: PrototypeState,
  worktree: Worktree,
  options: WorktreeInteractiveOptions,
): Promise<PrototypeState> {
  return withAction(
    state,
    "interactive",
    async () => {
      const result = await worktree.interactive(options);
      return {
        worktreePath: worktree.worktreePath,
        lastResult: {
          branch: worktree.branch,
          commits: result.commits ?? [],
          sessionId: "sessionId" in result ? result.sessionId : null,
        },
      };
    },
    { running: true },
  );
}

export async function executeDismiss(
  state: PrototypeState,
  worktree: Worktree,
): Promise<PrototypeState> {
  return withAction(state, "dismiss", async () => {
    const closeResult = await worktree.close();
    return {
      worktreePath: null,
      pendingEscalation: null,
      lastResult: {
        preservedWorktreePath: closeResult.preservedWorktreePath ?? null,
      },
    };
  });
}
