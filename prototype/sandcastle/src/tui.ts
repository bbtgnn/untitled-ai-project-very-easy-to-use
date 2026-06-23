import type { Worktree } from "@ai-hero/sandcastle";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  executeDismiss,
  executeInteractive,
  executeOpenWorktree,
  executeResume,
  executeRun,
} from "./actions.ts";
import { initialState, type PrototypeState } from "./state.ts";

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

const NO_WORKTREE = "No open worktree — press [w] first.";

function render(state: PrototypeState, worktree: Worktree | null) {
  console.clear();
  console.log(bold("Sandcastle prototype"));
  console.log(dim("src/actions.ts → sandcastle-config → sandcastle\n"));

  console.log(bold("State"));
  console.log(`  branch:             ${state.branch}`);
  console.log(`  worktree:           ${worktree ? dim("open") : dim("(not open)")}`);
  console.log(`  worktreePath:       ${state.worktreePath ?? dim("(not open)")}`);
  console.log(
    `  pendingEscalation:  ${state.pendingEscalation ? state.pendingEscalation.sessionId : dim("(none)")}`,
  );
  console.log(`  running:            ${state.running}`);
  console.log(`  lastAction:         ${state.lastAction ?? dim("(none)")}`);

  if (state.lastError) {
    console.log(`  lastError:          ${state.lastError}`);
  }

  if (state.lastResult) {
    console.log(`  lastResult:`);
    for (const [key, value] of Object.entries(state.lastResult)) {
      console.log(`    ${key}: ${JSON.stringify(value)}`);
    }
  }

  console.log();
  console.log(dim("Keys"));
  console.log(`  ${bold("[w]")} ${dim("open worktree (createWorktree)")}`);
  console.log(`  ${bold("[r]")} ${dim("wt.run() — pi + Podman + Ollama Cloud")}`);
  console.log(`  ${bold("[i]")} ${dim("wt.interactive() — pi, no sandbox")}`);
  console.log(`  ${bold("[a]")} ${dim("resume after escalation (needs pending session)")}`);
  console.log(`  ${bold("[d]")} ${dim("wt.close() — human dismissal")}`);
  console.log(`  ${bold("[q]")} ${dim("quit")}`);
}

function requireWorktree(worktree: Worktree | null): worktree is Worktree {
  if (!worktree) {
    console.log(dim(NO_WORKTREE));
    return false;
  }
  return true;
}

async function main() {
  let state = initialState();
  let worktree: Worktree | null = null;
  const rl = readline.createInterface({ input, output });

  render(state, worktree);

  while (true) {
    const key = (await rl.question("\n> ")).trim().toLowerCase();

    if (key === "q") break;

    if (key === "w") {
      if (worktree) {
        console.log(dim("Worktree already open."));
        continue;
      }
      const opened = await executeOpenWorktree(state);
      state = opened.state;
      worktree = opened.worktree;
      render(state, worktree);
      continue;
    }

    if (key === "r") {
      if (!requireWorktree(worktree)) continue;
      render({ ...state, running: true }, worktree);
      state = await executeRun(state, worktree);
      render(state, worktree);
      continue;
    }

    if (key === "i") {
      if (!requireWorktree(worktree)) continue;
      render({ ...state, running: true }, worktree);
      state = await executeInteractive(state, worktree);
      render(state, worktree);
      continue;
    }

    if (key === "a") {
      if (!requireWorktree(worktree)) continue;
      if (!state.pendingEscalation) {
        console.log(dim("No pending escalation."));
        continue;
      }
      const answer = await rl.question("Human answer: ");
      render({ ...state, running: true }, worktree);
      state = await executeResume(state, worktree, answer);
      render(state, worktree);
      continue;
    }

    if (key === "d") {
      if (!requireWorktree(worktree)) continue;
      state = await executeDismiss(state, worktree);
      if (!state.lastError) worktree = null;
      render(state, worktree);
      continue;
    }

    console.log(dim("Unknown key. Use w, r, i, a, d, or q."));
  }

  rl.close();
}

main();
