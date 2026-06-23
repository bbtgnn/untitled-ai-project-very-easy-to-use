import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_MODEL } from "./constants.ts";

/** Load `.sandcastle/.env` into `process.env`. File values win over pre-set shell env. */
export function loadSandcastleEnv(cwd: string): void {
  const envPath = join(cwd, ".sandcastle", ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

export function setupPiAuth(cwd: string): void {
  const script = join(cwd, ".sandcastle", "setup-pi-auth.mjs");
  if (!existsSync(script)) return;

  const result = spawnSync(process.execPath, [script], {
    env: process.env,
    stdio: "pipe",
  });

  if (result.status !== 0) {
    const detail = result.stderr?.toString().trim() || "unknown error";
    throw new Error(`setup-pi-auth.mjs failed: ${detail}`);
  }
}

export function modelFromEnv(): string {
  return process.env.OLLAMA_CLOUD_MODEL ?? DEFAULT_MODEL;
}
