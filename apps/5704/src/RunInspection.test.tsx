import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { SEED_RUNS } from "./runs";
import {
  runDurationMs,
  nodeDurationMs,
  formatDuration,
  filterRuns,
  matchesQuery,
} from "./runStats";

describe("duration math (pure)", () => {
  it("run duration is the wall-clock span from first node start to last finish", () => {
    const alpha = SEED_RUNS.find((r) => r.id === "run_alpha")!;
    // 09:14:02 → 09:16:50 = 168_000ms
    expect(runDurationMs(alpha)).toBe(168_000);
    expect(formatDuration(runDurationMs(alpha))).toBe("2m 48s");
  });

  it("node duration is finished minus started", () => {
    const alpha = SEED_RUNS.find((r) => r.id === "run_alpha")!;
    const checkout = alpha.nodes.find((n) => n.id === "n_alpha_1")!;
    expect(nodeDurationMs(checkout)).toBe(840);
    expect(formatDuration(nodeDurationMs(checkout))).toBe("840ms");
  });

  it("a running node (no finish time) has no duration", () => {
    const gamma = SEED_RUNS.find((r) => r.id === "run_gamma")!;
    const smoke = gamma.nodes.find((n) => n.id === "n_gamma_2")!;
    expect(nodeDurationMs(smoke)).toBeNull();
    expect(formatDuration(nodeDurationMs(smoke))).toBe("—");
  });

  it("formatDuration picks one stable format per magnitude", () => {
    expect(formatDuration(120)).toBe("120ms");
    expect(formatDuration(1000)).toBe("1s");
    expect(formatDuration(1840)).toBe("1.8s");
    expect(formatDuration(45_000)).toBe("45s");
    expect(formatDuration(168_000)).toBe("2m 48s");
    expect(formatDuration(null)).toBe("—");
  });
});

describe("run search (pure)", () => {
  it("matchesQuery is case-insensitive and trims", () => {
    expect(matchesQuery("Nightly database migration", "  NIGHTLY ")).toBe(true);
    expect(matchesQuery("Deploy api-gateway", "smoke")).toBe(false);
    expect(matchesQuery("anything", "")).toBe(true);
  });

  it("filterRuns narrows by title", () => {
    const out = filterRuns(SEED_RUNS, "deploy");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("run_alpha");
  });
});

describe("paper cut #5 — search runs by title", () => {
  it("filters the runs list as the operator types", async () => {
    const user = userEvent.setup();
    render(<App />);

    const list = screen.getByTestId("runs-list");
    expect(within(list).getAllByRole("button")).toHaveLength(SEED_RUNS.length);

    await user.type(
      screen.getByLabelText(/search runs by title/i),
      "migration",
    );

    const remaining = within(screen.getByTestId("runs-list")).getAllByRole("button");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveTextContent("Nightly database migration");
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/search runs by title/i), "zzz-nope");
    expect(screen.getByTestId("runs-empty")).toBeInTheDocument();
  });
});

describe("paper cut #1 — run duration on the selected run", () => {
  it("shows the total elapsed time for the selected run", () => {
    render(<App />);
    // run_alpha is selected first
    expect(screen.getByTestId("run-duration")).toHaveTextContent("2m 48s");
  });

  it("updates when a different run is selected", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Nightly database migration/i }));
    expect(screen.getByTestId("run-duration")).toHaveTextContent("45s");
  });
});

describe("paper cut #2 — node execution duration", () => {
  it("shows no node detail until a node is selected", () => {
    render(<App />);
    expect(screen.getByTestId("node-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("node-duration")).not.toBeInTheDocument();
  });

  it("shows the node's duration once selected", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Build container image/i }));
    expect(screen.getByTestId("node-duration")).toHaveTextContent("1m 34s");
  });
});

describe("paper cut #3 — payload inspection", () => {
  it("renders the payload expanded by default (keys visible, not collapsed)", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Deploy to Render/i }));
    const json = screen.getByTestId("payload-json");
    expect(json).toHaveTextContent("statusCode");
    expect(json).toHaveTextContent("422");
  });

  it("opens a full-screen modal for large payloads and closes it", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Deploy to Render/i }));

    expect(screen.queryByTestId("payload-modal")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /expand payload full screen/i }));

    const modal = screen.getByTestId("payload-modal");
    expect(within(modal).getByTestId("modal-json")).toHaveTextContent("statusCode");

    await user.click(screen.getByRole("button", { name: /close full screen/i }));
    expect(screen.queryByTestId("payload-modal")).not.toBeInTheDocument();
  });
});

describe("paper cut #4 — back to live canvas always reachable", () => {
  it("keeps the back-to-canvas button visible after collapsing the sidebar", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByTestId("back-to-canvas")).toBeVisible();
    expect(screen.getByTestId("runs-list")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /collapse runs sidebar/i }));

    // sidebar gone, but back-to-canvas is still in the header and reachable
    expect(screen.queryByTestId("runs-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("back-to-canvas")).toBeVisible();
  });
});
