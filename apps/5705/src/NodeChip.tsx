import type { CanvasNode, NodeKind } from "./types";

const KIND_GLYPH: Record<NodeKind, string> = {
  trigger: "⚡",
  action: "▶",
  filter: "⟜",
  approval: "✓",
};

/**
 * A node reference rendered as a styled pill chip — the agent-chat "@mention"
 * pattern. Used inside warning text so a node reference is unmistakably a node,
 * not a plain word or a bare link. Highlights its target node on hover/focus.
 */
export function NodeChip({
  node,
  onHover,
}: {
  node: CanvasNode;
  onHover?: (id: string | null) => void;
}) {
  return (
    <button
      type="button"
      className={`chip chip--${node.kind}`}
      data-testid="node-chip"
      data-node-id={node.id}
      title={`${node.kind} · ${node.id}`}
      onMouseEnter={() => onHover?.(node.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(node.id)}
      onBlur={() => onHover?.(null)}
    >
      <span className="chip__glyph" aria-hidden="true">
        {KIND_GLYPH[node.kind]}
      </span>
      <span className="chip__label">{node.label}</span>
    </button>
  );
}
