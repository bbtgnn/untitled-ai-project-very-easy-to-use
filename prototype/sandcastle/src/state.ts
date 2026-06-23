import { fileURLToPath } from "node:url";
import { agentBranch } from "./constants.ts";

export type PrototypeState = {
  branch: string;
  worktreePath: string | null;
  pendingEscalation: { sessionId: string } | null;
  lastAction: string | null;
  lastResult: Record<string, unknown> | null;
  lastError: string | null;
  running: boolean;
};

export const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

export const initialState = (): PrototypeState => ({
  branch: agentBranch("prototype", "sandcastle"),
  worktreePath: null,
  pendingEscalation: null,
  lastAction: null,
  lastResult: null,
  lastError: null,
  running: false,
});
