import type { Canvas, CanvasNode, Warning } from "./types";

/** Node kinds that do work and therefore must be reachable to ever execute.
 *  Triggers are entry points (no incoming edge is expected), so they're excluded. */
const EXECUTABLE_KINDS = new Set<CanvasNode["kind"]>(["action", "filter", "approval"]);

/**
 * Audit a canvas graph for misconfigurations that silently break a pipeline.
 * Pure and deterministic — the panel and the tests share one source of truth.
 *
 * Covers three classes of real misconfiguration:
 *   1. no-incoming-edge       — an executable node nothing points at; it will
 *                               never fire, yet today produces no alert.
 *   2. missing-upstream       — an edge references a `from` node id that does
 *                               not exist on the canvas (e.g. a deleted node).
 *   3. required-config-missing — a node is missing one or more of the config
 *                               keys its kind requires to run.
 */
export function detectWarnings(canvas: Canvas): Warning[] {
  const warnings: Warning[] = [];
  const byId = new Map(canvas.nodes.map((n) => [n.id, n]));

  const incoming = new Map<string, number>();
  for (const node of canvas.nodes) incoming.set(node.id, 0);

  // First pass over edges: tally incoming degree and flag dangling sources.
  for (const edge of canvas.edges) {
    if (byId.has(edge.to)) {
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    }
    if (!byId.has(edge.from)) {
      const target = byId.get(edge.to);
      warnings.push({
        id: `missing-upstream:${edge.from}->${edge.to}`,
        kind: "missing-upstream",
        severity: "error",
        title: "References a missing upstream node",
        detail: `depends on “${edge.from}”, which is not on this canvas — the edge is dangling and the dependency cannot run.`,
        nodeIds: target ? [target.id] : [],
      });
    }
  }

  // Second pass over nodes: unreachable executables + missing required config.
  for (const node of canvas.nodes) {
    if (EXECUTABLE_KINDS.has(node.kind) && (incoming.get(node.id) ?? 0) === 0) {
      warnings.push({
        id: `no-incoming-edge:${node.id}`,
        kind: "no-incoming-edge",
        severity: "error",
        title: "No incoming edge",
        detail: `is a ${node.kind} node with nothing pointing at it, so it will never execute.`,
        nodeIds: [node.id],
      });
    }

    const missing = node.requiredConfig.filter(
      (key) => !node.config[key] || node.config[key].trim() === "",
    );
    if (missing.length > 0) {
      warnings.push({
        id: `required-config-missing:${node.id}`,
        kind: "required-config-missing",
        severity: "warning",
        title: "Required configuration missing",
        detail: `is missing required config: ${missing.map((k) => `\`${k}\``).join(", ")}.`,
        nodeIds: [node.id],
      });
    }
  }

  return warnings;
}

/** Count warnings by severity for the panel's badge. */
export function warningCounts(warnings: Warning[]): { errors: number; warnings: number } {
  return {
    errors: warnings.filter((w) => w.severity === "error").length,
    warnings: warnings.filter((w) => w.severity === "warning").length,
  };
}
