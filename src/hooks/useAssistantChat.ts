"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage, parseApiError } from "@/src/lib/api-error";
import { writeAssistantConversationId } from "@/src/lib/assistant-conversation-storage";
import {
  useAssistantChatMutation,
  useLazyListAssistantMessagesQuery,
} from "@/src/store/api/admin-api";
import type {
  AssistantBundle,
  AssistantChatMessage,
  AssistantSendResult,
  AssistantStorageScope as Scope,
} from "@/src/types/assistant";

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

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    storageScopeRef.current = storageScope;
  }, [storageScope]);

  const [fetchMessages] = useLazyListAssistantMessagesQuery();
  const [sendChat, { isLoading, error: mutationError }] =
    useAssistantChatMutation();

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when switching to new chat
      resetLocal();
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
      const userMsg: AssistantChatMessage = {
        id: tempId(),
        role: "user",
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const bundle = await sendChat({
          message: trimmed,
          conversationId: activeConversationId ?? undefined,
        }).unwrap();

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
          writeAssistantConversationId(
            resolvedConversationId,
            storageScopeRef.current,
          );
        }
        const assistantMsg: AssistantChatMessage = {
          id: bundle.messageId ?? tempId(),
          role: "assistant",
          bundle: bundle as AssistantBundle,
        };
        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === userMsg.id && m.role === "user"
              ? { ...m, sendFailed: false }
              : m,
          ),
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
      }
    },
    [sendChat],
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
