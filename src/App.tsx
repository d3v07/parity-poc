import { useState } from "react";
import { MarkdownView } from "./MarkdownView";
import { DEMO_MARKDOWN } from "./demoContent";

export function App() {
  const [source, setSource] = useState(DEMO_MARKDOWN);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            ⬡
          </span>
          <div>
            <h1 className="app__title">Markdown View Mode</h1>
            <p className="app__subtitle">
              GFM · mermaid diagrams · node-mention chips · issue{" "}
              <code>#5368</code>
            </p>
          </div>
        </div>
        <span className="app__badge">SuperPlane</span>
      </header>

      <main className="app__panes">
        <section className="pane pane--editor" aria-label="Markdown source">
          <div className="pane__bar">
            <span className="pane__dot pane__dot--red" />
            <span className="pane__dot pane__dot--amber" />
            <span className="pane__dot pane__dot--green" />
            <span className="pane__name">source.md</span>
          </div>
          <textarea
            className="editor"
            value={source}
            spellCheck={false}
            aria-label="Markdown editor"
            onChange={(e) => setSource(e.target.value)}
          />
        </section>

        <section className="pane pane--preview" aria-label="Rendered preview">
          <div className="pane__bar">
            <span className="pane__name">preview</span>
            <span className="pane__live">● live</span>
          </div>
          <div className="preview-scroll">
            <MarkdownView source={source} />
          </div>
        </section>
      </main>
    </div>
  );
}
