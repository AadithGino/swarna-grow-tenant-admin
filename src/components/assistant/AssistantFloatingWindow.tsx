"use client";

import {
  ArrowUp,
  CalendarClock,
  ChartLine,
  History,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  TriangleAlert,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";
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
import { ASSISTANT_NAME, SidekickOrb } from "@/src/components/assistant/sidekick-primitives";
import { useAppSelector } from "@/src/store/hooks";
import type { AssistantStorageScope } from "@/src/types/assistant";

const SUGGESTED = [
  { text: "When was my last UPI payment?", icon: Wallet },
  { text: "Who are my top 5 customers this month?", icon: Trophy },
  { text: "Which customers have 2 or more overdue instalments?", icon: TriangleAlert },
  { text: "Compare cash and UPI collection for the last 30 days", icon: ChartLine },
];

const LANGUAGE_EXAMPLES = ["aaj kitna collection hua?", "ഈ മാസത്തെ കളക്ഷൻ എത്ര?", "Schemes maturing next month"];

function HeaderButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-[var(--sk-muted)] transition hover:bg-[var(--sk-cream-2)] hover:text-[var(--sk-ink)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

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
    liveSteps,
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

  const ask = useCallback(
    async (text: string) => {
      if (isLoading || !text.trim()) return;
      setDraft("");
      const result = await send(text, conversationId);
      if (!result.ok) {
        setDraft(result.draft);
        return;
      }
      if (result.conversationId && result.conversationId !== conversationId) {
        setConversationId(result.conversationId);
      }
    },
    [conversationId, send, isLoading],
  );

  const submit = useCallback(async () => {
    await ask(draft);
  }, [ask, draft]);

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
        className="sidekick fixed bottom-6 right-6 z-[60] flex max-w-[min(100vw-3rem,20rem)] items-center gap-2.5 rounded-full border border-[var(--sk-line-2)] bg-white py-1.5 pl-1.5 pr-4 text-sm font-semibold text-[var(--sk-ink)] shadow-[var(--sk-shadow)] transition hover:-translate-y-0.5"
        onClick={() => setMinimized(false)}
      >
        <SidekickOrb size={28} busy={isLoading} />
        <span className="truncate">{ASSISTANT_NAME}</span>
        {isLoading ? <span className="sk-shimmer text-xs font-medium">thinking…</span> : null}
      </button>
    );
  }

  return (
    <div
      className="sidekick fixed z-[60]"
      style={mobile ? { inset: 0, width: "100%", height: "100dvh" } : expanded ? { inset: 24 } : {
        left: geom.x,
        top: geom.y,
        width: geom.width,
        height: geom.height,
      }}
      role="dialog"
      aria-label={`Analytics ${ASSISTANT_NAME}`}
    >
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden border border-[rgba(115,3,33,0.12)] bg-[radial-gradient(120%_70%_at_50%_0,#fff_0,#fffdf9_50%,var(--sk-cream)_100%)] shadow-[0_2px_6px_rgba(34,18,25,0.05),0_44px_80px_-34px_rgba(62,12,21,0.5)] md:rounded-[20px]">
        <header
          className="relative flex shrink-0 items-center gap-3 border-b border-[var(--sk-line)] bg-white/90 px-4 py-3 backdrop-blur md:cursor-grab md:px-5 md:active:cursor-grabbing"
          onPointerDown={(e) => {
            if (mobile || expanded || (e.target as HTMLElement).closest("[data-no-drag]")) return;
            startDrag("move", e);
          }}
        >
          <SidekickOrb size={34} busy={isLoading} />
          <div className="min-w-0 flex-1 select-none">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-bold tracking-tight text-[var(--sk-ink)]">{ASSISTANT_NAME}</span>
              <span className="hidden items-center gap-1.5 rounded-full bg-[var(--sk-gold-soft)] px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-[var(--sk-maroon)] sm:inline-flex">
                <i className="sk-live-dot block size-1.5 rounded-full bg-[var(--sk-ok)]" />
                AI analyst · live data
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--sk-muted)]">
              {isLoading ? <span className="sk-shimmer font-medium">Working on your question…</span> : mobile ? "AI analyst · live data" : "Ask anything about your shop, in your own words"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5" data-no-drag>
            <HeaderButton label="New chat" disabled={isLoading} onClick={startNewChat}>
              <Plus className="size-4" />
            </HeaderButton>
            <HeaderButton label="Chat history" onClick={() => setHistoryOpen(true)}>
              <History className="size-4" />
            </HeaderButton>
            {!mobile ? (
              <HeaderButton label={expanded ? "Restore window" : "Expand workspace"} onClick={() => setExpanded((value) => !value)}>
                {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </HeaderButton>
            ) : null}
            <HeaderButton label="Minimize" onClick={() => setMinimized(true)}>
              <Minus className="size-4" />
            </HeaderButton>
            <HeaderButton label="Close" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
            </HeaderButton>
          </div>
          {isLoading ? (
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-[rgba(115,3,33,0.08)]">
              <i className="sk-sweep block h-full w-2/5 bg-gradient-to-r from-transparent via-[var(--sk-maroon)] to-transparent" />
            </span>
          ) : null}
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
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 md:px-10 md:py-10">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <SidekickOrb size={60} className="sk-pop" />
              <h2 className="sk-rise mt-5 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-[var(--sk-ink)] md:text-[30px]" style={{ animationDelay: "60ms" }}>
                Ask anything about your business
              </h2>
              <p className="sk-rise mt-2 max-w-md text-[13.5px] leading-6 text-[var(--sk-muted)]" style={{ animationDelay: "120ms" }}>
                Collections, customers, dues, schemes, staff, Digi Gold and store orders — answered from your live data in seconds.
              </p>
              <div className="mt-6 grid w-full gap-2.5 sm:grid-cols-2">
                {SUGGESTED.map(({ text, icon: Icon }, i) => (
                  <button
                    key={text}
                    type="button"
                    disabled={isLoading}
                    className="sk-pop group flex items-center gap-3 rounded-xl border border-[var(--sk-line)] bg-white px-3.5 py-3 text-left text-[13px] font-medium text-[var(--sk-ink-2)] transition hover:-translate-y-0.5 hover:border-[var(--sk-maroon)] hover:text-[var(--sk-maroon)] hover:shadow-[var(--sk-shadow)] disabled:opacity-50"
                    style={{ animationDelay: `${180 + i * 70}ms` }}
                    onClick={() => void ask(text)}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--sk-gold-soft)] text-[var(--sk-maroon)]">
                      <Icon className="size-4" />
                    </span>
                    <span className="leading-snug">{text}</span>
                  </button>
                ))}
              </div>
              <div className="sk-fade mt-6 flex flex-wrap items-center justify-center gap-1.5 text-[11.5px] text-[var(--sk-muted)]" style={{ animationDelay: "480ms" }}>
                <span>Ask your way:</span>
                {LANGUAGE_EXAMPLES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void ask(q)}
                    className="rounded-full border border-dashed border-[var(--sk-line-2)] bg-white/70 px-2.5 py-1 font-medium text-[var(--sk-ink-2)] hover:border-[var(--sk-maroon)] hover:text-[var(--sk-maroon)]"
                  >
                    {q}
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
            onRetryFailed={(messageId) => void retrySend(messageId)}
            liveSteps={liveSteps}
            onFollowUp={(text) => void ask(text)}
          />
        )}

        {sendError ? (
          <p className="mx-4 mb-1 rounded-xl border border-[#f1c7c0] bg-[var(--sk-bad-soft)] px-3 py-2 text-[13px] text-[var(--sk-bad)]">
            {sendError}
          </p>
        ) : null}

        <form
          className="shrink-0 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div
            className={cn(
              "flex items-end gap-2 rounded-[14px] border bg-white py-1.5 pl-3.5 pr-1.5 shadow-[0_10px_24px_-18px_rgba(62,12,21,0.5)] transition",
              "border-[var(--sk-line-2)] focus-within:border-[var(--sk-maroon)] focus-within:shadow-[0_0_0_3px_rgba(115,3,33,0.08),0_10px_24px_-18px_rgba(62,12,21,0.5)]",
            )}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={mobile ? "Ask anything…" : "Ask anything — e.g. who paid the most this week?"}
              aria-label={`Message ${ASSISTANT_NAME}`}
              rows={1}
              maxLength={2000}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void submit();
                }
              }}
              disabled={isLoading}
              className="max-h-36 min-h-[38px] flex-1 resize-none border-0 bg-transparent py-2 text-[14px] text-[var(--sk-ink)] outline-none placeholder:text-[var(--sk-muted)] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !draft.trim()}
              className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-[var(--sk-maroon-2)] to-[var(--sk-maroon)] text-white shadow-[0_8px_18px_-10px_rgba(115,3,33,0.9)] transition hover:-translate-y-px disabled:opacity-40 disabled:hover:translate-y-0"
              aria-label="Send"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" strokeWidth={2.5} />}
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[10.5px] text-[var(--sk-muted)]">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" />
              Answers come from your live data · read-only
            </span>
            <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
          </div>
        </form>

        {!mobile && !expanded ? <div
          className="absolute bottom-0 right-0 z-10 size-5 cursor-se-resize"
          aria-hidden
          onPointerDown={(e) => startDrag("resize", e)}
        >
          <svg
            viewBox="0 0 16 16"
            className="absolute bottom-1 right-1 size-3 text-[var(--sk-line-2)]"
            fill="currentColor"
          >
            <path d="M14 14H10V12H12V10H14V14ZM14 10H12V8H14V10ZM10 10H8V8H10V10Z" />
          </svg>
        </div> : null}
      </div>
    </div>
  );
}
