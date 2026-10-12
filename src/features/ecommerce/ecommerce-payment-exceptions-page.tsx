"use client";

import Link from "next/link";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useGetEcommercePaymentExceptionsQuery } from "@/src/store/api/admin-api";
import { useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceSectionNav } from "@/src/features/ecommerce/ecommerce-section-nav";

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
      return kind;
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
        eyebrow="Ecommerce"
        title="Payment exceptions"
        description="Late-success refunds, provider failures, stuck reconciliation, and initiation uncertainty."
        actions={
          <Link href="/ecommerce/orders" className="text-sm underline-offset-4 hover:underline">
            All orders
          </Link>
        }
      />
      <EcommerceSectionNav />
      <Surface title="Open queue">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No open payment exceptions.</p>
        ) : (
          <ul className="divide-y text-sm">
            {items.map((row) => {
              const orderId = String(row.orderId ?? "");
              const key = `${String(row.kind)}-${orderId}-${String(row.refundCaseId ?? row.paymentAttemptId ?? "")}`;
              return (
                <li key={key} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{kindLabel(String(row.kind ?? ""))}</div>
                    <div className="text-muted-foreground">
                      Order {orderId.slice(-8)} ·{" "}
                      {row.amountPaise != null ? formatInr(Number(row.amountPaise)) : "—"}
                    </div>
                    {row.status ? (
                      <div className="text-xs text-muted-foreground">State: {String(row.status)}</div>
                    ) : null}
                    {row.providerRefundId ? (
                      <div className="font-mono text-xs text-muted-foreground">
                        Ref: {String(row.providerRefundId)}
                      </div>
                    ) : null}
                    {row.updatedAt ? (
                      <div className="text-xs text-muted-foreground">
                        Updated {new Date(String(row.updatedAt)).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                  {orderId ? (
                    <Link
                      href={`/ecommerce/orders/${encodeURIComponent(orderId)}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Open order
                    </Link>
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
