export const COMPLETE_SIGNAL = "<promise>COMPLETE</promise>";
export const ESCALATION_SIGNAL = "<promise>NEEDS_HUMAN</promise>";
export const DEFAULT_MODEL = "ollama-cloud/qwen3-coder-next";

export function agentBranch(trackerId: string, slug: string): string {
  return `agent/${trackerId}-${slug}`;
}
