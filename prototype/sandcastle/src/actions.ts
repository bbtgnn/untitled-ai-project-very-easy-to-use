import { createWorktree, type Worktree } from "@ai-hero/sandcastle";
import { failAction, withAction } from "./action-utils.ts";
import {
  interactiveOptions,
  prepare,
  resumePrompt,
  runOptions,
  toRunOutcome,
  type RunOutcome,
} from "./sandcastle-config.ts";
import { repoRoot, type PrototypeState } from "./state.ts";

const RUN_PROMPT =
  "PROTOTYPE TASK: Create or update prototype/sandcastle/PROTOTYPE_MARKER.txt with a single line: run-ok. Commit the change. Emit <promise>COMPLETE</promise> when done, or <promise>NEEDS_HUMAN</promise> if blocked.";

const INTERACTIVE_PROMPT =
  "PROTOTYPE: explore the repo — conversation, exploration, research. Exit when done.";

function escalationFrom(outcome: RunOutcome) {
  return outcome.kind === "escalated" && outcome.sessionId
    ? { sessionId: outcome.sessionId }
    : null;
}

export async function executeOpenWorktree(
  state: PrototypeState,
): Promise<{ state: PrototypeState; worktree: Worktree | null }> {
  let opened: Worktree | null = null;
  const nextState = await withAction(state, "open-worktree", async () => {
    prepare(repoRoot);
    opened = await createWorktree({
      branchStrategy: { type: "branch", branch: state.branch },
      cwd: repoRoot,
    });
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
): Promise<PrototypeState> {
  return withAction(
    state,
    "run",
    async () => {
      const outcome = toRunOutcome(
        await worktree.run(runOptions(RUN_PROMPT)),
      );
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
  humanAnswer: string,
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
    const sessionId = state.pendingEscalation!.sessionId;
    const outcome = toRunOutcome(
      await worktree.run(runOptions(resumePrompt(humanAnswer), sessionId)),
    );
    return {
      pendingEscalation: escalationFrom(outcome),
      lastResult: { ...outcome },
    };
  });
}

export async function executeInteractive(
  state: PrototypeState,
  worktree: Worktree,
): Promise<PrototypeState> {
  return withAction(
    state,
    "interactive",
    async () => {
      const result = await worktree.interactive(
        interactiveOptions(INTERACTIVE_PROMPT),
      );
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
