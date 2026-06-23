import type { PrototypeState } from "./state.ts";

export type ActionPatch = Partial<
  Pick<PrototypeState, "worktreePath" | "pendingEscalation" | "lastResult">
>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Immediate failure without running async work (e.g. guard clauses). */
export function failAction(
  state: PrototypeState,
  action: string,
  message: string,
): PrototypeState {
  return {
    ...state,
    running: false,
    lastAction: action,
    lastError: message,
  };
}

/**
 * Run an async handler with consistent state updates:
 * - optional `running` prep (clears lastError/lastResult)
 * - success → lastAction, lastError: null, patch merged
 * - throw → lastAction, lastError from caught value
 */
export async function withAction(
  state: PrototypeState,
  action: string,
  fn: () => Promise<ActionPatch | void>,
  options: { running?: boolean } = {},
): Promise<PrototypeState> {
  const base: PrototypeState = options.running
    ? { ...state, running: true, lastError: null, lastResult: null }
    : state;

  try {
    const patch = (await fn()) ?? {};
    return {
      ...base,
      running: false,
      lastAction: action,
      lastError: null,
      ...patch,
    };
  } catch (error) {
    return failAction(base, action, errorMessage(error));
  }
}
