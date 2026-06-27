import { NodeChip } from "./NodeChip";
import { warningCounts } from "./detectWarnings";
import type { CanvasNode, Warning } from "./types";

const KIND_TAG: Record<Warning["kind"], string> = {
  "no-incoming-edge": "unreachable",
  "missing-upstream": "dangling edge",
  "required-config-missing": "config",
};

/** Render one warning line: its node(s) as chips, then the human detail. */
function WarningRow({
  warning,
  nodeById,
  onHover,
}: {
  warning: Warning;
  nodeById: Map<string, CanvasNode>;
  onHover?: (id: string | null) => void;
}) {
  const chips = warning.nodeIds
    .map((id) => nodeById.get(id))
    .filter((n): n is CanvasNode => Boolean(n));

  return (
    <li
      className={`warn warn--${warning.severity}`}
      data-testid="warning-row"
      data-kind={warning.kind}
    >
      <span className={`warn__sev warn__sev--${warning.severity}`} aria-hidden="true">
        {warning.severity === "error" ? "✕" : "!"}
      </span>
      <div className="warn__body">
        <div className="warn__head">
          <span className="warn__title">{warning.title}</span>
          <span className="warn__tag">{KIND_TAG[warning.kind]}</span>
        </div>
        <p className="warn__text">
          {chips.map((node) => (
            <NodeChip key={node.id} node={node} onHover={onHover} />
          ))}{" "}
          {warning.detail}
        </p>
      </div>
    </li>
  );
}

/**
 * The prominent warnings panel — a banner users can't overlook, with a count
 * badge. Each warning references its node(s) as mention chips. Renders an
 * explicit all-clear state when the canvas is healthy.
 */
export function WarningsPanel({
  warnings,
  nodeById,
  onHover,
}: {
  warnings: Warning[];
  nodeById: Map<string, CanvasNode>;
  onHover?: (id: string | null) => void;
}) {
  const counts = warningCounts(warnings);
  const total = warnings.length;

  return (
    <section
      className={`panel${total > 0 ? " panel--alert" : " panel--ok"}`}
      role="alert"
      aria-live="polite"
      aria-label="Canvas warnings"
    >
      <header className="panel__bar">
        <span className="panel__icon" aria-hidden="true">
          {total > 0 ? "⚠" : "✓"}
        </span>
        <h2 className="panel__title">
          {total > 0 ? "Canvas warnings" : "Canvas is healthy"}
        </h2>
        {total > 0 && (
          <span className="panel__badge" data-testid="warning-count" aria-label={`${total} warnings`}>
            {counts.errors > 0 && <span className="panel__count panel__count--error">{counts.errors} errors</span>}
            {counts.warnings > 0 && <span className="panel__count panel__count--warning">{counts.warnings} warnings</span>}
          </span>
        )}
      </header>

      {total === 0 ? (
        <p className="panel__clear">No misconfigurations detected on this canvas.</p>
      ) : (
        <ul className="panel__list">
          {warnings.map((w) => (
            <WarningRow key={w.id} warning={w} nodeById={nodeById} onHover={onHover} />
          ))}
        </ul>
      )}
    </section>
  );
}
