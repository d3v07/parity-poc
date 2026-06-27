import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeDiff, diffStats } from "./diffEngine";
import { DiffView } from "./DiffView";

describe("computeDiff — intra-line highlighting", () => {
  it("emphasizes only the changed characters of a modified line", () => {
    const rows = computeDiff("version: 3\n", "version: 4\n");

    const removed = rows.find((r) => r.type === "remove");
    const added = rows.find((r) => r.type === "add");
    expect(removed).toBeDefined();
    expect(added).toBeDefined();

    // The shared prefix "version: " stays plain; only "3"/"4" is emphasized.
    const removedEmph = removed!.segments.filter((s) => s.emphasis).map((s) => s.value);
    const addedEmph = added!.segments.filter((s) => s.emphasis).map((s) => s.value);
    expect(removedEmph).toEqual(["3"]);
    expect(addedEmph).toEqual(["4"]);

    const plain = removed!.segments.find((s) => !s.emphasis);
    expect(plain?.value).toContain("version: ");
  });

  it("produces no rows and no emphasis when both versions are identical", () => {
    const same = "canvas: deploy-pipeline\nversion: 3\nreplicas: 2\n";
    const rows = computeDiff(same, same);

    expect(rows.every((r) => r.type === "context")).toBe(true);
    expect(rows.some((r) => r.segments.some((s) => s.emphasis))).toBe(false);
    expect(diffStats(rows)).toEqual({ additions: 0, removals: 0 });
  });

  it("marks pure add/remove lines without intra-line emphasis", () => {
    const rows = computeDiff("a\nb\n", "a\nb\nc\n");
    const added = rows.filter((r) => r.type === "add");
    expect(added).toHaveLength(1);
    expect(added[0].segments.some((s) => s.emphasis)).toBe(false);
  });
});

describe("DiffView — rendering", () => {
  it("renders an inline emphasis element for a modified line", () => {
    render(<DiffView oldText={"region: us-east-1\n"} newText={"region: us-west-2\n"} />);
    const marks = screen.getAllByTestId("diff-emphasis");
    expect(marks.length).toBeGreaterThan(0);
    // Unchanged prefix is present but not inside an emphasis mark.
    expect(marks.every((m) => !m.textContent?.includes("region:"))).toBe(true);
  });

  it("renders no emphasis and no add/remove rows for identical input", () => {
    const same = "stages:\n  - name: build\n";
    const { container } = render(<DiffView oldText={same} newText={same} />);
    expect(screen.queryByTestId("diff-emphasis")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-row-type="add"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-row-type="remove"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-row-type="context"]').length).toBeGreaterThan(0);
  });
});
