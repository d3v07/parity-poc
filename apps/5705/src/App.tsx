import { useMemo, useState } from "react";
import { CanvasView } from "./CanvasView";
import { WarningsPanel } from "./WarningsPanel";
import { detectWarnings } from "./detectWarnings";
import { SEED_CANVAS } from "./seedCanvas";

export function App() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const warnings = useMemo(() => detectWarnings(SEED_CANVAS), []);
  const nodeById = useMemo(
    () => new Map(SEED_CANVAS.nodes.map((n) => [n.id, n])),
    [],
  );
  const flaggedIds = useMemo(
    () => new Set(warnings.flatMap((w) => w.nodeIds)),
    [warnings],
  );

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            ⬡
          </span>
          <div>
            <h1 className="app__title">Canvas Warnings</h1>
            <p className="app__subtitle">
              misconfiguration detection · node-mention chips · issue{" "}
              <code>#5705</code>
            </p>
          </div>
        </div>
        <span className="app__badge">SuperPlane</span>
      </header>

      <main className="app__body">
        <WarningsPanel
          warnings={warnings}
          nodeById={nodeById}
          onHover={setHoveredId}
        />
        <CanvasView
          canvas={SEED_CANVAS}
          flaggedIds={flaggedIds}
          highlightedId={hoveredId}
        />
      </main>
    </div>
  );
}
