"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Coins, LoaderCircle, Package } from "lucide-react";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrdersPath } from "@/src/lib/customer-shop-paths";
import { customerDigitalMetalsOrdersHubHref } from "@/src/lib/customer-digital-metals-order-links";
import { useListCustomerActivityQuery } from "@/src/store/api/customer-api";
import type { CustomerActivityListPage } from "@/src/lib/customer-recent-activity";
import { CustomerActivityRow } from "@/src/features/customer/customer-activity-row";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export function CustomerRecentActivityPage() {
  const { tenantSlug } = useCustomerTenant();
  /** Cursor for the next page request (undefined = first page). */
  const [fetchCursor, setFetchCursor] = useState<string | undefined>(undefined);
  const activity = useListCustomerActivityQuery({
    limit: PAGE_SIZE,
    ...(fetchCursor ? { cursor: fetchCursor } : {}),
  });
  const pageData = activity.data as CustomerActivityListPage | undefined;
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const items = pageData?.items ?? [];
  const nextCursor = pageData?.page?.nextCursor ?? null;
  const hasMore = Boolean(nextCursor || pageData?.page?.hasMore);

  const loadMore = useCallback(() => {
    if (!nextCursor || activity.isFetching || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setFetchCursor(nextCursor);
  }, [activity.isFetching, nextCursor]);

  useEffect(() => {
    if (!activity.isFetching) loadingMoreRef.current = false;
  }, [activity.isFetching]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "240px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, items.length]);

  if (activity.isLoading && !items.length) return <PageSkeleton cards={3} />;
  if (activity.isError) return <QueryError error={activity.error} onRetry={activity.refetch} />;

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <Link
        href={customerPath(tenantSlug, "payments")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" /> Scheme receipts
      </Link>
      <h1 className="mt-3 font-serif text-[2rem] leading-tight text-[#171722]">Passbook &amp; activity</h1>
      <p className="mt-1 text-sm text-[#77727c]">
        <span className="font-semibold text-emerald-700">Green</span> is money or gold/silver coming in (wallet credits,
        sell payouts). <span className="font-semibold text-red-700">Red</span> is money or metal going out (buys,
        redemptions, sells). Each digital metals order may show separate cash and metal lines.
      </p>

      <section className="mt-6 grid gap-2 sm:grid-cols-2">
        <Link
          href={customerShopOrdersPath(tenantSlug)}
          className="flex items-center gap-3 rounded-2xl border border-[#ece6e1] bg-[#faf7f4] px-4 py-3 text-sm font-semibold text-[#171722]"
        >
          <Package className="size-5 text-[var(--customer-primary,#730321)]" />
          Shop order tracking
        </Link>
        <Link
          href={`${customerDigitalMetalsOrdersHubHref(tenantSlug)}?tab=redemption`}
          className="flex items-center gap-3 rounded-2xl border border-[#ece6e1] bg-[#faf7f4] px-4 py-3 text-sm font-semibold text-[#171722]"
        >
          <Coins className="size-5 text-[var(--customer-primary,#730321)]" />
          Physical redemption orders
        </Link>
      </section>

      <div
        className={cn(
          "mt-8 space-y-3",
          items.length === 0 && "customer-surface px-4 py-12 text-center text-sm text-[#77727c]",
        )}
      >
        {items.length === 0 ? (
          <p>When you pay schemes, shop online, or move digital gold, entries appear here.</p>
        ) : (
          items.map((item) => (
            <CustomerActivityRow key={item.id} item={item} tenantSlug={tenantSlug} />
          ))
        )}
      </div>

      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />

      {activity.isFetching && items.length > 0 ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-[#77727c]">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Loading more…
        </p>
      ) : null}

      {!hasMore && items.length > 0 ? (
        <p className="mt-6 text-center text-xs text-[#9a929c]">End of passbook</p>
      ) : null}
    </div>
  );
}
