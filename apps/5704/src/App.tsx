import { useMemo, useState } from "react";
import { SEED_RUNS } from "./runs";
import { filterRuns, runDurationMs, nodeDurationMs, formatDuration } from "./runStats";
import { PayloadInspector, PayloadModal } from "./PayloadInspector";
import type { NodeExecution, Run } from "./types";

interface ModalState {
  label: string;
  payload: unknown;
}

function startedClock(iso: string): string {
  // Deterministic HH:MM:SS in UTC — no locale, no Date.now(), stable in tests.
  return iso.slice(11, 19) + " UTC";
}

export function App() {
  const [selectedRunId, setSelectedRunId] = useState(SEED_RUNS[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);

  const visibleRuns = useMemo(() => filterRuns(SEED_RUNS, query), [query]);

  const selectedRun: Run =
    SEED_RUNS.find((r) => r.id === selectedRunId) ?? SEED_RUNS[0];
  const selectedNode: NodeExecution | null =
    selectedRun.nodes.find((n) => n.id === selectedNodeId) ?? null;

  function selectRun(run: Run) {
    setSelectedRunId(run.id);
    setSelectedNodeId(null);
  }

  return (
    <div className={`app${sidebarOpen ? "" : " app--collapsed"}`}>
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            ◇
          </span>
          <div>
            <h1 className="app__title">Run Inspector</h1>
            <p className="app__subtitle">
              run &amp; node durations · payload viewer · issue <code>#5704</code>
            </p>
          </div>
        </div>
        <div className="app__actions">
          {/* Paper cut #4: reachable even when the runs sidebar is collapsed. */}
          <button
            type="button"
            className="canvas-btn"
            data-testid="back-to-canvas"
            onClick={() => undefined}
          >
            ◀ Back to live canvas
          </button>
          <span className="app__badge">SuperPlane</span>
        </div>
      </header>

      <main className="app__body">
        {sidebarOpen && (
        <aside className="runs" aria-label="Runs">
          <div className="runs__head">
            <span className="runs__title mono">runs</span>
            <button
              type="button"
              className="runs__collapse"
              onClick={() => setSidebarOpen(false)}
              aria-label="Collapse runs sidebar"
            >
              ⟨
            </button>
          </div>

          {/* Paper cut #5: search runs by title. */}
          <div className="runs__search">
            <input
              type="search"
              className="runs__input"
              placeholder="Search runs by title…"
              aria-label="Search runs by title"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <ul className="runs__list" data-testid="runs-list">
            {visibleRuns.map((run) => (
              <li key={run.id}>
                <button
                  type="button"
                  className={`run-card${
                    run.id === selectedRunId ? " run-card--active" : ""
                  }`}
                  aria-pressed={run.id === selectedRunId}
                  onClick={() => selectRun(run)}
                >
                  <span className={`run-card__dot run-card__dot--${run.status}`} />
                  <span className="run-card__main">
                    <span className="run-card__title">{run.title}</span>
                    <span className="run-card__meta mono">
                      {formatDuration(runDurationMs(run))} · {run.triggeredBy}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {visibleRuns.length === 0 && (
              <li className="runs__empty" data-testid="runs-empty">
                No runs match “{query}”.
              </li>
            )}
          </ul>
        </aside>
        )}

        <section className="detail" aria-label="Run detail">
          {!sidebarOpen && (
            <button
              type="button"
              className="detail__reopen"
              onClick={() => setSidebarOpen(true)}
              aria-label="Expand runs sidebar"
            >
              ⟩ Runs
            </button>
          )}

          <div className="detail__head">
            <div className="detail__title-wrap">
              <h2 className="detail__title">{selectedRun.title}</h2>
              <span className="detail__sub mono">
                {selectedRun.id} · {selectedRun.triggeredBy}
              </span>
            </div>
            <span className={`status status--${selectedRun.status}`}>
              {selectedRun.status}
            </span>
          </div>

          {/* Paper cut #1: run duration (total elapsed) on the selected run. */}
          <dl className="detail__meta">
            <div>
              <dt>Started</dt>
              <dd className="mono">{startedClock(selectedRun.startedAt)}</dd>
            </div>
            <div>
              <dt>Run duration</dt>
              <dd className="mono" data-testid="run-duration">
                {formatDuration(runDurationMs(selectedRun))}
              </dd>
            </div>
            <div>
              <dt>Nodes</dt>
              <dd className="mono">{selectedRun.nodes.length}</dd>
            </div>
          </dl>

          <div className="detail__split">
            <ul className="nodes" data-testid="nodes-list" aria-label="Node executions">
              {selectedRun.nodes.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    className={`node${
                      node.id === selectedNodeId ? " node--active" : ""
                    }`}
                    aria-pressed={node.id === selectedNodeId}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <span className={`node__dot node__dot--${node.status}`} />
                    <span className="node__name">{node.nodeName}</span>
                    <span className="node__dur mono">
                      {formatDuration(nodeDurationMs(node))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="node-detail">
              {selectedNode ? (
                <>
                  <div className="node-detail__head">
                    <div className="node-detail__title-wrap">
                      <span className="node-detail__name">
                        {selectedNode.nodeName}
                      </span>
                      <span className="node-detail__type mono">
                        {selectedNode.nodeType}
                      </span>
                    </div>
                    <span className={`status status--${selectedNode.status}`}>
                      {selectedNode.status}
                    </span>
                  </div>

                  {/* Paper cut #2: node execution duration when a node is selected. */}
                  <dl className="node-detail__meta">
                    <div>
                      <dt>Started</dt>
                      <dd className="mono">{startedClock(selectedNode.startedAt)}</dd>
                    </div>
                    <div>
                      <dt>Node duration</dt>
                      <dd className="mono" data-testid="node-duration">
                        {formatDuration(nodeDurationMs(selectedNode))}
                      </dd>
                    </div>
                  </dl>

                  {/* Paper cut #3: payload expanded by default + full-screen view. */}
                  <PayloadInspector
                    label="payload"
                    payload={selectedNode.payload}
                    onExpand={() =>
                      setModal({ label: selectedNode.nodeName, payload: selectedNode.payload })
                    }
                  />
                </>
              ) : (
                <div className="node-detail__empty" data-testid="node-empty">
                  <strong>Select a node</strong>
                  <span>
                    Pick a node execution to see its duration and inspect its payload.
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {modal && (
        <PayloadModal
          label={modal.label}
          payload={modal.payload}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
