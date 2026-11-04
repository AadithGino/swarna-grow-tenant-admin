"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { env } from "@/src/config/env";
import { apiErrorMessage, parseApiError } from "@/src/lib/api-error";
import { AssistantStreamUnsupported, streamAssistantChat } from "@/src/lib/assistant-stream";
import { writeAssistantConversationId } from "@/src/lib/assistant-conversation-storage";
import {
  useAssistantChatMutation,
  useLazyListAssistantMessagesQuery,
} from "@/src/store/api/admin-api";
import type {
  AssistantBundle,
  AssistantChatMessage,
  AssistantSendResult,
  AssistantStep,
  AssistantStorageScope as Scope,
} from "@/src/types/assistant";

const THINK_STEP: AssistantStep = { id: "think", label: "Understanding your question", status: "running" };

/** Mock mode has no live tool events — show plausible steps so the UI can be previewed. */
function mockStepsFor(text: string): AssistantStep[] {
  const q = text.toLowerCase();
  const label = /upi|cash|payment|paid|collect/.test(q)
    ? "Looking through your payments"
    : /overdue|due|defaulter/.test(q)
      ? "Checking overdue instalments"
      : /customer|who/.test(q)
        ? "Looking up your customers"
        : "Querying your data";
  return [{ id: "s1", label, status: "running", tool: "query_data" }];
}

function mergeStep(list: AssistantStep[], step: AssistantStep): AssistantStep[] {
  if (step.id === "compose") return list;
  const idx = list.findIndex((s) => s.id === step.id);
  if (idx === -1) return [...list, step];
  const next = list.slice();
  next[idx] = { ...next[idx], ...step };
  return next;
}

