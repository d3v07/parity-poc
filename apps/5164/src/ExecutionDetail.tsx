import type { NodeExecution } from "./types";

function PayloadBlock({ label, value }: { label: string; value: unknown }) {
  const text =
    value === null || value === undefined
      ? "(none)"
      : JSON.stringify(value, null, 2);
  return (
    <div className="payload">
      <div className="payload__label">{label}</div>
      <pre className="payload__body">
        <code>{text}</code>
      </pre>
    </div>
  );
}

export function ExecutionDetail({
  execution,
  onSendToAgent,
}: {
  execution: NodeExecution;
  onSendToAgent: (execution: NodeExecution) => void;
}) {
  return (
    <article className="exec" aria-label={`Execution ${execution.nodeName}`}>
      <header className="exec__head">
        <div className="exec__title">
          <span className="exec__node">{execution.nodeName}</span>
          <span className="exec__type">{execution.nodeType}</span>
        </div>
        <span
          className={`status status--${execution.status}`}
          data-testid="exec-status"
        >
          {execution.status}
        </span>
      </header>

      <dl className="exec__meta">
        <div>
          <dt>Execution</dt>
          <dd className="mono">{execution.id}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd className="mono">{execution.startedAt}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd className="mono">{(execution.durationMs / 1000).toFixed(2)}s</dd>
        </div>
      </dl>

      {execution.error ? (
        <div className="exec__error" role="alert" data-testid="exec-error">
          <span className="exec__error-glyph" aria-hidden="true">
            ⨯
          </span>
          <p>{execution.error}</p>
        </div>
      ) : null}

      <div className="exec__payloads">
        <PayloadBlock label="Input" value={execution.input} />
        <PayloadBlock label="Output" value={execution.output} />
      </div>

      <footer className="exec__actions">
        <button
          type="button"
          className="send-btn"
          onClick={() => onSendToAgent(execution)}
        >
          <span className="send-btn__glyph" aria-hidden="true">
            ➤
          </span>
          Send to Agent
        </button>
        <span className="exec__hint">
          Hands this failure to the agent with full context.
        </span>
      </footer>
    </article>
  );
}
