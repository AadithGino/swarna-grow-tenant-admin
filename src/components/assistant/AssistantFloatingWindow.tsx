"use client";

import {
  GripHorizontal,
  History,
  Loader2,
  MessageCircle,
  Minimize2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssistantConversationDrawer } from "@/src/components/assistant/AssistantConversationDrawer";
import { AssistantVirtualMessageList } from "@/src/components/assistant/AssistantVirtualMessageList";
import {
  clampAssistantGeometry,
  readAssistantGeometry,
  writeAssistantGeometry,
  type AssistantPanelGeometry,
} from "@/src/components/assistant/assistant-panel-geometry";
import {
  clearAssistantConversationId,
  readAssistantConversationId,
  writeAssistantConversationId,
} from "@/src/lib/assistant-conversation-storage";
import { useAssistantChat } from "@/src/hooks/useAssistantChat";

const SUGGESTED = [
  "Today's collection by branch",
  "How much did we collect in the last 30 days?",
  "Overdue customers",
  "Top branches this month",
];

type DragKind = "move" | "resize";

export function AssistantFloatingWindow({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [minimized, setMinimized] = useState(false);
  const [geom, setGeom] = useState<AssistantPanelGeometry>(() =>
    readAssistantGeometry(),
  );
  const dragRef = useRef<{
    kind: DragKind;
    startX: number;
    startY: number;
    origin: AssistantPanelGeometry;
  } | null>(null);
  const startDragRef = useRef<
    (kind: DragKind, e: PointerEvent, origin: AssistantPanelGeometry) => void
  >(() => {});

  const [conversationId, setConversationId] = useState<string | null>(() =>
    readAssistantConversationId(),
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scrollEpoch, setScrollEpoch] = useState(0);
  const prevPanelActiveRef = useRef(false);
  const {
    messages,
    send,
    loadOlder,
    hasMore,
    loadingOlder,
    initialLoading,
    isLoading,
    error,
    resetLocal,
    capturePrependAnchor,
    applyPrependAnchor,
  } = useAssistantChat(conversationId);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(async () => {
    const text = draft;
    if (!text.trim()) return;
    setDraft("");
    const nextId = await send(text, conversationId);
    if (nextId && nextId !== conversationId) {
      setConversationId(nextId);
    }
  }, [conversationId, draft, send]);

  const startNewChat = useCallback(() => {
    setConversationId(null);
    clearAssistantConversationId();
    resetLocal();
  }, [resetLocal]);

  useEffect(() => {
    const active = open && !minimized;
    if (active && !prevPanelActiveRef.current) {
      setScrollEpoch((n) => n + 1);
    }
    prevPanelActiveRef.current = active;
    if (active) {
      window.setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, minimized]);

  useEffect(() => {
    writeAssistantGeometry(geom);
  }, [geom]);

  useEffect(() => {
    const onResize = () => {
      setGeom((g) => clampAssistantGeometry(g));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const { origin } = drag;
      if (drag.kind === "move") {
        setGeom(
          clampAssistantGeometry({
            ...origin,
            x: origin.x + dx,
            y: origin.y + dy,
          }),
        );
        return;
      }
      setGeom(
        clampAssistantGeometry({
          ...origin,
          width: origin.width + dx,
          height: origin.height + dy,
        }),
      );
    };

    const endDrag = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };

    const onStart = (
      kind: DragKind,
      e: PointerEvent,
      origin: AssistantPanelGeometry,
    ) => {
      if (e.button !== 0) return;
      dragRef.current = {
        kind,
        startX: e.clientX,
        startY: e.clientY,
        origin,
      };
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    };

    startDragRef.current = onStart;
    return () => endDrag();
  }, []);

  const startDrag = useCallback(
    (kind: DragKind, e: ReactPointerEvent) => {
      e.preventDefault();
      startDragRef.current(kind, e.nativeEvent, geom);
    },
    [geom],
  );

  if (!open) return null;

  if (minimized) {
    return (
      <button
        type="button"
        className="fixed bottom-6 right-6 z-[60] flex max-w-[min(100vw-3rem,20rem)] items-center gap-2 rounded-full border border-[#e4d7d2] bg-white px-4 py-2.5 text-sm font-medium text-[#28161a] shadow-lg transition hover:border-[#730321]/30"
        onClick={() => setMinimized(false)}
      >
        <Sparkles className="size-4 text-[#730321]" />
        <span className="truncate">Analytics Sidekick</span>
        {isLoading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-[#730321]" />
        ) : null}
      </button>
    );
  }

  return (
    <div
      className="fixed z-[60]"
      style={{
        left: geom.x,
        top: geom.y,
        width: geom.width,
        height: geom.height,
      }}
      role="dialog"
      aria-label="Analytics Sidekick"
    >
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#e4d7d2] bg-white shadow-2xl">
        <header
          className="flex shrink-0 cursor-grab items-start gap-2 border-b border-[#eaded9] bg-[#faf7f5] px-3 py-3 active:cursor-grabbing"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
            startDrag("move", e);
          }}
        >
          <GripHorizontal
            className="mt-1 size-4 shrink-0 text-[#b8a8ac]"
            aria-hidden
          />
          <div className="min-w-0 flex-1 select-none">
            <div className="flex items-center gap-2 text-[#28161a]">
              <span className="grid size-8 place-items-center rounded-full bg-[#f7ecee] text-[#730321]">
                <MessageCircle className="size-4" />
              </span>
              <span className="truncate text-sm font-semibold">
                Analytics Sidekick
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-[#776a6d]">
              Live tenant data · scoped to your role
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5" data-no-drag>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-[#776a6d] hover:text-[#28161a]"
              aria-label="Chat history"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-[#776a6d] hover:text-[#28161a]"
              aria-label="Minimize"
              onClick={() => setMinimized(true)}
            >
              <Minimize2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-[#776a6d] hover:text-[#28161a]"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <AssistantConversationDrawer
          open={historyOpen}
          activeId={conversationId}
          onClose={() => setHistoryOpen(false)}
          onSelect={(id) => {
            setConversationId(id);
            writeAssistantConversationId(id);
          }}
          onNewChat={startNewChat}
        />

        {messages.length === 0 &&
        !isLoading &&
        !initialLoading &&
        !conversationId ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-3 rounded-2xl border border-dashed border-[#e4d7d2] bg-[#faf7f5] p-4">
              <p className="text-sm text-[#776a6d]">
                Try collections, defaulters, branches, or customers.
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTED.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-xl border border-[#e4d7d2] bg-white px-3 py-2 text-left text-sm font-medium text-[#4f3d41] transition hover:border-[#730321]/30"
                    onClick={() => {
                      void (async () => {
                        const nextId = await send(prompt, conversationId);
                        if (nextId) setConversationId(nextId);
                      })();
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <AssistantVirtualMessageList
            messages={messages}
            hasMore={hasMore}
            loadingOlder={loadingOlder}
            initialLoading={initialLoading}
            isLoading={isLoading}
            conversationId={conversationId}
            scrollEpoch={scrollEpoch}
            onLoadOlder={() => void loadOlder()}
            capturePrependAnchor={capturePrependAnchor}
            applyPrependAnchor={applyPrependAnchor}
          />
        )}

        {error ? (
          <p className="mx-3 mb-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Could not reach Sidekick. Check that the API is running and
            assistant is enabled.
          </p>
        ) : null}

        <form
          className="shrink-0 border-t border-[#eaded9] bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about your store…"
              disabled={isLoading}
              className="border-[#e4d7d2] bg-[#faf7f5]"
            />
            <Button
              type="submit"
              disabled={isLoading || !draft.trim()}
              className="shrink-0 bg-[#730321] hover:bg-[#5a021a]"
              aria-label="Send"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </form>

        <div
          className="absolute bottom-0 right-0 z-10 size-5 cursor-se-resize"
          aria-hidden
          onPointerDown={(e) => startDrag("resize", e)}
        >
          <svg
            viewBox="0 0 16 16"
            className="absolute bottom-1 right-1 size-3 text-[#c4b4b8]"
            fill="currentColor"
          >
            <path d="M14 14H10V12H12V10H14V14ZM14 10H12V8H14V10ZM10 10H8V8H10V10Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
