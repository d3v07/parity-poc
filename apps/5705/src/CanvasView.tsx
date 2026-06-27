import type { Canvas, CanvasNode, NodeKind } from "./types";

const KIND_GLYPH: Record<NodeKind, string> = {
  trigger: "⚡",
  action: "▶",
  filter: "⟜",
  approval: "✓",
};

/** A flat node list standing in for the canvas surface. Nodes flagged by a
 *  warning get a marker; the one currently hovered from a chip lights up. */
export function CanvasView({
  canvas,
  flaggedIds,
  highlightedId,
}: {
  canvas: Canvas;
  flaggedIds: Set<string>;
  highlightedId: string | null;
}) {
  return (
    <section className="canvas" aria-label="Canvas nodes">
      <div className="canvas__bar">
        <span className="canvas__dot canvas__dot--red" />
        <span className="canvas__dot canvas__dot--amber" />
        <span className="canvas__dot canvas__dot--green" />
        <span className="canvas__name">{canvas.name}</span>
      </div>
      <ul className="canvas__nodes">
        {canvas.nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            flagged={flaggedIds.has(node.id)}
            highlighted={node.id === highlightedId}
          />
        ))}
      </ul>
    </section>
  );
}

function NodeCard({
  node,
  flagged,
  highlighted,
}: {
  node: CanvasNode;
  flagged: boolean;
  highlighted: boolean;
}) {
  const cls = [
    "node",
    flagged ? "node--flagged" : "",
    highlighted ? "node--highlighted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={cls} data-node-id={node.id} data-testid="canvas-node">
      <span className="node__glyph" aria-hidden="true">
        {KIND_GLYPH[node.kind]}
      </span>
      <span className="node__label">{node.label}</span>
      <span className="node__kind">{node.kind}</span>
      {flagged && (
        <span className="node__flag" aria-label="has warning">
          ⚠
        </span>
      )}
    </li>
  );
}
