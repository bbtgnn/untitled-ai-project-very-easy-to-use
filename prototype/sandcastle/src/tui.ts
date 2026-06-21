import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  executeDismiss,
  executeInteractive,
  executeOpenWorktree,
  executeResume,
  executeRun,
  initialState,
  type PrototypeState,
} from "./flows.ts";

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

function render(state: PrototypeState) {
  console.clear();
  console.log(bold("Sandcastle prototype"));
  console.log(dim("createWorktree() anchor — run / interactive / escalation\n"));

  console.log(bold("State"));
  console.log(`  branch:             ${state.branch}`);
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

async function main() {
  let state = initialState();
  const rl = readline.createInterface({ input, output });

  render(state);

  while (true) {
    const key = (await rl.question("\n> ")).trim().toLowerCase();

    if (key === "q") break;

    if (key === "w") {
      state = await executeOpenWorktree(state);
      render(state);
      continue;
    }

    if (key === "r") {
      render({ ...state, running: true });
      state = await executeRun(state);
      render(state);
      continue;
    }

    if (key === "i") {
      render({ ...state, running: true });
      state = await executeInteractive(state);
      render(state);
      continue;
    }

    if (key === "a") {
      if (!state.pendingEscalation) {
        console.log(dim("No pending escalation."));
        continue;
      }
      const answer = await rl.question("Human answer: ");
      render({ ...state, running: true });
      state = await executeResume(state, answer);
      render(state);
      continue;
    }

    if (key === "d") {
      state = await executeDismiss(state);
      render(state);
      continue;
    }

    console.log(dim("Unknown key. Use w, r, i, a, d, or q."));
  }

  rl.close();
}

main();
