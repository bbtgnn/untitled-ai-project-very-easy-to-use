import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  executeInteractive,
  executeRun,
  initialState,
  type PrototypeState,
} from "./flows.ts";

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

function render(state: PrototypeState) {
  console.clear();
  console.log(bold("Sandcastle prototype"));
  console.log(dim("Question: does run() vs interactive() fit this monorepo?\n"));

  console.log(bold("State"));
  console.log(`  run sandbox:          ${state.runSandbox}`);
  console.log(`  interactive sandbox:  ${state.interactiveSandbox}`);
  console.log(`  branch strategy:      branch`);
  console.log(`  running:              ${state.running}`);
  console.log(`  lastAction:           ${state.lastAction ?? dim("(none)")}`);

  if (state.lastError) {
    console.log(`  lastError:            ${state.lastError}`);
  }

  if (state.lastResult) {
    console.log(`  lastResult:`);
    for (const [key, value] of Object.entries(state.lastResult)) {
      console.log(`    ${key}: ${JSON.stringify(value)}`);
    }
  }

  console.log();
  console.log(dim("Keys"));
  console.log(`  ${bold("[r]")} ${dim("run() — AFK agent in Podman")}`);
  console.log(`  ${bold("[i]")} ${dim("interactive() — explore on host, no sandbox")}`);
  console.log(`  ${bold("[q]")} ${dim("quit")}`);
}

async function main() {
  let state = initialState();
  const rl = readline.createInterface({ input, output });

  render(state);

  while (true) {
    const key = (await rl.question("\n> ")).trim().toLowerCase();

    if (key === "q") break;
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

    console.log(dim("Unknown key. Use r, i, or q."));
  }

  rl.close();
}

main();
