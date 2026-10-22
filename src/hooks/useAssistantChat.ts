"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { writeAssistantConversationId } from "@/src/lib/assistant-conversation-storage";
import {
  useAssistantChatMutation,
  useLazyListAssistantMessagesQuery,
} from "@/src/store/api/admin-api";
import type { AssistantBundle, AssistantChatMessage } from "@/src/types/assistant";

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

export function useAssistantChat(conversationId: string | null) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const prependAnchorRef = useRef<number | null>(null);

  const [fetchMessages] = useLazyListAssistantMessagesQuery();
  const [sendChat, { isLoading, error }] = useAssistantChatMutation();

  const resetLocal = useCallback(() => {
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
    prependAnchorRef.current = null;
  }, []);

  const loadInitial = useCallback(
    async (id: string) => {
      setInitialLoading(true);
      try {
        const page = await fetchMessages({ conversationId: id, limit: 25 }).unwrap();
        const oldestFirst = page.items.map(normalizeApiMessage).reverse();
        setMessages(oldestFirst);
        setNextCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } finally {
        setInitialLoading(false);
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
    setLoadingOlder(true);
    try {
      const page = await fetchMessages({
        conversationId,
        cursor: nextCursor,
        limit: 25,
      }).unwrap();
      const older = page.items.map(normalizeApiMessage).reverse();
      setMessages((prev) => [...older, ...prev]);
      setNextCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      setLoadingOlder(false);
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
    async (text: string, activeConversationId: string | null) => {
      const trimmed = text.trim();
      if (!trimmed) return null;

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
        const resolvedConversationId = bundle.conversationId ?? activeConversationId;
        if (resolvedConversationId) {
          writeAssistantConversationId(resolvedConversationId);
        }
        const assistantMsg: AssistantChatMessage = {
          id: bundle.messageId ?? tempId(),
          role: "assistant",
          bundle: bundle as AssistantBundle,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return resolvedConversationId ?? null;
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return null;
      }
    },
    [sendChat],
  );

  return {
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
  };
}
