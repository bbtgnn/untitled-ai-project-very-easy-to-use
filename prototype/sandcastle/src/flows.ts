import { fileURLToPath } from "node:url";
import { claudeCode, interactive, run } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { podman } from "@ai-hero/sandcastle/sandboxes/podman";

export type PrototypeState = {
  runSandbox: "podman";
  interactiveSandbox: "no-sandbox";
  lastAction: string | null;
  lastResult: Record<string, unknown> | null;
  lastError: string | null;
  running: boolean;
};

export const initialState = (): PrototypeState => ({
  runSandbox: "podman",
  interactiveSandbox: "no-sandbox",
  lastAction: null,
  lastResult: null,
  lastError: null,
  running: false,
});

const agent = () => claudeCode("claude-sonnet-4-6");

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

export async function executeRun(state: PrototypeState): Promise<PrototypeState> {
  const next = { ...state, running: true, lastError: null, lastResult: null };
  try {
    const result = await run({
      agent: agent(),
      sandbox: podman(),
      cwd: repoRoot,
      prompt:
        "PROTOTYPE TASK: Create or update prototype/sandcastle/PROTOTYPE_MARKER.txt with a single line: run-ok. Commit the change. Emit <promise>COMPLETE</promise> when done.",
      branchStrategy: { type: "branch", branch: "prototype/sandcastle-run" },
      maxIterations: 1,
      logging: { type: "stdout" },
      name: "prototype-run",
    });

    return {
      ...next,
      running: false,
      lastAction: "run",
      lastResult: {
        sandbox: state.runSandbox,
        branch: result.branch,
        commits: result.commits,
        iterations: result.iterations.length,
        completionSignal: result.completionSignal ?? null,
        stdoutPreview: result.stdout.slice(-500),
      },
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

export async function executeInteractive(state: PrototypeState): Promise<PrototypeState> {
  const next = { ...state, running: true, lastError: null, lastResult: null };
  try {
    const result = await interactive({
      agent: agent(),
      sandbox: noSandbox(),
      cwd: repoRoot,
      prompt:
        "PROTOTYPE: explore the repo — conversation, exploration, research. Exit when done.",
      name: "prototype-interactive",
    });

    return {
      ...next,
      running: false,
      lastAction: "interactive",
      lastResult: {
        sandbox: state.interactiveSandbox,
        branch: result.branch ?? null,
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
