/* @vitest-environment happy-dom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAssistantChat } from "@/src/hooks/useAssistantChat";

const fetchMessages = vi.hoisted(() => vi.fn());
const sendChatTrigger = vi.hoisted(() => vi.fn());

vi.mock("@/src/store/api/admin-api", () => ({
  useLazyListAssistantMessagesQuery: () => [fetchMessages],
  useAssistantChatMutation: () => [
    sendChatTrigger,
    { isLoading: false, error: undefined },
  ],
}));

function messagesPage(id: string, text: string) {
  return {
    items: [{ id: `${id}-msg`, role: "user" as const, text, createdAt: "2026-01-01" }],
    meta: { nextCursor: null, hasMore: false },
  };
}

describe("useAssistantChat reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("ignores stale history loads after switching conversations", async () => {
    let resolveA: (value: unknown) => void = () => {};
    fetchMessages.mockImplementation(({ conversationId }: { conversationId: string }) => ({
      unwrap: () =>
        conversationId === "conv-a"
          ? new Promise((resolve) => {
              resolveA = resolve;
            })
          : Promise.resolve(messagesPage("conv-b", "from-b")),
    }));

    const { result, rerender } = renderHook(
      ({ id }) => useAssistantChat(id),
      { initialProps: { id: "conv-a" as string | null } },
    );

    await waitFor(() => expect(result.current.initialLoading).toBe(true));
    rerender({ id: "conv-b" });
    await waitFor(() =>
      expect(result.current.messages.some((m) => m.role === "user" && m.text === "from-b")).toBe(
        true,
      ),
    );

    await act(async () => {
      resolveA(messagesPage("conv-a", "from-a"));
    });

    expect(
      result.current.messages.some((m) => m.role === "user" && m.text === "from-a"),
    ).toBe(false);
  });

  it("does not append assistant replies after the conversation changed", async () => {
    fetchMessages.mockReturnValue({
      unwrap: () =>
        Promise.resolve({ items: [], meta: { nextCursor: null, hasMore: false } }),
    });

    let resolveSend: (value: unknown) => void = () => {};
    sendChatTrigger.mockReturnValue({
      unwrap: () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
    });

    const { result, rerender } = renderHook(
      ({ id }) => useAssistantChat(id),
      { initialProps: { id: "conv-a" as string | null } },
    );

    await waitFor(() => expect(result.current.initialLoading).toBe(false));

    let sendPromise!: Promise<unknown>;
    await act(async () => {
      sendPromise = result.current.send("Hello", "conv-a");
    });
    rerender({ id: "conv-b" });
    fetchMessages.mockReturnValue({
      unwrap: () => Promise.resolve(messagesPage("conv-b", "history-b")),
    });
    await waitFor(() => expect(result.current.initialLoading).toBe(false));

    await act(async () => {
      resolveSend({
        summaryText: "Stale reply",
        statCards: [],
        chart: null,
        table: null,
        conversationId: "conv-a",
        messageId: "assistant-1",
      });
      await sendPromise;
    });

    expect(result.current.messages.some((m) => m.role === "assistant")).toBe(false);
  });

  it("keeps failed user messages and returns the draft for retry", async () => {
    fetchMessages.mockReturnValue({
      unwrap: () =>
        Promise.resolve({ items: [], meta: { nextCursor: null, hasMore: false } }),
    });
    sendChatTrigger.mockReturnValue({
      unwrap: () => Promise.reject({ status: 503, data: { error: { message: "Unavailable" } } }),
    });

    const { result } = renderHook(() => useAssistantChat(null));

    await waitFor(() => expect(result.current.initialLoading).toBe(false));

    let sendResult: Awaited<ReturnType<typeof result.current.send>> | undefined;
    await act(async () => {
      sendResult = await result.current.send("Draft me", null);
    });

    expect(sendResult?.ok).toBe(false);
    if (sendResult && !sendResult.ok) {
      expect(sendResult.draft).toBe("Draft me");
    }
    const failed = result.current.messages.find((m) => m.role === "user");
    expect(failed?.role).toBe("user");
    if (failed?.role === "user") expect(failed.sendFailed).toBe(true);
    expect(result.current.sendError).toBeTruthy();
  });
});
