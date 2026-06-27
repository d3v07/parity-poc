import type { Run, NodeExecution } from "./types";

// Pure duration helpers — the single source of truth shared by the UI and the
// tests. Durations are wall-clock milliseconds derived from ISO timestamps, so
// what an operator reads on screen is exactly what the tests assert.

/** Milliseconds a single node execution took, or null if it has not finished. */
export function nodeDurationMs(node: NodeExecution): number | null {
  if (!node.finishedAt) return null;
  return Date.parse(node.finishedAt) - Date.parse(node.startedAt);
}

/**
 * Total elapsed wall-clock time for a run: from the earliest node start to the
 * latest node finish. This is the real span the run occupied, NOT the sum of
 * node durations (nodes can overlap or sit idle between steps). Falls back to
 * the run's own started/finished stamps when present.
 */
export function runDurationMs(run: Run): number | null {
  const starts = run.nodes.map((n) => Date.parse(n.startedAt));
  const ends = run.nodes
    .map((n) => (n.finishedAt ? Date.parse(n.finishedAt) : null))
    .filter((t): t is number => t !== null);

  const earliest = starts.length ? Math.min(...starts) : Date.parse(run.startedAt);
  const latest = run.finishedAt
    ? Date.parse(run.finishedAt)
    : ends.length
      ? Math.max(...ends)
      : null;

  if (latest === null || Number.isNaN(earliest)) return null;
  return latest - earliest;
}

/**
 * Human duration with a stable, single format so a value is rendered the same
 * everywhere it appears:
 *   < 1s        → "840ms"
 *   < 60s       → "1.8s"   (one decimal, trailing .0 trimmed → "5s")
 *   >= 60s      → "2m 05s"
 * `null` (still running) renders as an em dash.
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;

  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    const oneDp = Math.round(totalSeconds * 10) / 10;
    return Number.isInteger(oneDp) ? `${oneDp}s` : `${oneDp.toFixed(1)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds - minutes * 60);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

/** Case-insensitive, whitespace-trimmed match of a run title against a query. */
export function matchesQuery(title: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return title.toLowerCase().includes(q);
}

/** Runs whose title matches the query, preserving input order. */
export function filterRuns(runs: Run[], query: string): Run[] {
  return runs.filter((r) => matchesQuery(r.title, query));
}
