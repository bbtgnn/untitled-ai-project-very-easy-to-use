import { fileURLToPath } from "node:url";
import { agentBranch, runOnWorktree, openWorktree } from "@repo/orchestrator";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const branch = agentBranch(process.argv[2] ?? "manual", process.argv[3] ?? "run");
const prompt =
  process.argv[4] ??
  "Human-triggered run via .sandcastle/main.ts. Emit <promise>COMPLETE</promise> when done.";

await using wt = await openWorktree({ cwd: repoRoot, branch });
const outcome = await runOnWorktree(wt, prompt);

console.log(JSON.stringify(outcome, null, 2));
