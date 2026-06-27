import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./types";

const ROLE_LABEL: Record<ChatMessage["role"], string> = {
  system: "Execution context",
  user: "You",
  agent: "Agent",
};

export function AgentChat({
  messages,
  highlighted,
  onSend,
}: {
  messages: ChatMessage[];
  highlighted: boolean;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // jsdom does not implement scrollIntoView; guard so the effect is a no-op under test.
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length]);

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <section
      className={`chat${highlighted ? " chat--focused" : ""}`}
      aria-label="Agent chat"
    >
      <div className="chat__bar">
        <span className="chat__avatar" aria-hidden="true">
          ◆
        </span>
        <span className="chat__name">Pipeline Agent</span>
        <span className="chat__status">● online</span>
      </div>

      <div className="chat__log" data-testid="chat-log">
        {messages.length === 0 ? (
          <p className="chat__empty">
            No context yet. Hit <strong>Send to Agent</strong> on a failed
            execution to start.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`msg msg--${m.role}`}
              data-testid={`msg-${m.role}`}
            >
              <span className="msg__role">{ROLE_LABEL[m.role]}</span>
              <div className="msg__text">{m.text}</div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="chat__compose">
        <textarea
          className="chat__input"
          placeholder="Ask the agent to fix it…"
          value={draft}
          aria-label="Message the agent"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className="chat__send"
          onClick={submit}
          disabled={draft.trim().length === 0}
        >
          Send
        </button>
      </div>
    </section>
  );
}
