"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetDigitalMetalsBankVerificationQueueQuery } from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";

export function DigitalMetalsBankVerificationPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const [status, setStatus] = useState("PENDING_VERIFICATION");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const queue = useGetDigitalMetalsBankVerificationQueueQuery(
    { status: status === "ALL" ? undefined : status, limit: 25, cursor },
    { skip: !ent.workspaceVisible },
  );

  if (ent.loading || queue.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <PageHeader title="Bank verification" />
        <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>
      </div>
    );
  }
  if (queue.isError) return <QueryError error={queue.error} onRetry={queue.refetch} />;

  const items = queue.data?.items ?? [];
  const meta = queue.data?.meta;

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-bank-verification-queue">
      <PageHeader
        eyebrow="Digital metals"
        title="Bank verification queue"
        description="Manual verification for sell payout accounts. Full account numbers are never shown here."
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Status</p>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setCursor(undefined);
              setCursors([undefined]);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING_VERIFICATION">Pending verification</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Surface title={`Accounts (${items.length}${meta?.hasMore ? "+" : ""})`}>
        <div className="divide-y">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No matching bank destinations.</p>
          ) : (
            items.map((row) => {
              const customer = row.customer as { id?: string; name?: string; customerNumber?: string } | null;
              return (
                <div key={String(row.id)} className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-medium">{String(row.accountHolderName ?? "Account")}</p>
                    <p className="text-xs text-muted-foreground">
                      ****{String(row.accountLast4 ?? "????")} · {String(row.ifsc ?? "—")}
                      {row.bankName ? ` · ${String(row.bankName)}` : ""}
                    </p>
                    <p className="mt-1 text-xs">
                      {customer?.name ? (
                        <Link href={`/customers/${customer.id}`} className="underline underline-offset-2">
                          {customer.name}
                          {customer.customerNumber ? ` (#${customer.customerNumber})` : ""}
                        </Link>
                      ) : (
                        "Customer"
                      )}
                    </p>
                  </div>
                  <StatusBadge status={String(row.status ?? "")} />
                </div>
              );
            })
          )}
        </div>
        {meta?.hasMore ? (
          <div className="border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const next = meta.nextCursor ?? undefined;
                setCursors((prev) => [...prev, next]);
                setCursor(next);
              }}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </Surface>
    </div>
  );
}
