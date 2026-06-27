export type RunStatus = "succeeded" | "failed" | "running";
export type NodeStatus = "succeeded" | "failed" | "running" | "skipped";

export interface NodeExecution {
  id: string;
  nodeName: string;
  nodeType: string;
  status: NodeStatus;
  startedAt: string;
  finishedAt: string | null;
  payload: unknown;
}

export interface Run {
  id: string;
  title: string;
  status: RunStatus;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string | null;
  nodes: NodeExecution[];
}
