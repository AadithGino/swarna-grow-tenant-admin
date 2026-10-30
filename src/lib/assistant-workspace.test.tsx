import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantFloatingWindow } from "@/src/components/assistant/AssistantFloatingWindow";

const chat = vi.hoisted(() => ({
  send: vi.fn(async () => ({ ok: true as const, conversationId: "conversation-1" })),
  resetLocal: vi.fn(),
}));
vi.mock("@/src/hooks/useAssistantChat", () => ({ useAssistantChat: () => ({
  ...chat, messages: [], loadOlder: vi.fn(), hasMore: false, loadingOlder: false,
  initialLoading: false, isLoading: false, error: null, sendError: null, retrySend: vi.fn(),
  capturePrependAnchor: vi.fn(), applyPrependAnchor: vi.fn(),
}) }));
vi.mock("@/src/store/hooks", () => ({
  useAppSelector: (selector: (s: { session: { session: null } }) => unknown) =>
    selector({ session: { session: null } }),
}));
vi.mock("@/src/components/assistant/AssistantConversationDrawer", () => ({ AssistantConversationDrawer: () => null }));
vi.mock("@/src/components/assistant/AssistantVirtualMessageList", () => ({ AssistantVirtualMessageList: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({
    matches: window.innerWidth <= 767, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) });
});
afterEach(cleanup);

describe("Sidekick workspace", () => {
  it("docks beside the page and can be widened instead of floating over it", () => {
    const toggleWide = vi.fn();
    render(<AssistantFloatingWindow open onOpenChange={vi.fn()} onToggleWide={toggleWide} />);
    const dialog = screen.getByRole("dialog", { name: "Analytics Sidekick" });
    // No absolute geometry: the parent column sizes the panel.
    expect(dialog.style.width).toBe("");
    expect(screen.queryByRole("button", { name: "Minimize" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Make panel wider" }));
    expect(toggleWide).toHaveBeenCalled();
  });
  it("hides the width toggle on phones and keeps an accessible composer", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    render(<AssistantFloatingWindow open onOpenChange={vi.fn()} onToggleWide={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Make panel wider" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Message Sidekick" })).toBeTruthy();
  });
  it("allows multiline composition and sends on Enter", () => {
    render(<AssistantFloatingWindow open onOpenChange={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Message Sidekick" });
    fireEvent.change(input, { target: { value: "Collections\nby branch" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(chat.send).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(chat.send).toHaveBeenCalledWith("Collections\nby branch", null);
  });
  it("closes with Escape and exposes new-chat without opening history", () => {
    const close = vi.fn();
    render(<AssistantFloatingWindow open onOpenChange={close} />);
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(chat.resetLocal).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(close).toHaveBeenCalledWith(false);
  });
});
