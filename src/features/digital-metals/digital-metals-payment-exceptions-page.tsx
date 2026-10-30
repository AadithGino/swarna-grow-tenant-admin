"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/src/components/common/page-parts";
import { EmptyState, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { AdminTable, IdChip, ListPanel, type AdminColumn } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { useGetDigitalMetalsPaymentExceptionsQuery } from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { DM_SECTION, DmCustomerCell, DmGate, dmInr, shortDateTime } from "./digital-metals-admin-ui";

type ExceptionRow = {
  order?: {
    id: string;
    status: string;
    paymentExceptionStatus?: string;
    totalPayablePaise: number;
    createdAt?: string;
    customer?: { id?: string; name?: string; mobile?: string; customerNumber?: string } | null;
  };
  refund?: { status: string; exceptionType: string; amountPaise?: number };
};

const TYPE_COPY: Record<string, { label: string; help: string }> = {
  LATE_SUCCESS: { label: "Late success", help: "Payment succeeded after the order expired — refund or credit it." },
  DUPLICATE_PAYMENT: { label: "Duplicate payment", help: "The customer paid twice — refund the extra payment." },
  AMOUNT_MISMATCH: { label: "Amount mismatch", help: "Gateway amount differs from the order total." },
};

const rowKey = (r: ExceptionRow, i?: number) => r.order?.id ?? `row-${i ?? 0}`;

export function DigitalMetalsPaymentExceptionsPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const query = useGetDigitalMetalsPaymentExceptionsQuery(undefined, { skip: !ent.workspaceVisible });
  const [type, setType] = useState("ALL");
  const [search, setSearch] = useState("");

  const items = (query.data?.items ?? []) as ExceptionRow[];
  const typeOf = (r: ExceptionRow) => r.order?.paymentExceptionStatus ?? r.refund?.exceptionType ?? "OTHER";
  const counts = items.reduce<Record<string, number>>((acc, r) => {
    acc[typeOf(r)] = (acc[typeOf(r)] ?? 0) + 1;
    return acc;
  }, {});
  const needle = search.trim().toLowerCase();
  const rows = items.filter(
    (r) =>
      (type === "ALL" || typeOf(r) === type) &&
      (!needle || [r.order?.id, r.order?.customer?.name].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle))),
  );

  const columns: AdminColumn<ExceptionRow>[] = [
    {
      key: "customer",
      header: "Customer",
      primary: true,
      cell: (r) => <DmCustomerCell customer={r.order?.customer} fallbackId={r.order?.id} />,
    },
    {
      key: "type",
      header: "Problem",
      cell: (r) => {
        const t = TYPE_COPY[typeOf(r)];
        return (
          <div className="max-w-[22rem]">
            <p className="font-semibold text-[#28161a]">{t?.label ?? typeOf(r).replaceAll("_", " ").toLowerCase()}</p>
            <p className="text-xs leading-5 text-[#857a7d]">{t?.help ?? "Needs staff review."}</p>
          </div>
        );
      },
    },
    {
      key: "order",
      header: "Order",
      cell: (r) => (
        <div className="space-y-1">
          <IdChip>{r.order?.id ?? "—"}</IdChip>
          <p className="text-xs text-[#9a8d90]">{shortDateTime(r.order?.createdAt)}</p>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      primary: true,
      cell: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={r.order?.status ?? "UNKNOWN"} />
          {r.refund?.status ? <StatusBadge status={r.refund.status} label={`Refund ${r.refund.status.toLowerCase()}`} /> : null}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (r) => <span className="font-bold">{dmInr(r.refund?.amountPaise ?? r.order?.totalPayablePaise)}</span>,
      sortValue: (r) => Number(r.refund?.amountPaise ?? r.order?.totalPayablePaise ?? 0),
    },
  ];

  const views = [
    { value: "ALL", label: "All", count: items.length },
    ...Object.keys(counts).map((k) => ({ value: k, label: TYPE_COPY[k]?.label ?? k.replaceAll("_", " ").toLowerCase(), count: counts[k] })),
  ];

  return (
    <DmGate loading={ent.loading} visible={ent.workspaceVisible} message="Digital metals is not enabled." title="Payment exceptions">
      <div className="space-y-6" data-testid="digital-metals-payment-exceptions">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={ShieldAlert}
          title="Payment exceptions"
          description="Late successes, duplicate payments and refunds that need someone to act."
        />
        <ListPanel
          toolbar={
            <FilterBar
              quickViews={<QuickViews value={type} onChange={setType} options={views} ariaLabel="Exception type" />}
              search={<FilterSearch value={search} onChange={setSearch} placeholder="Search order ID or customer" />}
              resultLabel={`${rows.length} open cases`}
            />
          }
        >
          {query.isError ? (
            <QueryError error={query.error} onRetry={query.refetch} />
          ) : (
            <AdminTable
              columns={columns}
              rows={rows}
              getRowId={(r) => rowKey(r)}
              rowHref={(r) => (r.order?.id ? `/digital-metals/purchases/${r.order.id}` : undefined)}
              loading={query.isLoading}
              caption="Open payment exceptions"
              empty={<EmptyState icon={AlertTriangle} title="No payment exceptions" detail="Every gateway payment matches its order." />}
            />
          )}
        </ListPanel>
      </div>
    </DmGate>
  );
}
