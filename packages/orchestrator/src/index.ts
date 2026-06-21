import { createWorktree, pi, type Worktree } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { podman } from "@ai-hero/sandcastle/sandboxes/podman";
import { COMPLETE_SIGNAL, ESCALATION_SIGNAL } from "./constants.ts";
import { loadSandcastleEnv, modelFromEnv, setupPiAuth } from "./env.ts";

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
  completionSignal: [COMPLETE_SIGNAL, ESCALATION_SIGNAL] as const,
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

export { agentBranch, COMPLETE_SIGNAL, DEFAULT_MODEL, ESCALATION_SIGNAL } from "./constants.ts";
