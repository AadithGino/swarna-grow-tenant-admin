"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ClipboardList, IndianRupee, PackageOpen, ShoppingBag, Store, Truck } from "lucide-react";
import { PageHeader, StatCard } from "@/src/components/common/page-parts";
import { EmptyState, QueryError } from "@/src/components/common/query-state";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { StatusBadge } from "@/src/components/common/status-badge";
import { AdminTable, CellStack, InitialsAvatar, ListPanel, type AdminColumn } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterDateRange, FilterSearch, FilterSelect, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import {
  buildEcommerceOrdersListQuery,
  buildEcommerceSummaryQuery,
  emptyEcommerceOrdersListFilters,
  type EcommerceOrdersListFiltersState,
  type EcommerceOrdersListView,
  ECOMMERCE_ORDER_LIST_VIEWS,
  ECOMMERCE_ORDER_PAYMENT_FILTERS,
  ECOMMERCE_ORDER_STATUS_FILTERS,
} from "@/src/lib/ecommerce-orders-list-filters";
import {
  ordersListFiltersToSearchParams,
  parseOrdersListFiltersFromSearchParams,
} from "@/src/lib/ecommerce-orders-url-state";
import { formatOrderPaymentState, orderListItemNeedsAttention } from "@/src/lib/ecommerce-order-presenters";
import { useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import {
  customerListLabel,
  customerListSub,
  formatOrderInr,
  orderLineCount,
  orderLinePreview,
} from "@/src/features/ecommerce/ecommerce-order-ui";
import { useGetEcommerceOrdersQuery, useGetEcommerceWorkspaceSummaryQuery } from "@/src/store/api/admin-api";
import { cn } from "@/lib/utils";
import type { EcommerceOrderListItem } from "@/src/types/ecommerce-order";

const PERIOD_OPTIONS = [
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
];

function shortWhen(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function periodLabel(filters: EcommerceOrdersListFiltersState) {
  if (filters.createdFrom && filters.createdTo) return `${filters.createdFrom} → ${filters.createdTo}`;
  return PERIOD_OPTIONS.find((p) => p.value === filters.period)?.label.toLowerCase() ?? filters.period.replaceAll("_", " ").toLowerCase();
}

export function EcommerceOrdersPage() {
  const { canRead, readBlockedMessage } = useEcommerceAdminAccess();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<EcommerceOrdersListFiltersState>(() =>
    parseOrdersListFiltersFromSearchParams(searchParams),
  );
  const debouncedQ = useDebouncedValue(filters.q, 350);
  const resetKey = `${filters.view}|${debouncedQ}|${filters.status}|${filters.paymentMethod}|${filters.createdFrom}|${filters.createdTo}|${filters.period}`;
  const pager = useCursorPagination(25, resetKey);

  const syncUrl = useCallback(
    (next: EcommerceOrdersListFiltersState, cursor?: string) => {
      const q = ordersListFiltersToSearchParams(next, cursor);
      const path = q.toString() ? `/ecommerce/orders?${q}` : "/ecommerce/orders";
      router.replace(path, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    syncUrl(filters, pager.cursor);
  }, [filters, pager.cursor, syncUrl]);

  const apiParams = useMemo(
    () =>
      buildEcommerceOrdersListQuery({
        ...filters,
        q: debouncedQ,
        limit: pager.limit,
        cursor: pager.cursor,
      }),
    [filters, debouncedQ, pager.limit, pager.cursor],
  );

  const query = useGetEcommerceOrdersQuery(apiParams, { skip: !canRead });
  const summaryQuery = useGetEcommerceWorkspaceSummaryQuery(buildEcommerceSummaryQuery(filters), { skip: !canRead });

  const items: EcommerceOrderListItem[] = query.data?.items ?? [];
  const meta = query.data?.meta;
  const summary = summaryQuery.data;
  const listHref = (orderId: string) => {
    const back = ordersListFiltersToSearchParams(filters, pager.cursor).toString();
    return back ? `/ecommerce/orders/${encodeURIComponent(orderId)}?${back}` : `/ecommerce/orders/${encodeURIComponent(orderId)}`;
  };

  function patch(partial: Partial<EcommerceOrdersListFiltersState>) {
    pager.reset();
    setFilters((f) => ({ ...f, ...partial }));
  }

  if (!canRead) {
    return <PageHeader title="Orders" description={readBlockedMessage ?? "Ecommerce read access required."} />;
  }

  const attention = summary ? summary.pipeline.paymentExceptionsOpen + summary.placement.codPendingAcceptancePlacedInPeriod : 0;
  const viewCounts: Partial<Record<EcommerceOrdersListView, number>> = summary
    ? {
        needs_action: attention,
        cod_acceptance: summary.placement.codPendingAcceptancePlacedInPeriod,
        to_fulfil: summary.pipeline.awaitingFulfilment,
        payment_issues: summary.pipeline.paymentExceptionsOpen,
        returns_cancel: summary.pipeline.openReturnRequests + summary.pipeline.openCancellationRequests,
      }
    : {};

  const columns: AdminColumn<EcommerceOrderListItem>[] = [
    {
      key: "order",
      header: "Order",
      primary: true,
      cell: (row) => (
        <div className="min-w-[7rem]">
          <p className="font-bold text-[#28161a]">{row.orderNumber ?? row.id.slice(-10)}</p>
          <p className="whitespace-nowrap text-xs text-[#9a8d90]">{shortWhen(row.createdAt)}</p>
        </div>
      ),
      sortValue: (row) => row.createdAt ?? "",
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <CellStack
          leading={<InitialsAvatar name={customerListLabel(row)} className="size-8 text-[0.7rem]" />}
          primary={customerListLabel(row)}
          secondary={row.customerDisplay?.name ? row.customerDisplay?.maskedMobile ?? customerListSub(row) : customerListSub(row)}
        />
      ),
      sortValue: (row) => customerListLabel(row),
    },
    {
      key: "items",
      header: "Items",
      className: "hidden 2xl:table-cell",
      cell: (row) => {
        const lines = orderLineCount(row);
        return (
          <div className="max-w-[14rem]">
            <p className="truncate text-sm text-[#3c2a2e]">{orderLinePreview(row) || "—"}</p>
            {lines > 2 ? <p className="text-xs text-[#9a8d90]">+{lines - 2} more</p> : null}
          </div>
        );
      },
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      primary: true,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={row.status} label={row.status === "COD_PENDING_ACCEPTANCE" ? "COD to accept" : undefined} />
          {row.paymentExceptionStatus ? (
            <StatusBadge status="FAILED" label="Payment issue" />
          ) : orderListItemNeedsAttention(row) && row.status !== "COD_PENDING_ACCEPTANCE" ? (
            <StatusBadge status="PENDING" label="Needs action" />
          ) : null}
        </div>
      ),
      sortValue: (row) => row.status,
    },
    {
      key: "payment",
      header: "Payment",
      cell: (row) => {
        const pay = formatOrderPaymentState(row);
        return (
          <div className="max-w-[11rem] text-sm" title={pay.helper}>
            <p className="whitespace-nowrap font-medium text-[#2d191d]">{pay.methodLabel === "Cash on delivery" ? "COD" : pay.methodLabel}</p>
            <p className={cn("truncate text-xs", pay.tone === "danger" ? "text-red-700" : pay.tone === "success" ? "text-emerald-700" : pay.tone === "warning" ? "text-amber-700" : "text-[#857a7d]")}>
              {pay.stateLabel}
            </p>
          </div>
        );
      },
      hideOnMobile: true,
    },
    {
      key: "handover",
      header: "Handover",
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-[#5c4a4e]">
          {row.fulfilmentMode === "DELIVERY" ? <Truck className="size-3.5" aria-hidden /> : <Store className="size-3.5" aria-hidden />}
          {row.fulfilmentMode === "DELIVERY" ? "Delivery" : "Pickup"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (row) => <span className="font-bold">{formatOrderInr(row.totalPaise ?? 0)}</span>,
      sortValue: (row) => Number(row.totalPaise ?? 0),
    },
  ];

  const activeFilters = [
    ...(filters.status !== "ALL"
      ? [{ key: "status", label: ECOMMERCE_ORDER_STATUS_FILTERS.find((o) => o.value === filters.status)?.label ?? filters.status, onClear: () => patch({ status: "ALL" }) }]
      : []),
    ...(filters.paymentMethod !== "ALL"
      ? [{ key: "pay", label: ECOMMERCE_ORDER_PAYMENT_FILTERS.find((o) => o.value === filters.paymentMethod)?.label ?? filters.paymentMethod, onClear: () => patch({ paymentMethod: "ALL" }) }]
      : []),
    ...(filters.createdFrom || filters.createdTo
      ? [{ key: "dates", label: `${filters.createdFrom || "…"} → ${filters.createdTo || "…"}`, onClear: () => patch({ createdFrom: "", createdTo: "" }) }]
      : []),
    ...(filters.q.trim() ? [{ key: "q", label: `“${filters.q.trim()}”`, onClear: () => patch({ q: "" }) }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Online store"
        icon={ClipboardList}
        title="Orders"
        description="Accept COD orders, pack and hand over paid ones, and sort out payment problems."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Orders placed" value={summary?.placement.ordersPlaced ?? "—"} loading={summaryQuery.isLoading} detail={`In ${periodLabel(filters)}`} tone="cream" />
        <StatCard
          icon={IndianRupee}
          label="Net collected"
          value={summary?.collections.netCollected?.amountDisplay ?? formatOrderInr(0)}
          loading={summaryQuery.isLoading}
          detail={`${summary?.collections.collectedOrderCount ?? 0} collected orders`}
          tone="green"
        />
        <StatCard
          icon={PackageOpen}
          label="To fulfil"
          value={summary?.pipeline.awaitingFulfilment ?? "—"}
          loading={summaryQuery.isLoading}
          detail="Paid and waiting to be packed"
          tone="gold"
          href="/ecommerce/orders?view=to_fulfil"
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs attention"
          value={attention}
          loading={summaryQuery.isLoading}
          detail="COD to accept + payment issues"
          tone={attention > 0 ? "red" : "wine"}
          href="/ecommerce/orders?view=needs_action"
        />
      </div>
      {summaryQuery.isError ? (
        <Notice
          tone="amber"
          icon={AlertTriangle}
          action={
            <button type="button" onClick={() => void summaryQuery.refetch()} className="text-sm font-semibold underline underline-offset-2">
              Retry totals
            </button>
          }
        >
          Order totals couldn&apos;t be refreshed. The list below still works.
        </Notice>
      ) : null}
      <ListPanel
        toolbar={
          <FilterBar
            quickViews={
              <QuickViews
                value={filters.view}
                onChange={(v) => patch({ view: v as EcommerceOrdersListView })}
                options={ECOMMERCE_ORDER_LIST_VIEWS.map((v) => ({ value: v.id, label: v.label, count: viewCounts[v.id] ?? null }))}
                ariaLabel="Order queues"
              />
            }
            search={
              <FilterSearch
                value={filters.q}
                onChange={(q) => patch({ q })}
                placeholder="Order number, customer name, mobile or ID"
                hint="Searches all orders — type 2+ characters"
              />
            }
            filters={
              <>
                <FilterSelect label="Status" value={filters.status} onChange={(status) => patch({ status })} options={ECOMMERCE_ORDER_STATUS_FILTERS.map((o) => (o.value === "ALL" ? { ...o, label: "Any" } : o))} />
                <FilterSelect label="Payment" value={filters.paymentMethod} onChange={(paymentMethod) => patch({ paymentMethod })} options={ECOMMERCE_ORDER_PAYMENT_FILTERS.map((o) => (o.value === "ALL" ? { ...o, label: "Any" } : o))} />
                <FilterSelect label="Period" value={filters.period} defaultValue="THIS_MONTH" onChange={(period) => patch({ period })} options={PERIOD_OPTIONS} widthClass="min-w-[10rem]" />
                <FilterDateRange
                  label="Placed"
                  from={filters.createdFrom}
                  to={filters.createdTo}
                  onFromChange={(createdFrom) => patch({ createdFrom })}
                  onToChange={(createdTo) => patch({ createdTo })}
                />
              </>
            }
            activeFilters={activeFilters}
            onClearAll={() => {
              pager.reset();
              setFilters(emptyEcommerceOrdersListFilters());
            }}
            resultLabel={query.isFetching && !query.data ? "Loading…" : `${meta?.totalCount ?? items.length} orders`}
          />
        }
      >
        {query.isError ? (
          <QueryError error={query.error} onRetry={query.refetch} />
        ) : (
          <AdminTable
            columns={columns}
            rows={items}
            getRowId={(r) => r.id}
            rowHref={(r) => listHref(r.id)}
            loading={query.isLoading && !query.data}
            fetching={query.isFetching && Boolean(query.data)}
            rowClassName={(r) => (orderListItemNeedsAttention(r) ? "bg-[#fffbf3]" : undefined)}
            caption="Store orders"
            empty={
              <EmptyState
                icon={ClipboardList}
                title={filters.view === "needs_action" ? "Nothing needs attention" : "No orders match"}
                detail={filters.view === "needs_action" ? "No COD acceptances or payment issues for these filters." : "Try another period, view or clear the filters."}
              />
            }
            footer={
              <CursorPagination
                page={{
                  nextCursor: meta?.nextCursor ?? null,
                  hasMore: Boolean(meta?.hasMore),
                  limit: meta?.limit ?? pager.limit,
                  total: meta?.totalCount,
                }}
                pageIndex={pager.pageIndex}
                rowCount={items.length}
                canPrevious={pager.canPrevious}
                onPrevious={pager.goPrevious}
                onNext={() => pager.goNext(meta?.nextCursor)}
              />
            }
          />
        )}
      </ListPanel>
    </div>
  );
}
