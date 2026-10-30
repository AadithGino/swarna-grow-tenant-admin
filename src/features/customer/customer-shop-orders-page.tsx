"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrderPath } from "@/src/lib/customer-shop-paths";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import { useGetShopAvailabilityQuery, useListShopOrdersQuery } from "@/src/store/api/customer-api";
import {
  buildShopOrderTimeline,
  formatShopOrderDate,
  ShopOrderProgressStepper,
} from "@/src/features/customer/customer-shop-order-progress";
import { formatShopInr, SHOP_HAIRLINE, SHOP_INK, SHOP_MUTED, ShopProductArt } from "@/src/features/customer/customer-shop-ui";

const VIEWS = [
  { id: "all", label: "All" },
  { id: "active", label: "In progress" },
  { id: "done", label: "Completed" },
] as const;

const toneText: Record<string, string> = {
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
  neutral: "text-[var(--customer-primary,#730321)]",
};

export function CustomerShopOrdersPage() {
  const { tenantSlug } = useCustomerTenant();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("all");
  const availability = useGetShopAvailabilityQuery();
  const orders = useListShopOrdersQuery({ cursor, limit: 20 });
  const shopOpen = availability.data?.available === true;

  const items = useMemo(() => orders.data?.items ?? [], [orders.data?.items]);
  const withTimeline = useMemo(() => items.map((row) => ({ row, timeline: buildShopOrderTimeline(row) })), [items]);
  const counts = {
    all: withTimeline.length,
    active: withTimeline.filter((o) => !o.timeline.terminal).length,
    done: withTimeline.filter((o) => o.timeline.terminal).length,
  };
  const visible = withTimeline.filter((o) => (view === "all" ? true : view === "active" ? !o.timeline.terminal : o.timeline.terminal));

  if (orders.isLoading && !orders.data) return <PageSkeleton cards={2} />;
  if (orders.isError) return <QueryError error={orders.error} onRetry={orders.refetch} />;

  const nextCursor = orders.data?.page?.nextCursor ?? null;

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <Link
        href={shopOpen ? customerPath(tenantSlug, "shop") : customerPath(tenantSlug, "profile")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" /> {shopOpen ? "Back to store" : "Back to profile"}
      </Link>
      <h1 className={cn("mt-3 font-serif text-[2rem] leading-tight", SHOP_INK)}>Your orders</h1>
      <p className={cn("mt-1 text-sm", SHOP_MUTED)}>Track payment, packing and delivery for everything you&apos;ve ordered online.</p>

      {items.length === 0 ? (
        <section className={cn("mt-8 rounded-[1.75rem] border bg-white px-6 py-14 text-center", SHOP_HAIRLINE)}>
          <span className="mx-auto grid size-14 place-items-center rounded-full customer-accent-tint-surface">
            <Package className="size-6 customer-gold-copy" />
          </span>
          <p className={cn("mt-4 font-serif text-xl", SHOP_INK)}>No orders yet</p>
          <p className={cn("mx-auto mt-2 max-w-sm text-sm", SHOP_MUTED)}>When you order from the store, it appears here with live status.</p>
          {shopOpen ? (
            <Link href={customerPath(tenantSlug, "shop")} className="mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white" style={customerBrandStyle.primaryBg}>
              Browse the store
            </Link>
          ) : (
            <p className={cn("mt-4 text-xs", SHOP_MUTED)}>The online store is not open right now.</p>
          )}
        </section>
      ) : (
        <>
          <div className="mt-6 flex gap-2" role="tablist" aria-label="Filter orders">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition",
                  view === v.id ? "border-transparent text-white" : "border-[#e3d6ce] bg-white text-[#4d4245] hover:bg-[#faf5f2]",
                )}
                style={view === v.id ? customerBrandStyle.primaryBg : undefined}
              >
                {v.label}
                <span className={cn("text-xs tabular-nums", view === v.id ? "text-white/80" : "text-[#9a8d90]")}>{counts[v.id]}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            {visible.length === 0 ? (
              <p className={cn("rounded-2xl border bg-white px-5 py-8 text-center text-sm", SHOP_HAIRLINE, SHOP_MUTED)}>No orders in this view.</p>
            ) : null}
            {visible.map(({ row, timeline }) => {
              const id = String(row.id ?? "");
              const lines = (row.lines as Record<string, unknown>[]) ?? [];
              const first = lines[0];
              const more = Math.max(0, lines.length - 1);
              return (
                <Link
                  key={id}
                  href={customerShopOrderPath(tenantSlug, id)}
                  className={cn(
                    "group block rounded-[1.4rem] border bg-white p-4 transition hover:border-[#d9c6bd] hover:shadow-[0_10px_30px_rgba(60,30,35,0.06)] sm:p-5",
                    SHOP_HAIRLINE,
                  )}
                >
                  <div className="flex gap-4">
                    <div className="relative shrink-0">
                      <ShopProductArt uploadId={(first?.imageUploadId as string | undefined) ?? null} alt="" className="size-20 sm:size-24" rounded="rounded-2xl" />
                      {more > 0 ? (
                        <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#4d4245] shadow-sm ring-1 ring-[#ecdfd8]">
                          +{more}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={cn("text-sm font-semibold", toneText[timeline.tone])}>{timeline.headline}</p>
                          <p className={cn("mt-0.5 line-clamp-1 font-serif text-base", SHOP_INK)}>
                            {String(first?.name ?? "Order")}
                            {more > 0 ? <span className={cn("font-sans text-sm", SHOP_MUTED)}> and {more} more</span> : null}
                          </p>
                        </div>
                        <p className={cn("shrink-0 font-semibold tabular-nums", SHOP_INK)}>{formatShopInr(Number(row.totalPaise ?? 0))}</p>
                      </div>
                      <p className={cn("mt-1 text-xs", SHOP_MUTED)}>
                        {String(row.orderNumber ?? id)} · {formatShopOrderDate(row.createdAt)} · {row.paymentMethod === "COD" ? "Cash on delivery" : "Online payment"}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1">
                          <ShopOrderProgressStepper timeline={timeline} compact />
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-[#b3a5a8] transition group-hover:translate-x-0.5 group-hover:text-[var(--customer-primary,#730321)]" aria-hidden />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            {nextCursor ? (
              <Button type="button" variant="outline" className="h-11 w-full rounded-full" disabled={orders.isFetching} onClick={() => setCursor(nextCursor)}>
                {orders.isFetching ? "Loading…" : "Load more orders"}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
