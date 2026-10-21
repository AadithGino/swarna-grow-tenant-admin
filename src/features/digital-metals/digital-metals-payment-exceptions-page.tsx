"use client";

import Link from "next/link";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import { useGetDigitalMetalsPaymentExceptionsQuery } from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";

export function DigitalMetalsPaymentExceptionsPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const query = useGetDigitalMetalsPaymentExceptionsQuery(undefined, { skip: !ent.workspaceVisible });

  if (ent.loading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <PageHeader title="Payment exceptions" />
        <p className="text-sm text-muted-foreground">Digital metals is not enabled.</p>
      </div>
    );
  }
  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  const items = (query.data?.items ?? []) as {
    order?: { id: string; status: string; paymentExceptionStatus?: string; totalPayablePaise: number };
    refund?: { status: string; exceptionType: string };
  }[];

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-payment-exceptions">
      <PageHeader
        title="Payment exceptions"
        description="Late success, duplicate payments, and refund cases requiring staff action."
      />
      <Surface title="Open cases">
        <div className="divide-y">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No payment exceptions.</p>
          ) : (
            items.map((row, i) => (
              <Link
                key={row.order?.id ?? `row-${i}`}
                href={`/digital-metals/purchases/${row.order?.id ?? ""}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{row.order?.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.order?.paymentExceptionStatus ?? row.refund?.exceptionType ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {row.refund?.status ? <StatusBadge status={row.refund.status} /> : null}
                  <StatusBadge status={row.order?.status ?? "UNKNOWN"} />
                  {row.order?.totalPayablePaise != null ? (
                    <span className="text-sm font-semibold">{money(row.order.totalPayablePaise)}</span>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </div>
      </Surface>
    </div>
  );
}
