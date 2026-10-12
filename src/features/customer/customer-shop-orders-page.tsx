"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrderPath } from "@/src/lib/customer-shop-paths";
import { useGetShopAvailabilityQuery, useListShopOrdersQuery } from "@/src/store/api/customer-api";
import { ProfileSubpageHeader } from "@/src/features/customer/customer-profile-shared";
import {
  buildShopOrderTimeline,
  formatShopOrderDate,
  ShopOrderProgressStepper,
} from "@/src/features/customer/customer-shop-order-progress";

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export function CustomerShopOrdersPage() {
  const { tenantSlug } = useCustomerTenant();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const availability = useGetShopAvailabilityQuery();
  const orders = useListShopOrdersQuery({ cursor, limit: 20 });
  const shopOpen = availability.data?.available === true;

  if (orders.isLoading && !orders.data) return <PageSkeleton cards={2} />;
  if (orders.isError) return <QueryError error={orders.error} onRetry={orders.refetch} />;

  const items = orders.data?.items ?? [];
  const nextCursor = orders.data?.page?.nextCursor ?? null;

  return (
    <div className="mx-auto max-w-lg pb-8">
      <ProfileSubpageHeader
        tenantSlug={tenantSlug}
        title="Your orders"
        backHref={customerPath(tenantSlug, "profile")}
        preferHistoryBack={false}
      />
      <p className="mt-1 text-sm text-[#777280]">
        Track progress, payment, and delivery for each shop order.
      </p>

      {items.length === 0 ? (
        <section className="customer-surface mt-5 p-8 text-center">
          <Package className="mx-auto size-10 customer-gold-copy" />
          <p className="mt-4 text-sm font-bold text-[#171722]">No orders yet</p>
          <p className="mt-2 text-xs text-[#777280]">
            When you place an order from the shop, it will appear here with live status.
          </p>
          {shopOpen ? (
            <Link
              href={customerPath(tenantSlug, "shop")}
              className="mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-bold text-white"
              style={{ background: "var(--customer-primary, #730321)" }}
            >
              Browse shop
            </Link>
          ) : (
            <p className="mt-4 text-xs text-[#777280]">
              The online store is not open right now. Past orders stay available here when you have them.
            </p>
          )}
        </section>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((row) => {
            const id = String(row.id ?? "");
            const timeline = buildShopOrderTimeline(row);
            const lines = (row.lines as Record<string, unknown>[]) ?? [];
            const visibleLines = lines.slice(0, 2);
            const hidden = Math.max(0, lines.length - visibleLines.length);

            return (
              <article key={id} className="customer-surface overflow-hidden">
                <div className="border-b border-[#ece6e1] bg-[#faf7f4] px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#999]">
                        {formatShopOrderDate(row.createdAt) || "Order"}
                      </p>
                      <p className="text-sm font-black text-[#171722]">
                        {String(row.orderNumber ?? id)}
                      </p>
                    </div>
                    <p className="text-sm font-black text-[#171722]">
                      {formatInr(Number(row.totalPaise ?? 0))}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-bold text-[var(--customer-primary,#730321)]">
                    {timeline.headline}
                  </p>
                  <div className="mt-3">
                    <ShopOrderProgressStepper timeline={timeline} compact />
                  </div>
                </div>

                <ul className="divide-y divide-[#f0ebe6] px-4">
                  {visibleLines.map((line) => (
                    <li key={String(line.productId)} className="flex gap-3 py-3">
                      <span
                        className="grid size-12 shrink-0 place-items-center rounded-xl text-[var(--customer-primary,#730321)]"
                        style={{ background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.08)" }}
                      >
                        <Package className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#171722]">
                          {String(line.name ?? "Item")}
                        </p>
                        <p className="text-xs text-[#777280]">Qty {String(line.quantity ?? 1)}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        {formatInr(Number(line.lineTotalPaise ?? 0))}
                      </p>
                    </li>
                  ))}
                  {hidden > 0 ? (
                    <li className="py-2 text-xs text-[#777280]">+ {hidden} more item(s)</li>
                  ) : null}
                </ul>

                <div className="border-t border-[#ece6e1] px-4 py-3">
                  <Link
                    href={customerShopOrderPath(tenantSlug, id)}
                    className="flex items-center justify-between text-sm font-bold text-[var(--customer-primary,#730321)]"
                  >
                    View order details
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </article>
            );
          })}
          {nextCursor ? (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              disabled={orders.isFetching}
              onClick={() => setCursor(nextCursor)}
            >
              {orders.isFetching ? "Loading…" : "Load more orders"}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
