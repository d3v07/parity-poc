import { visit } from "unist-util-visit";
import type { Root, Text, PhrasingContent } from "mdast";

/**
 * Matches inline node-mention tokens like `@node[Deploy to Render]`.
 * The capture group is the human-readable node label.
 */
export const NODE_MENTION_RE = /@node\[([^\]]+)\]/g;

type MdastNode = {
  type: string;
  value?: string;
  data?: { hName?: string; hProperties?: Record<string, unknown> };
};

/**
 * remark plugin: rewrites `@node[Label]` occurrences inside text nodes into
 * custom `nodeMention` mdast nodes. react-markdown surfaces these to a
 * matching component (see MentionChip) via the `data.hName` directive.
 *
 * Splitting the text node (rather than regex-replacing the raw string) keeps
 * react-markdown's escaping intact and lets us style each chip individually.
 */
export function remarkNodeMention() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === null || index === undefined) return;

      const value = node.value;
      const matches = [...value.matchAll(NODE_MENTION_RE)];
      if (matches.length === 0) return;

      const children: PhrasingContent[] = [];
      let cursor = 0;

      for (const match of matches) {
        const start = match.index ?? 0;
        const label = match[1];

        if (start > cursor) {
          children.push({ type: "text", value: value.slice(cursor, start) });
        }

        const chip: MdastNode = {
          type: "nodeMention",
          data: {
            hName: "node-mention",
            hProperties: { label },
          },
        };
        children.push(chip as unknown as PhrasingContent);

        cursor = start + match[0].length;
      }

      if (cursor < value.length) {
        children.push({ type: "text", value: value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}
