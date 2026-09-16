"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import { useGetMessagingMessageQuery } from "@/src/store/api/admin-api";

export function MessageDetailDialog({
  messageId,
  open,
  onOpenChange,
  fallback,
}: {
  messageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallback?: {
    date?: string;
    customer?: string;
    type?: string;
    status?: string;
    cost?: number;
    failure?: string;
  };
}) {
  const query = useGetMessagingMessageQuery(messageId ?? "", {
    skip: !open || !messageId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Message detail</DialogTitle>
          </DialogHeader>
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : query.isError ? (
            <QueryError error={query.error} onRetry={query.refetch} />
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Sent at</dt>
              <dd>
                {String(
                  query.data?.sentAt ??
                    query.data?.createdAt ??
                    fallback?.date ??
                    "—",
                )}
              </dd>
              <dt className="text-muted-foreground">Customer</dt>
              <dd>
                {String(
                  (query.data?.customer as { name?: string })?.name ??
                    query.data?.customerName ??
                    fallback?.customer ??
                    "—",
                )}
              </dd>
              <dt className="text-muted-foreground">Type</dt>
              <dd>
                {String(query.data?.messageType ?? query.data?.type ?? fallback?.type ?? "—").replaceAll(
                  "_",
                  " ",
                )}
              </dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge
                  status={String(
                    query.data?.status ?? fallback?.status ?? "—",
                  )}
                />
              </dd>
              <dt className="text-muted-foreground">Cost</dt>
              <dd>
                {money(
                  Number(
                    query.data?.costPaise != null
                      ? Number(query.data.costPaise) / 100
                      : (fallback?.cost ?? 0),
                  ),
                )}
              </dd>
              {(query.data?.failureReason ??
                query.data?.failure ??
                fallback?.failure) ? (
                <>
                  <dt className="text-muted-foreground">Failure</dt>
                  <dd className="text-red-700">
                    {String(
                      query.data?.failureReason ??
                        query.data?.failure ??
                        fallback?.failure,
                    )}
                  </dd>
                </>
              ) : null}
              {query.data?.body ? (
                <>
                  <dt className="text-muted-foreground">Body</dt>
                  <dd className="col-span-2 whitespace-pre-wrap rounded-md border bg-muted/30 p-3">
                    {String(query.data.body)}
                  </dd>
                </>
              ) : null}
            </dl>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
