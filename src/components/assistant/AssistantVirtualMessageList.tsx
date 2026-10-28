"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type UIEvent,
} from "react";
import { AssistantMessage } from "@/src/components/assistant/AssistantMessage";
import { AssistantThinking } from "@/src/components/assistant/AssistantThinking";
import type { AssistantChatMessage, AssistantStep } from "@/src/types/assistant";
import { cn } from "@/lib/utils";

const LOAD_OLDER_THRESHOLD_PX = 72;

/**
 * Smooth-scroll once the virtual list has measured new rows (its height lags a frame or two
 * behind the render), so the target isn't clamped to the old scroll height.
 */
function scrollWhenReady(el: HTMLDivElement, target: () => number | null) {
  let tries = 0;
  const step = () => {
    tries += 1;
    const t = target();
    if (t == null) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max >= t - 2 || tries >= 30) {
      el.scrollTo({ top: Math.min(t, max), behavior: "smooth" });
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const STICK_BOTTOM_THRESHOLD_PX = 120;

export function AssistantVirtualMessageList({
  messages,
  hasMore,
  loadingOlder,
  initialLoading,
  isLoading,
  conversationId,
  scrollEpoch,
  onLoadOlder,
  capturePrependAnchor,
  applyPrependAnchor,
  onRetryFailed,
  liveSteps = [],
  onFollowUp,
}: {
  messages: AssistantChatMessage[];
  liveSteps?: AssistantStep[];
  onFollowUp?: (text: string) => void;
  hasMore: boolean;
  loadingOlder: boolean;
  initialLoading: boolean;
  isLoading: boolean;
  conversationId: string | null;
  /** Bumps when the panel opens so we jump to the latest message once. */
  scrollEpoch: number;
  onLoadOlder: () => void;
  capturePrependAnchor: (scrollHeight: number) => void;
  applyPrependAnchor: (scrollEl: HTMLDivElement | null) => void;
  onRetryFailed?: (messageId: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [, setStickTick] = useState(0);
  const pendingInitialScrollRef = useRef(false);
  const prevFirstIdRef = useRef<string | null>(null);
  const prevLenRef = useRef(0);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual measure API
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 6,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (messages.length === 0) return;
      requestAnimationFrame(() => {
        const el = parentRef.current;
        if (behavior === "smooth" && el) {
          // TanStack's smooth scroll is unreliable with dynamic row sizes — scroll the container directly.
          scrollWhenReady(el, () => virtualizer.getTotalSize() - el.clientHeight);
          return;
        }
        virtualizer.scrollToIndex(messages.length - 1, {
          align: "end",
          behavior,
        });
      });
    },
    [messages.length, virtualizer],
  );

  useEffect(() => {
    prevFirstIdRef.current = null;
    prevLenRef.current = 0;
    pendingInitialScrollRef.current = true;
    stickToBottomRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    if (scrollEpoch < 1) return;
    pendingInitialScrollRef.current = true;
    stickToBottomRef.current = true;
  }, [scrollEpoch]);

  useEffect(() => {
    if (
      !initialLoading &&
      messages.length > 0 &&
      pendingInitialScrollRef.current
    ) {
      pendingInitialScrollRef.current = false;
      scrollToLatest("auto");
    }
    // conversationId: a new chat adopting its id keeps its on-screen messages (no reload), so settle here too.
  }, [initialLoading, messages.length, scrollToLatest, conversationId]);

  useLayoutEffect(() => {
    applyPrependAnchor(parentRef.current);

    const len = messages.length;
    const firstId = messages[0]?.id ?? null;
    const prevLen = prevLenRef.current;
    const prevFirst = prevFirstIdRef.current;
    const appended =
      len > prevLen && (prevFirst === null || firstId === prevFirst);
    // The owner just asked something — always follow the conversation down.
    if (appended && messages[len - 1]?.role === "user") stickToBottomRef.current = true;

    if (
      appended &&
      stickToBottomRef.current &&
      !loadingOlder &&
      !pendingInitialScrollRef.current
    ) {
      const last = messages[len - 1];
      if (last?.role === "assistant" && last.fresh && len >= 2) {
        // A new answer grows as it reveals — pin the question at the top so the whole answer reads downward.
        const el = parentRef.current;
        if (el) {
          scrollWhenReady(el, () => {
            const row = el.querySelector<HTMLElement>(`[data-index="${len - 2}"]`);
            const match = row?.style.transform.match(/translateY\((-?[\d.]+)px\)/);
            return match ? Math.max(0, Number(match[1]) - 8) : null;
          });
        }
      } else {
        scrollToLatest("smooth");
      }
    }

    prevLenRef.current = len;
    prevFirstIdRef.current = firstId;
  }, [messages, applyPrependAnchor, loadingOlder, scrollToLatest, virtualizer]);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <
      STICK_BOTTOM_THRESHOLD_PX;
    if (stickToBottomRef.current !== nearBottom) {
      stickToBottomRef.current = nearBottom;
      setStickTick((n) => n + 1);
    }
    if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX && hasMore && !loadingOlder) {
      capturePrependAnchor(el.scrollHeight);
      onLoadOlder();
    }
  };

  useEffect(() => {
    if (isLoading && stickToBottomRef.current) {
      const el = parentRef.current;
      if (el) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }));
    }
  }, [isLoading, liveSteps.length]);

  if (initialLoading) {
    return (
      <div className="sidekick flex flex-1 items-center justify-center text-sm text-[var(--sk-muted)]">
        <Loader2 className="mr-2 size-4 animate-spin text-[var(--sk-maroon)]" />
        Loading conversation…
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="sidekick min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6"
      onScroll={onScroll}
    >
      {(loadingOlder || hasMore) && (
        <div className="mb-2 flex justify-center py-1 text-xs text-[var(--sk-muted)]">
          {loadingOlder ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Loading older messages…
            </>
          ) : (
            "Scroll up for earlier messages"
          )}
        </div>
      )}

      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const msg = messages[item.index];
          if (!msg) return null;
          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-3"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <div
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    msg.role === "user"
                      ? "sk-pop max-w-[85%] whitespace-pre-wrap rounded-[16px_16px_4px_16px] bg-gradient-to-br from-[var(--sk-maroon-2)] to-[var(--sk-maroon)] px-4 py-2.5 text-[13.5px] font-medium leading-snug text-white shadow-[0_10px_22px_-14px_rgba(115,3,33,0.9)]"
                      : cn(
                          "w-full rounded-[16px_16px_16px_4px] border border-[var(--sk-line)] bg-white px-4 py-3.5 shadow-[var(--sk-shadow)]",
                          msg.fresh && "sk-pop",
                        ),
                  )}
                >
                  {msg.role === "user" ? (
                    <div className="space-y-2">
                      <span>{msg.text}</span>
                      {msg.sendFailed ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-white/85">Not sent</span>
                          {onRetryFailed ? (
                            <button
                              type="button"
                              className="font-semibold underline underline-offset-2"
                              onClick={() => onRetryFailed(msg.id)}
                            >
                              Retry
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <AssistantMessage
                      bundle={msg.bundle}
                      fresh={Boolean(msg.fresh)}
                      onFollowUp={item.index === messages.length - 1 ? onFollowUp : undefined}
                      disabled={isLoading}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div className="mt-2">
          <AssistantThinking steps={liveSteps} />
        </div>
      )}
    </div>
  );
}
