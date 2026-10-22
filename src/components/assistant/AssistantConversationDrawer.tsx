"use client";

import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useDeleteAssistantConversationMutation,
  useLazyListAssistantConversationsQuery,
} from "@/src/store/api/admin-api";
import type { AssistantConversationSummary } from "@/src/types/assistant";
import { cn } from "@/lib/utils";

function formatWhen(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function AssistantConversationDrawer({
  open,
  activeId,
  onClose,
  onSelect,
  onNewChat,
}: {
  open: boolean;
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}) {
  const [items, setItems] = useState<AssistantConversationSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fetchConversations] = useLazyListAssistantConversationsQuery();
  const [deleteConversation] = useDeleteAssistantConversationMutation();

  const loadPage = useCallback(
    async (nextCursor?: string | null, replace = false) => {
      setLoading(true);
      try {
        const page = await fetchConversations({
          cursor: nextCursor ?? undefined,
          limit: 20,
        }).unwrap();
        setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [fetchConversations],
  );

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch list when drawer opens
    void loadPage(null, true);
  }, [open, loadPage]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore || !cursor) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      void loadPage(cursor, false);
    }
  };

  if (!open) return null;

  return (
    <div className="absolute inset-y-0 left-0 z-20 flex w-[min(100%,16rem)] flex-col border-r border-[#eaded9] bg-[#faf7f5] shadow-lg">
      <div className="flex items-center justify-between border-b border-[#eaded9] px-3 py-2.5">
        <span className="text-sm font-semibold text-[#28161a]">Chats</span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close chats">
          ×
        </Button>
      </div>
      <div className="p-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 border-[#e4d7d2] bg-white"
          onClick={() => {
            onNewChat();
            onClose();
          }}
        >
          <MessageSquarePlus className="size-4 text-[#730321]" />
          New chat
        </Button>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" onScroll={onScroll}>
        {items.map((conv) => (
          <div
            key={conv._id}
            className={cn(
              "group mb-1 flex items-start gap-1 rounded-xl border px-2 py-2",
              activeId === conv._id
                ? "border-[#730321]/30 bg-white"
                : "border-transparent bg-transparent hover:bg-white",
            )}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                onSelect(conv._id);
                onClose();
              }}
            >
              <div className="truncate text-sm font-medium text-[#28161a]">
                {conv.title || "New chat"}
              </div>
              <div className="truncate text-xs text-[#807478]">
                {formatWhen(conv.lastMessageAt)} · {conv.messageCount} msgs
              </div>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 opacity-0 group-hover:opacity-100"
              aria-label="Delete chat"
              onClick={() => void deleteConversation({ conversationId: conv._id })}
            >
              <Trash2 className="size-3.5 text-[#9a6f6f]" />
            </Button>
          </div>
        ))}
        {loading && (
          <div className="flex justify-center py-2 text-[#807478]">
            <Loader2 className="size-4 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
