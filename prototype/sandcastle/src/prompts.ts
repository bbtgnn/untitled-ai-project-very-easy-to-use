import { COMPLETE_SIGNAL, ESCALATION_SIGNAL } from "./constants.ts";

export const RUN_PROMPT = `PROTOTYPE TASK: Create or update prototype/sandcastle/PROTOTYPE_MARKER.txt with a single line: run-ok. Commit the change. Emit ${COMPLETE_SIGNAL} when done, or ${ESCALATION_SIGNAL} if blocked.`;

export const INTERACTIVE_PROMPT =
  "PROTOTYPE: explore the repo — conversation, exploration, research. Exit when done.";

export const resumePrompt = (humanAnswer: string) =>
  `Human answered: ${humanAnswer}\n\nContinue the task. Emit ${COMPLETE_SIGNAL} when done, or ${ESCALATION_SIGNAL} if still blocked.`;
