"use client";

import Link from "next/link";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { StatusBadge } from "@/src/components/common/status-badge";
import { QueryError } from "@/src/components/common/query-state";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { money } from "@/src/lib/format";
import { useGetCustomerEcommerceOrdersQuery } from "@/src/store/api/admin-api";

type Row = {
  id: string;
  orderNumber: string;
  createdAt?: string | null;
  itemSummary: string;
  totalPaise: number;
  status: string;
  attentionLabel?: string | null;
};

export function CustomerEcommerceOrdersTab({ customerId }: { customerId: string }) {
  const pager = useCursorPagination(10, `${customerId}|ecommerce-orders`);
  const query = useGetCustomerEcommerceOrdersQuery({
    customerId,
    ...pager.queryParams,
  });

  if (query.isError) {
    return (
      <QueryError
        title="Could not load ecommerce orders"
        error={query.error}
        onRetry={query.refetch}
      />
    );
  }

  const items = (query.data?.items ?? []) as Row[];
  const page = query.data?.page ?? emptyPageMeta();
  const summary = query.data?.ecommerceSummary;

  return (
    <div className="space-y-4">
      {summary ? (
        <p className="text-xs text-muted-foreground">{summary.label}</p>
      ) : null}
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="text-lg font-semibold">{summary.orderCount}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Online captured</p>
            <p className="text-lg font-semibold">{money(summary.onlineCollectedPaise ?? 0)}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Courier COD confirmed (owed until bank)</p>
            <p className="text-lg font-semibold">{money(summary.codCourierConfirmedPaise ?? 0)}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">COD bank remittance (net)</p>
            <p className="text-lg font-semibold">{money(summary.codBankRemittanceReconciledPaise ?? 0)}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Net collected (online + bank COD − refunds)</p>
            <p className="text-lg font-semibold">{money(summary.netCollectedPaise)}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Refund outflow</p>
            <p className="text-lg font-semibold">{money(summary.refundOutflowPaise ?? 0)}</p>
          </div>
        </div>
      ) : null}

      <PaginatedDataTable
        emptyTitle="No online store orders for this customer."
        rows={items}
        page={page}
        pageIndex={pager.pageIndex}
        onNext={() => pager.goNext(page.nextCursor)}
        onPrevious={pager.goPrevious}
        canPrevious={pager.canPrevious}
        columns={[
          {
            key: "order",
            header: "Order",
            render: (r) => (
              <div>
                <p className="font-medium">{r.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {r.createdAt ? new Date(String(r.createdAt)).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>
            ),
          },
          { key: "items", header: "Items", render: (r) => r.itemSummary },
          {
            key: "total",
            header: "Total",
            render: (r) => money(r.totalPaise),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge status={String(r.status)} />,
          },
          {
            key: "attention",
            header: "Attention",
            render: (r) => r.attentionLabel ?? "—",
          },
          {
            key: "open",
            header: "",
            render: (r) => (
              <Link href={`/ecommerce/orders/${r.id}`} className="text-sm font-medium text-primary">
                Open
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
