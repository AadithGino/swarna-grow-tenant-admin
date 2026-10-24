"use client";

import {
  GripHorizontal,
  History,
  Loader2,
  MessageCircle,
  Maximize2,
  Minimize2,
  Plus,
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
import { Textarea } from "@/components/ui/textarea";
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
import { useAppSelector } from "@/src/store/hooks";
import type { AssistantStorageScope } from "@/src/types/assistant";

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
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(false);
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

  const session = useAppSelector((s) => s.session.session);
  const storageScope: AssistantStorageScope | null = session
    ? { tenantId: session.tenant.id, userId: session.user.id }
    : null;
  const [conversationId, setConversationId] = useState<string | null>(() =>
    readAssistantConversationId(storageScope),
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
    sendError,
    retrySend,
    resetLocal,
    capturePrependAnchor,
    applyPrependAnchor,
  } = useAssistantChat(conversationId, storageScope);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!storageScope) return;
    setConversationId(readAssistantConversationId(storageScope));
  }, [storageScope?.tenantId, storageScope?.userId]);

  const submit = useCallback(async () => {
    if (isLoading) return;
    const text = draft;
    if (!text.trim()) return;
    const result = await send(text, conversationId);
    if (!result.ok) {
      setDraft(result.draft);
      return;
    }
    setDraft("");
    if (result.conversationId && result.conversationId !== conversationId) {
      setConversationId(result.conversationId);
    }
  }, [conversationId, draft, send, isLoading]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !historyOpen) onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open, historyOpen, onOpenChange]);

  const startNewChat = useCallback(() => {
    setConversationId(null);
    clearAssistantConversationId(storageScope);
    resetLocal();
  }, [resetLocal, storageScope]);

  useEffect(() => {
    const active = open && !minimized;
    if (active && !prevPanelActiveRef.current) {
      setScrollEpoch((n) => n + 1);
    }
    prevPanelActiveRef.current = active;
    if (active) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 150);
      return () => window.clearTimeout(timer);
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
      style={mobile ? { inset: 0, width: "100%", height: "100dvh" } : expanded ? { inset: 24 } : {
        left: geom.x,
        top: geom.y,
        width: geom.width,
        height: geom.height,
      }}
      role="dialog"
      aria-label="Analytics Sidekick"
    >
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden border border-[#e4d7d2] bg-[#fbf8f5] shadow-2xl md:rounded-2xl">
        <header
          className="flex shrink-0 items-center gap-3 border-b border-[#eaded9] bg-white px-4 py-4 md:cursor-grab md:px-6 md:active:cursor-grabbing"
          onPointerDown={(e) => {
            if (mobile || expanded || (e.target as HTMLElement).closest("[data-no-drag]")) return;
            startDrag("move", e);
          }}
        >
          <GripHorizontal
            className="hidden size-4 shrink-0 text-[#b8a8ac] md:block"
            aria-hidden
          />
          <div className="min-w-0 flex-1 select-none">
            <div className="flex items-center gap-2 text-[#28161a]">
              <span className="grid size-8 place-items-center rounded-full bg-[#f7ecee] text-[#730321]">
                <MessageCircle className="size-4" />
              </span>
              <span className="truncate text-base font-semibold">
                Sidekick <span className="ml-1 text-xs font-normal text-[#9a6f2a]">Analytics</span>
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-[#776a6d]">
              Collections, customers & store performance
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5" data-no-drag>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="New chat" disabled={isLoading} onClick={startNewChat}>
              <Plus className="size-4" />
            </Button>
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
            {!mobile ? <Button type="button" variant="ghost" size="icon-sm" aria-label={expanded ? "Restore window" : "Expand workspace"} onClick={() => setExpanded((value) => !value)}>
              <Maximize2 className="size-4" />
            </Button> : null}
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
            writeAssistantConversationId(id, storageScope);
          }}
          onNewChat={startNewChat}
        />

        {messages.length === 0 &&
        !isLoading &&
        !initialLoading &&
        !conversationId ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 md:px-12 md:py-12">
            <div className="mx-auto max-w-2xl space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e7d6bc] bg-[#fff8eb] px-3 py-1.5 text-xs font-medium text-[#876020]"><Sparkles className="size-3.5" />Your business, in conversation</span>
              <div><h2 className="text-3xl font-semibold tracking-tight text-[#28161a] md:text-4xl">What would you like<br />to understand today?</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-[#776a6d]">Explore your collections, spot overdue accounts, or compare showrooms. Ask a follow-up to go deeper.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {SUGGESTED.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isLoading}
                    className="min-h-20 rounded-2xl border border-[#e4d7d2] bg-white px-4 py-4 text-left text-sm font-medium text-[#4f3d41] shadow-sm transition hover:border-[#730321]/40 hover:bg-[#fffafb] disabled:opacity-50"
                    onClick={() => {
                      void (async () => {
                        const result = await send(prompt, conversationId);
                        if (result.ok && result.conversationId) {
                          setConversationId(result.conversationId);
                        }
                      })();
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <p className="text-xs leading-5 text-[#887a7d]">Read-only analytics · Verify figures in the source report before acting.</p>
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
            onRetryFailed={(messageId) => void retrySend(messageId)}
          />
        )}

        {sendError ? (
          <p className="mx-3 mb-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {sendError}
          </p>
        ) : null}

        <form
          className="shrink-0 border-t border-[#eaded9] bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-[#d9c8c1] bg-[#faf7f5] p-2 focus-within:ring-2 focus-within:ring-[#730321]/15">
            <Textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about your store…"
              aria-label="Message Sidekick"
              rows={2}
              maxLength={2000}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void submit();
                }
              }}
              disabled={isLoading}
              className="max-h-40 min-h-14 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              disabled={isLoading || !draft.trim()}
              className="size-11 shrink-0 rounded-xl bg-[#730321] hover:bg-[#5a021a]"
              aria-label="Send"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[#887a7d]"><span>Answers may be cached for up to 2 minutes.</span><span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span></div>
        </form>

        {!mobile && !expanded ? <div
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
        </div> : null}
      </div>
    </div>
  );
}
