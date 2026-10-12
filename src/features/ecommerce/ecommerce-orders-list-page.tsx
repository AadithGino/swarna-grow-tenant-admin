"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { EcommerceSectionNav } from "@/src/features/ecommerce/ecommerce-section-nav";
import { EcommerceOrdersKpiStrip } from "@/src/features/ecommerce/ecommerce-orders-kpi-strip";
import { EcommerceOrdersListToolbar } from "@/src/features/ecommerce/ecommerce-orders-list-toolbar";
import { EcommerceOrdersListTable } from "@/src/features/ecommerce/ecommerce-order-ui";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import {
  buildEcommerceOrdersListQuery,
  buildEcommerceSummaryQuery,
  type EcommerceOrdersListFiltersState,
  type EcommerceOrdersListView,
  ECOMMERCE_ORDER_LIST_VIEWS,
} from "@/src/lib/ecommerce-orders-list-filters";
import {
  ordersListFiltersToSearchParams,
  parseOrdersListFiltersFromSearchParams,
} from "@/src/lib/ecommerce-orders-url-state";
import { orderListItemNeedsAttention } from "@/src/lib/ecommerce-order-presenters";
import { useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import {
  useGetEcommerceOrdersQuery,
  useGetEcommerceWorkspaceSummaryQuery,
} from "@/src/store/api/admin-api";
import { cn } from "@/lib/utils";
import type { EcommerceOrderListItem } from "@/src/types/ecommerce-order";

function periodLabel(filters: EcommerceOrdersListFiltersState) {
  if (filters.createdFrom && filters.createdTo) {
    return `${filters.createdFrom} → ${filters.createdTo}`;
  }
  return filters.period.replaceAll("_", " ").toLowerCase();
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
  const summaryQuery = useGetEcommerceWorkspaceSummaryQuery(
    buildEcommerceSummaryQuery(filters),
    { skip: !canRead },
  );

  const items: EcommerceOrderListItem[] = useMemo(() => {
    const rawItems = query.data?.items ?? [];
    if (filters.view !== "needs_action") return rawItems;
    return rawItems.filter(orderListItemNeedsAttention);
  }, [query.data?.items, filters.view]);

  const meta = query.data?.meta;
  const listHref = (orderId: string) => {
    const back = ordersListFiltersToSearchParams(filters, pager.cursor).toString();
    return back
      ? `/ecommerce/orders/${encodeURIComponent(orderId)}?${back}`
      : `/ecommerce/orders/${encodeURIComponent(orderId)}`;
  };

  if (!canRead) {
    return (
      <PageHeader title="Orders" description={readBlockedMessage ?? "Ecommerce read access required."} />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Orders"
        description="Daily storefront orders — accept COD, fulfil, and resolve payment exceptions."
        actions={
          <Link
            href="/ecommerce/payment-exceptions"
            className="text-sm font-medium text-[#730321] underline-offset-4 hover:underline"
          >
            Payment exceptions
          </Link>
        }
      />
      <EcommerceSectionNav />
      <EcommerceOrdersKpiStrip
        summary={summaryQuery.data}
        periodLabel={periodLabel(filters)}
        loading={summaryQuery.isFetching}
      />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {ECOMMERCE_ORDER_LIST_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            title={view.description}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filters.view === view.id
                ? "border-[#730321] bg-[#730321] text-white"
                : "border-[#e4d7d2] bg-white text-[#5c4a50] hover:bg-[#faf7f5]",
            )}
            onClick={() => {
              pager.reset();
              setFilters((f) => ({ ...f, view: view.id as EcommerceOrdersListView }));
            }}
          >
            {view.label}
          </button>
        ))}
      </div>
      <EcommerceOrdersListToolbar
        state={filters}
        onChange={(next) => {
          pager.reset();
          setFilters(next);
        }}
        resultCount={meta?.totalCount ?? items.length}
        pageCount={items.length}
        loading={query.isFetching}
      />
      {query.isLoading && !query.data ? (
        <PageSkeleton cards={1} />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={query.refetch} />
      ) : items.length === 0 ? (
        <Surface title="Results">
          <p className="p-8 text-center text-sm text-muted-foreground">
            {filters.view === "needs_action"
              ? "No urgent orders on this page. Try another view or go to the next page."
              : "No orders match these filters."}
          </p>
        </Surface>
      ) : (
        <>
          <EcommerceOrdersListTable items={items} orderHref={listHref} />
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
        </>
      )}
    </>
  );
}
