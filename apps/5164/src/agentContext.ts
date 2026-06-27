import type { ChatMessage, NodeExecution } from "./types";

const MAX_PAYLOAD_CHARS = 1200;

function stringifyPayload(value: unknown): string {
  if (value === null || value === undefined) return "(none)";
  let text: string;
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  if (text.length > MAX_PAYLOAD_CHARS) {
    return `${text.slice(0, MAX_PAYLOAD_CHARS)}\n… (truncated)`;
  }
  return text;
}

/**
 * Build the structured context message handed to the agent when an operator
 * clicks "Send to Agent". Pure and deterministic so the chat panel and the
 * tests share exactly one definition of what gets sent.
 */
export function buildAgentContext(exec: NodeExecution): string {
  return [
    `Execution \`${exec.id}\` on node **${exec.nodeName}** (${exec.nodeType}) finished with status: ${exec.status.toUpperCase()}.`,
    "",
    "Error:",
    "```",
    exec.error ?? "(no error message)",
    "```",
    "",
    "Input:",
    "```json",
    stringifyPayload(exec.input),
    "```",
    "",
    "Output:",
    "```json",
    stringifyPayload(exec.output),
    "```",
    "",
    "Fix this.",
  ].join("\n");
}

let seq = 0;

/** Materialize the agent-context string into a chat message bound to its source execution. */
export function executionToMessage(exec: NodeExecution): ChatMessage {
  seq += 1;
  return {
    id: `ctx_${exec.id}_${seq}`,
    role: "system",
    text: buildAgentContext(exec),
    fromExecutionId: exec.id,
  };
}
