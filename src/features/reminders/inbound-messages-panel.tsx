"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import {
  useGetMessagingInboundDetailQuery,
  useGetMessagingInboundQuery,
  useMarkMessagingInboundReadMutation,
} from "@/src/store/api/admin-api";

export function InboundMessagesPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const list = useGetMessagingInboundQuery({ limit: 50, ...(q.trim() ? { q: q.trim() } : {}) } as any);
  const detail = useGetMessagingInboundDetailQuery(selectedId ?? "", {
    skip: !selectedId,
  });
  const [markRead, markReadState] = useMarkMessagingInboundReadMutation();
  const rows = (list.data?.items ?? []) as Array<Record<string, any>>;

  return (
    <div className="grid gap-5 p-5 lg:grid-cols-[.9fr_1.1fr]">
      <div className="space-y-3">
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value.slice(0, 120))}
          placeholder="Search sender or message"
        />
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No inbound messages.</p>
        ) : (
          rows.map((row) => {
            const id = String(row._id ?? row.id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedId(id)}
                className="w-full rounded-xl border p-3 text-left hover:border-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{String(row.senderMobile ?? "Unknown sender")}</p>
                  <StatusBadge status={String(row.status ?? "RECEIVED")} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {String(row.text ?? `[${row.messageType ?? "message"}]`)}
                </p>
              </button>
            );
          })
        )}
      </div>
      <div className="rounded-xl border p-5">
        {!selectedId ? (
          <p className="text-sm text-muted-foreground">Select a message to inspect it.</p>
        ) : detail.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading message…</p>
        ) : detail.data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{String(detail.data.senderMobile ?? "Unknown sender")}</p>
                <p className="text-xs text-muted-foreground">
                  {detail.data.receivedAt
                    ? new Date(String(detail.data.receivedAt)).toLocaleString()
                    : "—"}
                </p>
              </div>
              <StatusBadge status={String(detail.data.status ?? "RECEIVED")} />
            </div>
            <p className="whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm">
              {String(detail.data.text ?? `[${detail.data.messageType ?? "message"}]`)}
            </p>
            {detail.data.status !== "READ" ? (
              <Button
                disabled={markReadState.isLoading}
                onClick={async () => {
                  try {
                    await markRead(selectedId).unwrap();
                    await Promise.all([detail.refetch(), list.refetch()]);
                  } catch (error) {
                    toastApiError(error, "Could not mark message read");
                  }
                }}
              >
                Mark as read
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-red-700">Could not load this message.</p>
        )}
      </div>
    </div>
  );
}
