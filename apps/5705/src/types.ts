export type NodeKind = "trigger" | "action" | "filter" | "approval";

/** A node on the canvas. `requiredConfig` lists config keys this kind must set;
 *  `config` is what the author actually filled in. */
export interface CanvasNode {
  id: string;
  label: string;
  kind: NodeKind;
  requiredConfig: string[];
  config: Record<string, string>;
}

/** A directed edge from one node to another (`from` → `to`). */
export interface CanvasEdge {
  from: string;
  to: string;
}

export interface Canvas {
  name: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export type WarningKind =
  | "no-incoming-edge"
  | "missing-upstream"
  | "required-config-missing";

export type Severity = "error" | "warning";

/** One detected misconfiguration. `nodeIds` are the nodes this warning is about —
 *  the UI renders each as a node-mention chip. */
export interface Warning {
  id: string;
  kind: WarningKind;
  severity: Severity;
  title: string;
  detail: string;
  nodeIds: string[];
}
