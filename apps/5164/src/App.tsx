import { useState } from "react";
import { ExecutionDetail } from "./ExecutionDetail";
import { AgentChat } from "./AgentChat";
import { SEED_EXECUTIONS } from "./executions";
import { executionToMessage } from "./agentContext";
import type { ChatMessage, NodeExecution } from "./types";

let userSeq = 0;

export function App() {
  const [selectedId, setSelectedId] = useState(SEED_EXECUTIONS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatFocused, setChatFocused] = useState(false);

  const selected =
    SEED_EXECUTIONS.find((e) => e.id === selectedId) ?? SEED_EXECUTIONS[0];

  function sendToAgent(execution: NodeExecution) {
    setMessages((prev) => [...prev, executionToMessage(execution)]);
    setChatFocused(true);
  }

  function sendUserMessage(text: string) {
    userSeq += 1;
    setMessages((prev) => [
      ...prev,
      { id: `user_${userSeq}`, role: "user", text },
    ]);
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            ⬡
          </span>
          <div>
            <h1 className="app__title">Send to Agent</h1>
            <p className="app__subtitle">
              execution detail · agent handoff · issue <code>#5164</code>
            </p>
          </div>
        </div>
        <span className="app__badge">SuperPlane</span>
      </header>

      <main className="app__panes">
        <section className="pane pane--exec" aria-label="Execution detail">
          <div className="pane__bar">
            <span className="pane__dot pane__dot--red" />
            <span className="pane__dot pane__dot--amber" />
            <span className="pane__dot pane__dot--green" />
            <span className="pane__name">run history</span>
          </div>

          <nav className="exec-tabs" aria-label="Recent executions">
            {SEED_EXECUTIONS.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`exec-tab${
                  e.id === selectedId ? " exec-tab--active" : ""
                }`}
                aria-pressed={e.id === selectedId}
                onClick={() => setSelectedId(e.id)}
              >
                <span className={`exec-tab__dot exec-tab__dot--${e.status}`} />
                {e.nodeName}
              </button>
            ))}
          </nav>

          <div className="pane__scroll">
            <ExecutionDetail execution={selected} onSendToAgent={sendToAgent} />
          </div>
        </section>

        <AgentChat
          messages={messages}
          highlighted={chatFocused}
          onSend={sendUserMessage}
        />
      </main>
    </div>
  );
}
