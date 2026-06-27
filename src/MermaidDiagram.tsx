import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "strict",
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  themeVariables: {
    background: "#0c0f17",
    primaryColor: "#16203a",
    primaryBorderColor: "#3d5af1",
    primaryTextColor: "#e8ecf6",
    lineColor: "#5b6b9a",
  },
});

type Props = { code: string };

/**
 * Renders a fenced ```mermaid block as live SVG. Mermaid v11 `render` is async
 * and touches SVG measurement APIs, so it runs in an effect after mount and
 * re-runs whenever the diagram source changes.
 */
export function MermaidDiagram({ code }: Props) {
  const rawId = useId();
  const id = `mermaid-${rawId.replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error) {
    return (
      <div className="mermaid-error" role="alert">
        Diagram error: {error}
      </div>
    );
  }

  return <div className="mermaid-diagram" ref={containerRef} aria-label="Rendered mermaid diagram" />;
}
