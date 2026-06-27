import type { ComponentProps } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { remarkNodeMention } from "./remarkNodeMention";
import { MermaidDiagram } from "./MermaidDiagram";

type Props = { source: string };

type MentionProps = { label?: string };

function MentionChip({ label }: MentionProps) {
  return (
    <span className="node-chip" data-testid="node-chip" title={`SuperPlane node: ${label}`}>
      <span className="node-chip__glyph" aria-hidden="true">
        ⬡
      </span>
      <span className="node-chip__label">{label}</span>
    </span>
  );
}

// `node-mention` is a custom mdast node injected by remarkNodeMention, so it is
// not in react-markdown's Components key map — cast the whole object once at the
// boundary rather than fighting the type per-entry.
const components = {
  "node-mention": (props: MentionProps) => <MentionChip label={props.label} />,
  code({ className, children, ...rest }: ComponentProps<"code"> & ExtraProps) {
    const text = String(children).replace(/\n$/, "");
    const match = /language-(\w+)/.exec(className ?? "");
    const lang = match?.[1];

    if (lang === "mermaid") {
      return <MermaidDiagram code={text} />;
    }

    if (lang) {
      return (
        <SyntaxHighlighter
          language={lang}
          style={oneDark}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: "10px",
            background: "#11151f",
            fontSize: "0.85rem",
          }}
        >
          {text}
        </SyntaxHighlighter>
      );
    }

    return (
      <code className="inline-code" {...rest}>
        {children}
      </code>
    );
  },
} satisfies Components & { "node-mention": unknown };

export function MarkdownView({ source }: Props) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkNodeMention]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
