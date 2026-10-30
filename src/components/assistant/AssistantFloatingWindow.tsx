"use client";

import {
  ArrowUp,
  CalendarClock,
  ChartLine,
  History,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  TriangleAlert,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AssistantConversationDrawer } from "@/src/components/assistant/AssistantConversationDrawer";
import { AssistantVirtualMessageList } from "@/src/components/assistant/AssistantVirtualMessageList";
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

/** How-to questions: Sidekick answers with an on-screen walkthrough. */
const HOW_TO_EXAMPLES = ["How do I add a customer?", "How do I add a product?", "How do I set today's gold rate?"];

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
      className="grid size-8 place-items-center rounded-lg text-[var(--sk-ink-2)] transition hover:bg-[var(--sk-cream-2)] hover:text-[var(--sk-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sk-maroon)]/40 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * Sidekick chat, docked on the right of the admin shell. On desktop it takes its
 * own column (the page reflows beside it instead of being covered); on phones it
 * opens full-screen. The parent decides width — see AdminShell.
 */
export function AssistantFloatingWindow({
  open,
  onOpenChange,
  wide = false,
  onToggleWide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wide?: boolean;
  onToggleWide?: () => void;
}) {
  const [mobile, setMobile] = useState(false);

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
    const active = open;
    if (active && !prevPanelActiveRef.current) {
      setScrollEpoch((n) => n + 1);
    }
    prevPanelActiveRef.current = active;
    if (active) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 150);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="sidekick flex h-full min-h-0 flex-col"
      role="dialog"
      aria-label={`Analytics ${ASSISTANT_NAME}`}
    >
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(120%_70%_at_50%_0,#fff_0,#fffdf9_50%,var(--sk-cream)_100%)]">
        <header className="relative flex shrink-0 items-center gap-3 border-b border-[var(--sk-line)] bg-white px-4 py-3">
          <SidekickOrb size={32} busy={isLoading} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-bold tracking-tight text-[var(--sk-ink)]">{ASSISTANT_NAME}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sk-gold-soft)] px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-[var(--sk-maroon)]">
                <i className="sk-live-dot block size-1.5 rounded-full bg-[var(--sk-ok)]" />
                Live data
              </span>
            </div>
            <p className="mt-0.5 truncate text-[12px] text-[var(--sk-ink-2)]">
              {isLoading ? <span className="sk-shimmer font-medium">Working on your question…</span> : "Your AI shop analyst"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <HeaderButton label="New chat" disabled={isLoading} onClick={startNewChat}>
              <Plus className="size-4" />
            </HeaderButton>
            <HeaderButton label="Chat history" onClick={() => setHistoryOpen(true)}>
              <History className="size-4" />
            </HeaderButton>
            {!mobile && onToggleWide ? (
              <HeaderButton label={wide ? "Make panel narrower" : "Make panel wider"} onClick={onToggleWide}>
                {wide ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
              </HeaderButton>
            ) : null}
            <HeaderButton label="Close Sidekick" onClick={() => onOpenChange(false)}>
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
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <SidekickOrb size={60} className="sk-pop" />
              <h2 className="sk-rise mt-5 text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-[var(--sk-ink)]" style={{ animationDelay: "60ms" }}>
                Ask anything about your business
              </h2>
              <p className="sk-rise mt-2 max-w-md text-[13.5px] leading-6 text-[var(--sk-ink-2)]" style={{ animationDelay: "120ms" }}>
                Collections, customers, dues, schemes, staff, Digi Gold and store orders, answered from your live data in seconds. Forgot how to do something? Ask, and I&apos;ll show you on screen.
              </p>
              <div className={cn("mt-6 grid w-full gap-2.5", wide && "sm:grid-cols-2")}>
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
              <div className="sk-fade mt-5 flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-[var(--sk-ink-2)]" style={{ animationDelay: "440ms" }}>
                <span>Show me how:</span>
                {HOW_TO_EXAMPLES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void ask(q)}
                    className="rounded-full border border-[#ead9b4] bg-[var(--sk-gold-soft)] px-2.5 py-1 font-medium text-[var(--sk-maroon)] hover:border-[var(--sk-maroon)]"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="sk-fade mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-[var(--sk-ink-2)]" style={{ animationDelay: "480ms" }}>
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
              placeholder={wide ? "Ask anything — e.g. who paid the most this week?" : "Ask anything…"}
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
          <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[11px] text-[var(--sk-ink-2)]">
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <CalendarClock className="size-3 shrink-0" />
              Read-only answers from your live data
            </span>
            {wide ? <span className="shrink-0">Enter to send · Shift+Enter new line</span> : null}
          </div>
        </form>

      </div>
    </div>
  );
}
