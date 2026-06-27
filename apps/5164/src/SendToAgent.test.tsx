import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { buildAgentContext } from "./agentContext";
import { SEED_EXECUTIONS } from "./executions";

describe("buildAgentContext", () => {
  it("embeds node name, status, error, and both payloads", () => {
    const exec = SEED_EXECUTIONS[0];
    const ctx = buildAgentContext(exec);
    expect(ctx).toContain(exec.nodeName);
    expect(ctx).toContain("FAILED");
    expect(ctx).toContain(exec.error as string);
    expect(ctx).toContain("Input:");
    expect(ctx).toContain("Output:");
    // payload contents are serialized in
    expect(ctx).toContain("clearCache");
  });
});

describe("Send to Agent", () => {
  it("injects a chat message containing the execution node name and error", async () => {
    const user = userEvent.setup();
    render(<App />);

    const exec = SEED_EXECUTIONS[0];
    // chat starts empty
    expect(screen.queryByTestId("msg-system")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /send to agent/i }));

    const log = screen.getByTestId("chat-log");
    const message = within(log).getByTestId("msg-system");
    expect(message).toHaveTextContent(exec.nodeName);
    expect(message).toHaveTextContent("422");
    expect(message.textContent).toContain(exec.error as string);
  });

  it("sends the selected execution's context, not the first one", async () => {
    const user = userEvent.setup();
    render(<App />);

    const second = SEED_EXECUTIONS[1];
    await user.click(screen.getByRole("button", { name: second.nodeName }));
    await user.click(screen.getByRole("button", { name: /send to agent/i }));

    const message = within(screen.getByTestId("chat-log")).getByTestId(
      "msg-system",
    );
    expect(message).toHaveTextContent(second.nodeName);
    expect(message).toHaveTextContent("0042");
  });

  it("focuses (highlights) the chat panel after sending", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(container.querySelector(".chat--focused")).toBeNull();

    await user.click(screen.getByRole("button", { name: /send to agent/i }));
    expect(container.querySelector(".chat--focused")).not.toBeNull();
  });

  it("lets the user follow up with their own message", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /send to agent/i }));
    await user.type(
      screen.getByLabelText(/message the agent/i),
      "fix this please",
    );
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    expect(screen.getByTestId("msg-user")).toHaveTextContent("fix this please");
  });
});
