"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Clock, Gem } from "lucide-react";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import {
  bookingPayAction,
  bookingTimeLeft,
  bookingUrgencyMinutesLeft,
  formatBookingWhen,
  type CustomerBooking,
} from "@/src/lib/customer-shop-booking";
import { formatShopInr, SHOP_MUTED } from "@/src/features/customer/customer-shop-ui";
import { BookingStatusPill } from "@/src/features/customer/customer-shop-booking-page";
import { cn } from "@/lib/utils";

type HighlightProps = {
  booking: CustomerBooking;
  href: string;
  variant?: "banner" | "card" | "compact";
  className?: string;
};

function useBookingNow(tickMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(t);
  }, [tickMs]);
  return now;
}

export function BookingHighlightCard({ booking, href, variant = "card", className }: HighlightProps) {
  const now = useBookingNow(variant === "banner" ? 15_000 : 30_000);
  const action = bookingPayAction(booking);
  const left = action ? bookingTimeLeft(action.dueAt, now) : null;
  const urgent = action && (bookingUrgencyMinutesLeft(action.dueAt, now) ?? 999) < 30;

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-[1.15rem] border bg-white p-3.5",
          action ? "border-[var(--customer-primary,#730321)]/50" : "border-[var(--ck-line,#ebe2d7)]",
          className,
        )}
      >
        <span className="grid size-10 place-items-center rounded-xl bg-[#faf3ee] text-[var(--customer-primary,#730321)]">
          <Gem className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9rem] font-semibold text-[var(--ck-ink,#1d1417)]">
            {booking.product?.name ?? "Reserved piece"}
          </span>
          <span className={cn("block text-xs", SHOP_MUTED)}>
            {action
              ? `${action.label} · ${formatShopInr(action.amountPaise, 2)}${left ? ` · ${left}` : ""}`
              : "Reserved · waiting for store to bill"}
          </span>
        </span>
        <ChevronRight className="size-4 text-[#ad9fa2]" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "block overflow-hidden rounded-[1.25rem] border bg-white transition-colors",
        action ? (urgent ? "border-2 border-[var(--customer-primary,#730321)]" : "border-[var(--customer-primary,#730321)]/45") : "border-[var(--ck-line,#ebe2d7)]",
        className,
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#faf3ee] text-[var(--customer-primary,#730321)]">
          <Gem className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-[#221a1d]">{booking.product?.name ?? "Your booking"}</p>
            <BookingStatusPill status={booking.status} />
          </div>
          <p className={cn("mt-0.5 text-xs", SHOP_MUTED)}>
            {booking.bookingNumber ?? booking.id.slice(-8)}
            {Number(booking.advance?.capturedPaise) > 0 ? ` · ${formatShopInr(booking.advance?.capturedPaise, 2)} advance paid` : ""}
          </p>
        </div>
      </div>
      {action ? (
        <div className={cn("flex items-center justify-between gap-3 border-t px-4 py-3", urgent ? "border-[var(--customer-primary,#730321)]/20 bg-[#fdf6f3]" : "border-[#f3e8e2] bg-[#faf6f2]")}>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#221a1d]">
              {action.label} · {formatShopInr(action.amountPaise, 2)}
            </span>
            {action.dueAt ? (
              <span className={cn("mt-0.5 flex items-center gap-1 text-xs", urgent ? "font-semibold text-amber-800" : SHOP_MUTED)}>
                {left ? <><Clock className="size-3.5" /> {left}</> : <>by {formatBookingWhen(action.dueAt)}</>}
              </span>
            ) : null}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold text-white" style={customerBrandStyle.primaryBg}>
            Pay <ChevronRight className="size-3.5" />
          </span>
        </div>
      ) : booking.status === "CONFIRMED" ? (
        <p className="border-t border-[#f3e8e2] px-4 py-3 text-xs text-[var(--ck-muted)]">
          Your piece is reserved. The store will send the final bill when it is ready.
        </p>
      ) : null}
    </Link>
  );
}