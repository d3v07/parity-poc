import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownView } from "./MarkdownView";
import { NODE_MENTION_RE } from "./remarkNodeMention";

// Mermaid touches SVG measurement APIs that jsdom does not implement, so we
// stand in a lightweight marker component for the render path.
vi.mock("./MermaidDiagram", () => ({
  MermaidDiagram: ({ code }: { code: string }) => (
    <div data-testid="mermaid" data-code={code} />
  ),
}));

describe("node-mention regex", () => {
  it("captures the label inside @node[...]", () => {
    const re = new RegExp(NODE_MENTION_RE.source, "g");
    const match = re.exec("ship it from @node[Deploy to Render] now");
    expect(match?.[1]).toBe("Deploy to Render");
  });
});

describe("MarkdownView", () => {
  it("renders @node[...] tokens as node chips with the right label", () => {
    render(<MarkdownView source="Promote via @node[QA gate] before merge." />);
    const chip = screen.getByTestId("node-chip");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("QA gate");
  });

  it("does not turn @node tokens inside code spans into chips", () => {
    render(<MarkdownView source="Inline `@node[Ignored]` stays literal." />);
    expect(screen.queryByTestId("node-chip")).not.toBeInTheDocument();
    expect(screen.getByText("@node[Ignored]")).toBeInTheDocument();
  });

  it("routes a ```mermaid fence to the mermaid renderer", () => {
    const src = "```mermaid\nflowchart LR\n  A --> B\n```";
    render(<MarkdownView source={src} />);
    const diagram = screen.getByTestId("mermaid");
    expect(diagram).toBeInTheDocument();
    expect(diagram.getAttribute("data-code")).toContain("flowchart LR");
  });

  it("renders GFM tables", () => {
    const src = "| Col |\n| --- |\n| Val |";
    render(<MarkdownView source={src} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Val" })).toBeInTheDocument();
  });
});
