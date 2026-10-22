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
import type { AssistantChatMessage } from "@/src/types/assistant";
import { cn } from "@/lib/utils";

const LOAD_OLDER_THRESHOLD_PX = 72;
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
}: {
  messages: AssistantChatMessage[];
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
  }, [initialLoading, messages.length, scrollToLatest]);

  useLayoutEffect(() => {
    applyPrependAnchor(parentRef.current);

    const len = messages.length;
    const firstId = messages[0]?.id ?? null;
    const prevLen = prevLenRef.current;
    const prevFirst = prevFirstIdRef.current;
    const appended =
      len > prevLen && (prevFirst === null || firstId === prevFirst);

    if (
      appended &&
      stickToBottomRef.current &&
      !loadingOlder &&
      !pendingInitialScrollRef.current
    ) {
      scrollToLatest("smooth");
    }

    prevLenRef.current = len;
    prevFirstIdRef.current = firstId;
  }, [messages, applyPrependAnchor, loadingOlder, scrollToLatest]);

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

  if (initialLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[#776a6d]">
        <Loader2 className="mr-2 size-4 animate-spin text-[#730321]" />
        Loading conversation…
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
      onScroll={onScroll}
    >
      {(loadingOlder || hasMore) && (
        <div className="mb-2 flex justify-center py-1 text-xs text-[#807478]">
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
                    "rounded-2xl px-3 py-2.5",
                    msg.role === "user"
                      ? "max-w-[92%] bg-[#730321] text-sm text-white shadow-sm"
                      : "w-full border border-[#eaded9] bg-white text-[#28161a] shadow-sm",
                  )}
                >
                  {msg.role === "user" ? (
                    msg.text
                  ) : (
                    <AssistantMessage bundle={msg.bundle} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div className="mt-2 flex justify-start">
          <div className="flex items-center gap-2 rounded-2xl border border-[#eaded9] bg-white px-3 py-2.5 text-sm text-[#776a6d]">
            <Loader2 className="size-4 animate-spin text-[#730321]" />
            Pulling your numbers…
          </div>
        </div>
      )}
    </div>
  );
}
