"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck, ChevronRight, Clock, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import { bookingPayAction, bookingSteps, bookingTimeLeft, formatBookingWhen, type CustomerBooking } from "@/src/lib/customer-shop-booking";
import { customerShopBookingPath } from "@/src/lib/customer-shop-paths";
import { formatShopInr, SHOP_MUTED } from "@/src/features/customer/customer-shop-ui";
import { BookingStatusPill } from "@/src/features/customer/customer-shop-booking-page";
import { useListShopBookingsQuery } from "@/src/store/api/customer-api";
import { cn } from "@/lib/utils";

export function CustomerShopBookingsPage() {
  const { tenantSlug } = useCustomerTenant();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const bookings = useListShopBookingsQuery({ cursor, limit: 20 });

  if (bookings.isLoading && !bookings.data) return <PageSkeleton cards={2} />;
  if (bookings.isError) return <QueryError error={bookings.error} onRetry={bookings.refetch} />;

  const items = (bookings.data?.items ?? []) as unknown as CustomerBooking[];
  const nextCursor = bookings.data?.page?.nextCursor ?? null;

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <Link href={customerPath(tenantSlug, "shop")} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" /> Shop
      </Link>
      <h1 className="mt-3 font-serif text-[2rem] leading-tight text-[#221a1d]">My bookings</h1>
      <p className={cn("mt-1 text-sm", SHOP_MUTED)}>Pieces you have reserved with an advance.</p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-[1.25rem] border border-dashed border-[#ecdfd8] p-8 text-center">
          <CalendarCheck className="mx-auto size-8 text-[#8a6a24]" />
          <p className="mt-3 font-semibold text-[#221a1d]">No bookings yet</p>
          <p className={cn("mt-1 text-sm", SHOP_MUTED)}>When a piece can be booked, you will see a Book button on its page.</p>
          <Button asChild className="mt-4 rounded-full text-white" style={customerBrandStyle.primaryBg}><Link href={customerPath(tenantSlug, "shop")}>Browse the shop</Link></Button>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((b) => {
            const action = bookingPayAction(b);
            const steps = bookingSteps(b);
            const paid = Number(b.advance?.capturedPaise ?? 0);
            return (
              <li key={b.id}>
                <Link
                  href={customerShopBookingPath(tenantSlug, b.id)}
                  className={cn(
                    "block overflow-hidden rounded-[1.4rem] border bg-white transition-colors hover:border-[var(--customer-primary,#730321)]",
                    action ? "border-[var(--customer-primary,#730321)]/40" : "border-[#ecdfd8]",
                  )}
                >
                  <div className="flex items-start gap-3 p-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#faf3ee] text-[var(--customer-primary,#730321)]"><Gem className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate font-semibold text-[#221a1d]">{b.product?.name ?? "Booking"}</span>
                        <BookingStatusPill status={b.status} />
                      </span>
                      <span className={cn("mt-0.5 block text-xs", SHOP_MUTED)}>
                        {b.bookingNumber ?? b.id.slice(-8)} · {paid > 0 ? `${formatShopInr(paid)} paid` : "Nothing paid yet"} · est. {formatShopInr(b.estimateTotalPaise)}
                      </span>
                      <span className="mt-3 flex gap-1" aria-hidden>
                        {steps.map((s) => (
                          <span
                            key={s.key}
                            className={cn(
                              "h-1.5 flex-1 rounded-full",
                              s.state === "done" ? "bg-[var(--customer-primary,#730321)]" : s.state === "current" ? "bg-[var(--customer-primary,#730321)]/45" : "bg-[#f1e7e2]",
                            )}
                          />
                        ))}
                      </span>
                    </span>
                  </div>
                  {action ? (
                    <span className="flex items-center justify-between gap-3 border-t border-[#f3e8e2] bg-[#fdf6f3] px-4 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block font-semibold text-[#221a1d]">{action.label} · {formatShopInr(action.amountPaise, 2)}</span>
                        {action.dueAt ? (
                          <span className={cn("mt-0.5 flex items-center gap-1 text-xs", bookingTimeLeft(action.dueAt, now) ? "font-semibold text-amber-800" : SHOP_MUTED)}>
                            {bookingTimeLeft(action.dueAt, now) ? <><Clock className="size-3.5" /> {bookingTimeLeft(action.dueAt, now)}</> : <>by {formatBookingWhen(action.dueAt)}</>}
                          </span>
                        ) : null}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold text-white" style={customerBrandStyle.primaryBg}>
                        Pay <ChevronRight className="size-3.5" />
                      </span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor ? (
        <div className="mt-5 text-center">
          <Button type="button" variant="outline" className="rounded-full" disabled={bookings.isFetching} onClick={() => setCursor(nextCursor)}>
            {bookings.isFetching ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
