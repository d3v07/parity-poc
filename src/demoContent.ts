/**
 * Seeded demo content exercising all three view-mode features:
 * standard GFM, a live mermaid diagram, and inline @node[...] mention chips.
 */
export const DEMO_MARKDOWN = `# Markdown View Mode

A read-optimized renderer for SuperPlane canvases. It speaks **GitHub-flavored
markdown**, draws \`mermaid\` diagrams inline, and turns plain-text references like
@node[Build Image] into live, clickable node chips.

## Why it ships

- Reviewers read a plan instead of decoding raw markup.
- Diagrams stay next to the prose that explains them.
- A mention such as @node[Deploy to Render] resolves to the actual canvas node.

### Pipeline at a glance

\`\`\`mermaid
flowchart LR
  A[Issue #5368] --> B{PRD ready?}
  B -- yes --> C[Architecture]
  C --> D[Frontend build]
  D --> E[QA gate]
  E -- pass --> F[Deploy to Render]
  E -- fail --> D
\`\`\`

The flow above is wired to real canvas nodes: @node[QA gate] blocks the merge,
and only a green run promotes @node[Deploy to Render].

## Supported syntax

| Feature        | Token                  | Renders as            |
| -------------- | ---------------------- | --------------------- |
| Heading        | \`#\` … \`######\`        | Styled headings       |
| Table          | \`\\| a \\| b \\|\`        | This table            |
| Code           | a \`ts\` fence           | Highlighted block     |
| Mermaid        | a \`mermaid\` fence      | SVG diagram           |
| Node mention   | \`@node[Label]\`         | A pill chip           |

### Syntax-highlighted code

\`\`\`ts
type Gate = { stage: string; passed: boolean };

export function promote(gate: Gate): boolean {
  if (!gate.passed) return false; // @node mentions are ignored inside code
  return true;
}
\`\`\`

> Mentions are inert inside code spans and code blocks — only prose chips, like
> @node[Notify Slack], become interactive.

1. Edit the markdown on the left.
2. Watch chips, tables, and diagrams update on the right.
3. Ship it from @node[Deploy to Render].
`;
