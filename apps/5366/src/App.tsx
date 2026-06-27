import { useState } from "react";
import { DiffView } from "./DiffView";
import { OLD_VERSION, NEW_VERSION } from "./demoContent";

export function App() {
  const [oldText, setOldText] = useState(OLD_VERSION);
  const [newText, setNewText] = useState(NEW_VERSION);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            ⬡
          </span>
          <div>
            <h1 className="app__title">Canvas Version Diff</h1>
            <p className="app__subtitle">
              line + intra-line highlighting · only changes colored · issue{" "}
              <code>#5366</code>
            </p>
          </div>
        </div>
        <span className="app__badge">SuperPlane</span>
      </header>

      <main className="app__panes">
        <section className="pane pane--editor" aria-label="Old version source">
          <div className="pane__bar">
            <span className="pane__dot pane__dot--red" />
            <span className="pane__name">canvas.yaml · v3</span>
          </div>
          <textarea
            className="editor"
            value={oldText}
            spellCheck={false}
            aria-label="Old version"
            onChange={(e) => setOldText(e.target.value)}
          />
        </section>

        <section className="pane pane--editor" aria-label="New version source">
          <div className="pane__bar">
            <span className="pane__dot pane__dot--green" />
            <span className="pane__name">canvas.yaml · v4</span>
          </div>
          <textarea
            className="editor"
            value={newText}
            spellCheck={false}
            aria-label="New version"
            onChange={(e) => setNewText(e.target.value)}
          />
        </section>
      </main>

      <section className="pane pane--diff" aria-label="Computed diff">
        <div className="pane__bar">
          <span className="pane__name">diff</span>
          <span className="pane__live">● v3 → v4</span>
        </div>
        <div className="diff-scroll">
          <DiffView oldText={oldText} newText={newText} />
        </div>
      </section>
    </div>
  );
}
