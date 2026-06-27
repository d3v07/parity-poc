import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { App } from "./App";
import { detectWarnings, warningCounts } from "./detectWarnings";
import { SEED_CANVAS } from "./seedCanvas";
import type { Canvas, Warning } from "./types";

function kinds(warnings: Warning[]): string[] {
  return warnings.map((w) => w.kind);
}

describe("detectWarnings — misconfiguration coverage", () => {
  it("flags an action node with no incoming edge (it will never execute)", () => {
    const canvas: Canvas = {
      name: "t",
      nodes: [
        {
          id: "orphan",
          label: "Run migrations",
          kind: "action",
          requiredConfig: ["command"],
          config: { command: "npm run db:migrate" },
        },
      ],
      edges: [],
    };
    const warnings = detectWarnings(canvas);
    expect(kinds(warnings)).toContain("no-incoming-edge");
    const w = warnings.find((x) => x.kind === "no-incoming-edge")!;
    expect(w.nodeIds).toEqual(["orphan"]);
    expect(w.severity).toBe("error");
  });

  it("does not flag a trigger node for a missing incoming edge", () => {
    const canvas: Canvas = {
      name: "t",
      nodes: [
        { id: "trig", label: "Webhook", kind: "trigger", requiredConfig: [], config: {} },
      ],
      edges: [],
    };
    expect(kinds(detectWarnings(canvas))).not.toContain("no-incoming-edge");
  });

  it("flags a node whose edge references a missing upstream node", () => {
    const canvas: Canvas = {
      name: "t",
      nodes: [
        { id: "downstream", label: "Promote to prod", kind: "action", requiredConfig: [], config: {} },
      ],
      edges: [{ from: "ghost", to: "downstream" }],
    };
    const warnings = detectWarnings(canvas);
    const w = warnings.find((x) => x.kind === "missing-upstream")!;
    expect(w).toBeDefined();
    expect(w.nodeIds).toEqual(["downstream"]);
    expect(w.detail).toContain("ghost");
  });

  it("flags a node missing a required config key", () => {
    const canvas: Canvas = {
      name: "t",
      nodes: [
        { id: "trig", label: "Webhook", kind: "trigger", requiredConfig: [], config: {} },
        {
          id: "deploy",
          label: "Deploy",
          kind: "action",
          requiredConfig: ["service", "image"],
          config: { image: "x" },
        },
      ],
      edges: [{ from: "trig", to: "deploy" }],
    };
    const warnings = detectWarnings(canvas);
    const w = warnings.find((x) => x.kind === "required-config-missing")!;
    expect(w).toBeDefined();
    expect(w.nodeIds).toEqual(["deploy"]);
    expect(w.detail).toContain("service");
    expect(w.detail).not.toContain("`image`");
  });

  it("reports no warnings for a fully-wired, fully-configured canvas", () => {
    const canvas: Canvas = {
      name: "t",
      nodes: [
        { id: "trig", label: "Webhook", kind: "trigger", requiredConfig: ["repo"], config: { repo: "a/b" } },
        { id: "act", label: "Deploy", kind: "action", requiredConfig: ["service"], config: { service: "web" } },
      ],
      edges: [{ from: "trig", to: "act" }],
    };
    expect(detectWarnings(canvas)).toHaveLength(0);
  });

  it("detects all three misconfiguration kinds in the seeded canvas", () => {
    const found = new Set(kinds(detectWarnings(SEED_CANVAS)));
    expect(found).toContain("no-incoming-edge");
    expect(found).toContain("missing-upstream");
    expect(found).toContain("required-config-missing");
  });
});

describe("warningCounts", () => {
  it("splits totals by severity for the badge", () => {
    const counts = warningCounts(detectWarnings(SEED_CANVAS));
    expect(counts.errors).toBeGreaterThan(0);
    expect(counts.warnings).toBeGreaterThan(0);
  });
});

describe("WarningsPanel rendering", () => {
  it("renders each warning's node reference as a node-mention chip showing the node label", () => {
    render(<App />);
    const chips = screen.getAllByTestId("node-chip");
    expect(chips.length).toBeGreaterThan(0);
    // the orphaned "Run migrations" action is referenced by a chip carrying its label
    const labels = chips.map((c) => c.textContent);
    expect(labels.some((t) => t?.includes("Run migrations"))).toBe(true);
  });

  it("surfaces a prominent count badge reflecting the number of warnings", () => {
    render(<App />);
    const badge = screen.getByTestId("warning-count");
    expect(within(badge).getByText(/errors/)).toBeInTheDocument();
  });

  it("marks the warning panel as an alert region so users notice it", () => {
    render(<App />);
    expect(screen.getByRole("alert")).toHaveTextContent(/Canvas warnings/);
  });
});
