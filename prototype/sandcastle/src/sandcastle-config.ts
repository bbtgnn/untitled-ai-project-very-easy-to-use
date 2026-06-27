import {
  InteractiveOptions,
  pi,
  type WorktreeRunOptions,
} from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { podman } from "@ai-hero/sandcastle/sandboxes/podman";
import { loadSandcastleEnv, modelFromEnv, setupPiAuth } from "./env.ts";
import { RunActionOptions } from "./actions.ts";

const PI_AUTH_SETUP = "node /home/agent/setup-pi-auth.mjs";

const agent = () => pi(modelFromEnv());

export const prepare = (cwd: string) => {
  loadSandcastleEnv(cwd);
  setupPiAuth(cwd);
};

export const runOptions = (
  prompt: string,
  resumeSession?: string,
): RunActionOptions => ({
  agent: agent(),
  sandbox: podman(),
  prompt,
  logging: { type: "stdout" },
  hooks: { sandbox: { onSandboxReady: [{ command: PI_AUTH_SETUP }] } },
  name: resumeSession ? "orchestrator-resume" : "orchestrator-run",
  ...(resumeSession ? { resumeSession } : {}),
});

export const interactiveOptions = (prompt: string): InteractiveOptions => ({
  agent: agent(),
  sandbox: noSandbox(),
  prompt,
  name: "orchestrator-interactive",
});