function tempId() {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeApiMessage(row: AssistantChatMessage): AssistantChatMessage {
  if (row.role === "user") {
    return { id: row.id, role: "user", text: row.text, createdAt: row.createdAt };
  }
  return {
    id: row.id,
    role: "assistant",
    bundle: row.bundle,
    createdAt: row.createdAt,
  };
}

const SEND_ERROR_FALLBACK =
  "Could not reach Sidekick. Check that the API is running and assistant is enabled.";

function sendErrorMessage(err: unknown): string {
  const parsed = parseApiError(err, SEND_ERROR_FALLBACK);
  if (parsed.code === "ASSISTANT_DISABLED") {
    return "Sidekick is disabled for this tenant. Ask an owner to enable it.";
  }
  if (parsed.httpStatus === 403) {
    return "You do not have permission to use Sidekick.";
  }
  return apiErrorMessage(err, SEND_ERROR_FALLBACK);
}

export function useAssistantChat(
  conversationId: string | null,
  storageScope?: Scope | null,
) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const prependAnchorRef = useRef<number | null>(null);
  const conversationRef = useRef(conversationId);
  const loadGenerationRef = useRef(0);
  const messagesRef = useRef(messages);
  const storageScopeRef = useRef<Scope | null | undefined>(storageScope);
  const adoptedConversationRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    storageScopeRef.current = storageScope;
  }, [storageScope]);

  const [fetchMessages] = useLazyListAssistantMessagesQuery();
  const [sendChat, { isLoading: mutationLoading, error: mutationError }] =
    useAssistantChatMutation();
  const [sending, setSending] = useState(false);
  const [liveSteps, setLiveSteps] = useState<AssistantStep[]>([]);
  const isLoading = sending || mutationLoading;

  /** Live streaming in API mode; mock mode (and old APIs) use the plain JSON endpoint. */
  const requestAnswer = useCallback(
    async (message: string, conversationId: string | null): Promise<AssistantBundle> => {
      if (env.useMocks) {
        const steps = mockStepsFor(message);
        const timer = window.setTimeout(() => {
          setLiveSteps((prev) => mergeStep(mergeStep(prev, { ...THINK_STEP, status: "done" }), steps[0]));
        }, 450);
        try {
          return (await sendChat({ message, conversationId: conversationId ?? undefined }).unwrap()) as AssistantBundle;
        } finally {
          window.clearTimeout(timer);
        }
      }
      try {
        return await streamAssistantChat({
          message,
          conversationId,
          onStep: (step) => setLiveSteps((prev) => mergeStep(prev, step)),
        });
      } catch (err) {
        if (err instanceof AssistantStreamUnsupported) {
          return (await sendChat({ message, conversationId: conversationId ?? undefined }).unwrap()) as AssistantBundle;
        }
        throw err;
      }
    },
    [sendChat],
  );

  const resetLocal = useCallback(() => {
    loadGenerationRef.current += 1;
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
    setSendError(null);
    prependAnchorRef.current = null;
  }, []);

  useEffect(() => {
    conversationRef.current = conversationId;
    loadGenerationRef.current += 1;
    setSendError(null);
  }, [conversationId]);

  const loadInitial = useCallback(
    async (id: string) => {
      const generation = loadGenerationRef.current;
      setInitialLoading(true);
      try {
        const page = await fetchMessages({ conversationId: id, limit: 25 }).unwrap();
        if (
          generation !== loadGenerationRef.current ||
          conversationRef.current !== id
        ) {
          return;
        }
        const oldestFirst = page.items.map(normalizeApiMessage).reverse();
        setMessages(oldestFirst);
        setNextCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } finally {
        if (
          generation === loadGenerationRef.current &&
          conversationRef.current === id
        ) {
          setInitialLoading(false);
        }
      }
    },
    [fetchMessages],
  );

  useEffect(() => {
    if (!conversationId) {
       
      resetLocal();
      return;
    }
    // A brand-new chat just got its id from our own send — the messages are already on screen.
    if (adoptedConversationRef.current === conversationId) {
      adoptedConversationRef.current = null;
      return;
    }
    void loadInitial(conversationId);
  }, [conversationId, loadInitial, resetLocal]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || !hasMore || loadingOlder || !nextCursor) return;
    const generation = loadGenerationRef.current;
    const id = conversationId;
    setLoadingOlder(true);
    try {
      const page = await fetchMessages({
        conversationId: id,
        cursor: nextCursor,
        limit: 25,
      }).unwrap();
      if (
        generation !== loadGenerationRef.current ||
        conversationRef.current !== id
      ) {
        return;
      }
      const older = page.items.map(normalizeApiMessage).reverse();
      setMessages((prev) => [...older, ...prev]);
      setNextCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      if (
        generation === loadGenerationRef.current &&
        conversationRef.current === id
      ) {
        setLoadingOlder(false);
      }
    }
  }, [conversationId, fetchMessages, hasMore, loadingOlder, nextCursor]);

  const capturePrependAnchor = useCallback((scrollHeight: number) => {
    prependAnchorRef.current = scrollHeight;
  }, []);

  const applyPrependAnchor = useCallback((scrollEl: HTMLDivElement | null) => {
    if (!scrollEl || prependAnchorRef.current == null) return;
    const delta = scrollEl.scrollHeight - prependAnchorRef.current;
    scrollEl.scrollTop += delta;
    prependAnchorRef.current = null;
  }, []);

  const send = useCallback(
    async (
      text: string,
      activeConversationId: string | null,
    ): Promise<AssistantSendResult> => {
      const trimmed = text.trim();
      if (!trimmed) return { ok: true, conversationId: activeConversationId };

      const generation = loadGenerationRef.current;
      const ownerConversationId = activeConversationId;

      setSendError(null);
      setSending(true);
      setLiveSteps([THINK_STEP]);
      const userMsg: AssistantChatMessage = {
        id: tempId(),
        role: "user",
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const bundle = await requestAnswer(trimmed, activeConversationId);

        if (generation !== loadGenerationRef.current) {
          return {
            ok: false,
            draft: trimmed,
            message: "Conversation changed before Sidekick replied.",
          };
        }

        const resolvedConversationId =
          bundle.conversationId ?? activeConversationId;
        const stillSameConversation =
          conversationRef.current === ownerConversationId ||
          (ownerConversationId == null &&
            conversationRef.current === resolvedConversationId);

        if (!stillSameConversation) {
          return { ok: true, conversationId: resolvedConversationId ?? null };
        }

        if (resolvedConversationId) {
          if (ownerConversationId == null) adoptedConversationRef.current = resolvedConversationId;
          writeAssistantConversationId(
            resolvedConversationId,
            storageScopeRef.current,
          );
        }
        const assistantMsg: AssistantChatMessage = {
          id: bundle.messageId ?? tempId(),
          role: "assistant",
          bundle: bundle as AssistantBundle,
          fresh: true,
        };
        setMessages((prev) => [
          ...prev.map((m) => {
            if (m.id === userMsg.id && m.role === "user") return { ...m, sendFailed: false };
            if (m.role === "assistant" && m.fresh) return { ...m, fresh: false };
            return m;
          }),
          assistantMsg,
        ]);
        return { ok: true, conversationId: resolvedConversationId ?? null };
      } catch (err) {
        if (generation !== loadGenerationRef.current) {
          return {
            ok: false,
            draft: trimmed,
            message: sendErrorMessage(err),
          };
        }
        const message = sendErrorMessage(err);
        setSendError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id && m.role === "user"
              ? { ...m, sendFailed: true }
              : m,
          ),
        );
        return { ok: false, draft: trimmed, message };
      } finally {
        setSending(false);
        setLiveSteps([]);
      }
    },
    [requestAnswer],
  );

  const retrySend = useCallback(
    async (failedMessageId: string): Promise<AssistantSendResult> => {
      const failed = messagesRef.current.find(
        (m) => m.id === failedMessageId && m.role === "user",
      );
      if (!failed || failed.role !== "user") {
        return { ok: false, draft: "", message: "Message not found." };
      }
      setMessages((prev) => prev.filter((m) => m.id !== failedMessageId));
      return send(failed.text, conversationRef.current);
    },
    [send],
  );

  const clearSendError = useCallback(() => setSendError(null), []);

  return {
    messages,
    liveSteps,
    send,
    retrySend,
    loadOlder,
    hasMore,
    loadingOlder,
    initialLoading,
    isLoading,
    error: mutationError,
    sendError,
    clearSendError,
    resetLocal,
    capturePrependAnchor,
    applyPrependAnchor,
  };
}
