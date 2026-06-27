export type ExecutionStatus = "failed" | "succeeded" | "running" | "cancelled";

export interface NodeExecution {
  id: string;
  nodeName: string;
  nodeType: string;
  status: ExecutionStatus;
  startedAt: string;
  durationMs: number;
  input: unknown;
  output: unknown;
  error: string | null;
}

export type ChatRole = "system" | "user" | "agent";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  fromExecutionId?: string;
}
