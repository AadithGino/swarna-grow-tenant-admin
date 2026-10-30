"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/src/components/common/page-parts";
import { EmptyState, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { AdminTable, IdChip, ListPanel, type AdminColumn } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { useGetEcommercePaymentExceptionsQuery } from "@/src/store/api/admin-api";
import { useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const KIND_COPY: Record<string, { label: string; help: string }> = {
  EXCEPTION_REFUND: { label: "Exception refund", help: "A refund case is open for this payment." },
  STUCK_RECONCILE: { label: "Stuck reconcile", help: "The gateway hasn't confirmed the outcome — retry reconcile." },
  INITIATION_UNCERTAIN: { label: "Initiation uncertain", help: "We can't tell if the payment started — check with the gateway." },
  LATE_SUCCESS_REFUND_REQUIRED: { label: "Late success — refund needed", help: "Paid after the order expired. Refund the customer." },
};

function kindLabel(kind: string) {
  return KIND_COPY[kind]?.label ?? kind.replaceAll("_", " ").toLowerCase();
}

type Row = Record<string, unknown>;

export function EcommercePaymentExceptionsPage() {
  const { canRead, readBlockedMessage } = useEcommerceAdminAccess();
  const query = useGetEcommercePaymentExceptionsQuery({ limit: 80 }, { skip: !canRead });
  const [kind, setKind] = useState("ALL");
  const [search, setSearch] = useState("");
  if (!canRead) {
    return <PageHeader title="Payment exceptions" description={readBlockedMessage ?? "Ecommerce read access required."} />;
  }
  const items = (query.data?.items ?? []) as Row[];
  const counts = items.reduce<Record<string, number>>((acc, r) => {
    const k = String(r.kind ?? "OTHER");
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const needle = search.trim().toLowerCase();
  const rows = items.filter(
    (r) =>
      (kind === "ALL" || String(r.kind) === kind) &&
      (!needle || [r.orderId, r.orderNumber, r.refundCaseId, r.paymentAttemptId].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle))),
  );
  const keyOf = (row: Row) => `${String(row.kind)}-${String(row.orderId ?? "")}-${String(row.refundCaseId ?? row.paymentAttemptId ?? "")}`;

  const columns: AdminColumn<Row>[] = [
    {
      key: "kind",
      header: "Problem",
      primary: true,
      cell: (row) => (
        <div className="max-w-[24rem]">
          <p className="font-semibold text-[#28161a]">{kindLabel(String(row.kind ?? ""))}</p>
          <p className="text-xs leading-5 text-[#857a7d]">{KIND_COPY[String(row.kind)]?.help ?? "Needs a decision."}</p>
        </div>
      ),
    },
    {
      key: "order",
      header: "Order",
      cell: (row) => (row.orderId ? <IdChip>{String(row.orderNumber ?? `…${String(row.orderId).slice(-8)}`)}</IdChip> : "—"),
    },
    { key: "status", header: "Status", cell: (row) => (row.status ? <StatusBadge status={String(row.status)} /> : "—") },
    {
      key: "updated",
      header: "Updated",
      cell: (row) => <span className="text-sm text-[#5c4a4e]">{row.updatedAt ? new Date(String(row.updatedAt)).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span>,
      sortValue: (row) => String(row.updatedAt ?? ""),
      hideOnMobile: true,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      primary: true,
      cell: (row) => <span className="font-bold">{row.amountPaise != null ? formatInr(Number(row.amountPaise)) : "—"}</span>,
      sortValue: (row) => Number(row.amountPaise ?? 0),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Online store"
        icon={ShieldAlert}
        title="Payment exceptions"
        description="Gateway failures, late captures and refunds that need a decision. Open the order to fix each one."
        actions={
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/ecommerce/orders">
              All orders <ArrowRight />
            </Link>
          </Button>
        }
      />
      <Notice tone="blue" icon={AlertTriangle}>
        Cash collected by couriers isn&apos;t handled here — use{" "}
        <Link href="/ecommerce/courier-cod" className="font-semibold underline-offset-2 hover:underline">
          Courier COD
        </Link>{" "}
        for collection and bank remittance.
      </Notice>
      <ListPanel
        toolbar={
          <FilterBar
            quickViews={
              <QuickViews
                value={kind}
                onChange={setKind}
                options={[{ value: "ALL", label: "All", count: items.length }, ...Object.keys(counts).map((k) => ({ value: k, label: kindLabel(k), count: counts[k] }))]}
                ariaLabel="Exception type"
              />
            }
            search={<FilterSearch value={search} onChange={setSearch} placeholder="Search order or case ID" />}
            resultLabel={`${rows.length} open`}
          />
        }
      >
        {query.isError ? (
          <QueryError error={query.error} onRetry={query.refetch} />
        ) : (
          <AdminTable
            columns={columns}
            rows={rows}
            getRowId={keyOf}
            rowHref={(row) => (row.orderId ? `/ecommerce/orders/${encodeURIComponent(String(row.orderId))}` : undefined)}
            loading={query.isLoading}
            caption="Open payment exceptions"
            empty={<EmptyState icon={ShieldAlert} title="No open payment exceptions" detail="Every online payment matches its order." />}
          />
        )}
      </ListPanel>
    </div>
  );
}
