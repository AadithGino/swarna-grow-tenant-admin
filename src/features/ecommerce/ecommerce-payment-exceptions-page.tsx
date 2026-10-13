"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useGetEcommercePaymentExceptionsQuery } from "@/src/store/api/admin-api";
import { useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import {
  EcommerceOperationsNav,
  EcommerceSettingsHint,
} from "@/src/features/ecommerce/ecommerce-settings-ui";

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function kindLabel(kind: string) {
  switch (kind) {
    case "EXCEPTION_REFUND":
      return "Exception refund";
    case "STUCK_RECONCILE":
      return "Stuck reconcile";
    case "INITIATION_UNCERTAIN":
      return "Initiation uncertain";
    case "LATE_SUCCESS_REFUND_REQUIRED":
      return "Late success — refund required";
    default:
      return kind.replaceAll("_", " ").toLowerCase();
  }
}

export function EcommercePaymentExceptionsPage() {
  const { canRead, readBlockedMessage } = useEcommerceAdminAccess();
  const query = useGetEcommercePaymentExceptionsQuery({ limit: 80 }, { skip: !canRead });
  if (!canRead) {
    return (
      <PageHeader
        title="Payment exceptions"
        description={readBlockedMessage ?? "Ecommerce read access required."}
      />
    );
  }
  if (query.isLoading) return <PageSkeleton cards={1} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Store operations"
        title="Payment exceptions"
        description="Provider failures, late captures, and refunds that need a decision."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecommerce/orders">
              All orders
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />
      <EcommerceOperationsNav />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={AlertTriangle}
          label="Open exceptions"
          value={items.length}
          detail="Resolve from the order detail screen"
          tone={items.length ? "red" : "green"}
        />
        <StatCard
          icon={AlertTriangle}
          label="Queue status"
          value={items.length ? "Action needed" : "Clear"}
          detail="Check orders with online payment issues"
          tone={items.length ? "gold" : "green"}
        />
      </div>
      <EcommerceSettingsHint icon={AlertTriangle} title="What belongs here">
        These are not courier COD items — use{" "}
        <Link href="/ecommerce/courier-cod" className="font-semibold text-[#730321] underline">
          Courier COD
        </Link>{" "}
        for cash collection and bank remittance. Open each order to retry reconciliation or issue
        refunds.
      </EcommerceSettingsHint>
      <Surface title="Open queue" className="mt-6">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No open payment exceptions.</p>
        ) : (
          <ul className="divide-y divide-[#eaded9]">
            {items.map((row) => {
              const orderId = String(row.orderId ?? "");
              const key = `${String(row.kind)}-${orderId}-${String(row.refundCaseId ?? row.paymentAttemptId ?? "")}`;
              return (
                <li
                  key={key}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#28161a]">
                        {kindLabel(String(row.kind ?? ""))}
                      </span>
                      {row.status ? (
                        <StatusBadge status="PENDING" label={String(row.status)} />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.amountPaise != null ? formatInr(Number(row.amountPaise)) : "—"}
                      {orderId ? ` · Order …${orderId.slice(-8)}` : null}
                    </p>
                    {row.updatedAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated {new Date(String(row.updatedAt)).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  {orderId ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/ecommerce/orders/${encodeURIComponent(orderId)}`}>
                        Open order
                      </Link>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Surface>
    </>
  );
}
