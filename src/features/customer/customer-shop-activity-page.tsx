"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerDigitalMetalsVisible } from "@/src/lib/customer-digital-metals-visible";
import {
  filterShopActivities,
  mergeShopActivities,
  SHOP_ACTIVITY_TABS,
  type ShopActivityFilter,
} from "@/src/lib/customer-shop-activity";
import { customerShopBookingsPath, customerShopOrdersPath } from "@/src/lib/customer-shop-paths";
import { customerDigitalMetalsOrdersHubHref } from "@/src/lib/customer-digital-metals-order-links";
import { ShopActivityCompactRow } from "@/src/features/customer/customer-shop-activity-ui";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import { isOpenBooking, type CustomerBooking } from "@/src/lib/customer-shop-booking";
import { cn } from "@/lib/utils";
import { SHOP_MUTED } from "@/src/features/customer/customer-shop-ui";
import {
  useGetCustomerDigitalMetalsRedemptionOrdersQuery,
  useGetShopAvailabilityQuery,
  useListShopBookingsQuery,
  useListShopOrdersQuery,
} from "@/src/store/api/customer-api";

function parseFilter(raw: string | null): ShopActivityFilter {
  const f = String(raw ?? "all");
  return SHOP_ACTIVITY_TABS.some((t) => t.id === f) ? (f as ShopActivityFilter) : "all";
}

export function CustomerShopActivityPage() {
  const { tenantSlug } = useCustomerTenant();
  const params = useSearchParams();
  const initial = parseFilter(params.get("filter"));
  const [filter, setFilter] = useState<ShopActivityFilter>(initial);
  useEffect(() => {
    setFilter(parseFilter(params.get("filter")));
  }, [params]);
  const availability = useGetShopAvailabilityQuery();
  const shopOn = availability.data?.available === true;
  const { visible: metalsOn } = useCustomerDigitalMetalsVisible();

  const bookings = useListShopBookingsQuery({ limit: 30 }, { skip: !shopOn });
  const orders = useListShopOrdersQuery({ limit: 30 }, { skip: !shopOn && !availability.data?.hasOrderHistory });
  const redemptions = useGetCustomerDigitalMetalsRedemptionOrdersQuery({ limit: 20 }, { skip: !metalsOn });

  const loading = (shopOn && bookings.isLoading) || orders.isLoading || (metalsOn && redemptions.isLoading);
  const error = bookings.error ?? orders.error ?? redemptions.error;

  const allItems = useMemo(() => {
    const slug = tenantSlug ?? "";
    const bookingRows = ((bookings.data?.items ?? []) as unknown as CustomerBooking[]).filter((b) => isOpenBooking(b.status));
    return mergeShopActivities({
      tenantSlug: slug,
      bookings: bookingRows,
      orders: (orders.data?.items ?? []) as Record<string, unknown>[],
      redemptions: metalsOn ? ((redemptions.data?.items ?? []) as Record<string, unknown>[]) : [],
    });
  }, [bookings.data?.items, orders.data?.items, redemptions.data?.items, metalsOn, tenantSlug]);

  const visibleTabs = useMemo(() => {
    return SHOP_ACTIVITY_TABS.filter((tab) => {
      if (tab.id === "all") return true;
      if (tab.id === "bookings") return shopOn;
      if (tab.id === "delivery" || tab.id === "pickup") return shopOn || (orders.data?.items?.length ?? 0) > 0;
      if (tab.id === "wallet") return metalsOn;
      return false;
    });
  }, [shopOn, metalsOn, orders.data?.items?.length]);

  const filtered = useMemo(() => filterShopActivities(allItems, filter), [allItems, filter]);
  const counts = useMemo(() => {
    const map: Partial<Record<ShopActivityFilter, number>> = { all: allItems.length };
    for (const tab of visibleTabs) {
      if (tab.id === "all") continue;
      map[tab.id] = filterShopActivities(allItems, tab.id).length;
    }
    return map;
  }, [allItems, visibleTabs]);

  if (loading && !allItems.length) return <PageSkeleton cards={2} />;
  if (error) return <QueryError error={error} onRetry={() => { void bookings.refetch(); void orders.refetch(); void redemptions.refetch(); }} />;

  const slug = tenantSlug ?? "";

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <Link href={customerPath(slug, "shop")} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" /> Shop
      </Link>
      <h1 className="mt-3 font-serif text-[2rem] leading-tight text-[#221a1d]">Your orders</h1>
      <p className={cn("mt-1 text-sm", SHOP_MUTED)}>Bookings, shop delivery, pickup, and wallet deliveries.</p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Activity type">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition",
              filter === tab.id ? "border-transparent text-white" : "border-[#e3d6ce] bg-white text-[#4d4245] hover:bg-[#faf5f2]",
            )}
            style={filter === tab.id ? customerBrandStyle.primaryBg : undefined}
          >
            {tab.label}
            <span className={cn("text-xs tabular-nums", filter === tab.id ? "text-white/85" : "text-[#9a8d90]")}>
              {counts[tab.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2.5">
        {filtered.length ? (
          filtered.map((item) => <ShopActivityCompactRow key={item.key} item={item} />)
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-[#ecdfd8] px-5 py-10 text-center text-sm text-[var(--ck-muted)]">
            Nothing in progress for this filter.
          </div>
        )}
      </div>

      <section className="mt-8 rounded-[1.15rem] border border-[var(--ck-line)] bg-white p-4 text-sm">
        <p className="font-semibold text-[#221a1d]">Full history</p>
        <ul className="mt-2 space-y-2 text-[var(--customer-primary,#730321)]">
          {shopOn ? (
            <li>
              <Link href={customerShopBookingsPath(slug)} className="font-semibold underline-offset-2 hover:underline">
                All advance bookings
              </Link>
            </li>
          ) : null}
          <li>
            <Link href={customerShopOrdersPath(slug)} className="font-semibold underline-offset-2 hover:underline">
              All shop orders
            </Link>
          </li>
          {metalsOn ? (
            <li>
              <Link href={customerDigitalMetalsOrdersHubHref(slug, "redemption")} className="font-semibold underline-offset-2 hover:underline">
                Wallet redemptions &amp; deliveries
              </Link>
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}