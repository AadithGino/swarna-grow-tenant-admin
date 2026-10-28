/* @vitest-environment happy-dom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantMessage, blocksOf } from "@/src/components/assistant/AssistantMessage";
import { mockAgentAnswer } from "@/src/mocks/assistant-agent-mock";
import type { AssistantBundle } from "@/src/types/assistant";

vi.mock("@/src/store/hooks", () => ({
  useAppSelector: (selector: (s: { session: { session: { user: { permissions: string[] } } } }) => unknown) =>
    selector({ session: { session: { user: { permissions: [] } } } }),
}));

afterEach(cleanup);

describe("AssistantMessage (agent answers)", () => {
  it("renders the answer, a single-row result as a record card, and follow-up chips", () => {
    const onFollowUp = vi.fn();
    render(<AssistantMessage bundle={mockAgentAnswer("when was my last upi payment")} onFollowUp={onFollowUp} />);
    expect(screen.getByText(/Your last UPI payment was on/)).toBeTruthy();
    expect(screen.getByText("30 Sep 2026, 4:12 pm", { selector: "strong" })).toBeTruthy();
    expect(screen.getByText("RCP-2026-0912")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /UPI payments this month/ }));
    expect(onFollowUp).toHaveBeenCalledWith("UPI payments this month");
  });

  it("renders stats with deltas and a multi-series chart legend", () => {
    render(<AssistantMessage bundle={mockAgentAnswer("compare cash and upi")} />);
    expect(screen.getByText("Cash (net)")).toBeTruthy();
    expect(screen.getByText("+12.4%")).toBeTruthy();
    expect(screen.getByText("Daily collection by payment mode (net)")).toBeTruthy();
    expect(screen.getAllByText("UPI").length).toBeGreaterThan(0);
  });

  it("shows multi-row results as a table with export", () => {
    render(<AssistantMessage bundle={mockAgentAnswer("top customers")} />);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByText("Lakshmi Menon").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Export/ })).toBeTruthy();
  });

  it("still renders legacy router bundles", () => {
    const legacy: AssistantBundle = {
      summaryText: "Collection report · This month",
      narrative: "You collected ₹500.",
      statCards: [{ label: "Net collected", value: 50_000, valueType: "currency" }],
      chart: null,
      table: null,
    };
    expect(blocksOf(legacy)).toHaveLength(1);
    render(<AssistantMessage bundle={legacy} />);
    expect(screen.getByText("You collected ₹500.")).toBeTruthy();
    expect(screen.getByText("Net collected")).toBeTruthy();
  });
});
