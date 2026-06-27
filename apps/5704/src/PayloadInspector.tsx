import { useEffect } from "react";

interface PayloadInspectorProps {
  label: string;
  payload: unknown;
  onExpand: () => void;
}

function pretty(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

/**
 * Inline JSON view — fully expanded by default (a plain pretty-printed <pre>, so
 * every key is visible without clicking) with an "Expand" affordance that opens
 * the full-screen modal for large payloads.
 */
export function PayloadInspector({ label, payload, onExpand }: PayloadInspectorProps) {
  return (
    <div className="payload">
      <div className="payload__head">
        <span className="payload__label">{label}</span>
        <button
          type="button"
          className="payload__expand"
          onClick={onExpand}
          aria-label={`Expand ${label} full screen`}
        >
          ⤢ Full screen
        </button>
      </div>
      <pre className="payload__body" data-testid="payload-json">
        {pretty(payload)}
      </pre>
    </div>
  );
}

interface PayloadModalProps {
  label: string;
  payload: unknown;
  onClose: () => void;
}

/**
 * Full-screen payload viewer. State-driven (rendered only when open) rather than
 * the native <dialog>.showModal(), which jsdom does not fully implement. Closes
 * on the backdrop, the close button, or Escape.
 */
export function PayloadModal({ label, payload, onClose }: PayloadModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} payload`}
      data-testid="payload-modal"
      onClick={onClose}
    >
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal__bar">
          <span className="modal__title mono">{label}</span>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close full screen"
          >
            ✕
          </button>
        </div>
        <pre className="modal__body" data-testid="modal-json">
          {pretty(payload)}
        </pre>
      </div>
    </div>
  );
}
