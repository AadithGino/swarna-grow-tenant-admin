"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight, ScrollText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useGetEcommerceBookingsQuery } from "@/src/store/api/admin-api";
import {
  BOOKING_STATUS_LABEL,
  bookingNextStep,
  type BookingNextStep,
  dateTime,
  inr,
  REFUND_STATUS_LABEL,
} from "@/src/features/ecommerce/ecommerce-booking-ui";

const ALL = "ALL";

const STATUS_TABS = [
  { value: ALL, label: "All" },
  { value: "CONFIRMED", label: "To bill" },
  { value: "BALANCE_PENDING", label: "Awaiting balance" },
  { value: "PENDING_ADVANCE", label: "Awaiting advance" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

const STEP_TONE: Record<BookingNextStep["tone"], string> = {
  action: "bg-[#7b0a2b]",
  waiting: "bg-amber-500",
  danger: "bg-red-600",
  done: "bg-[#cbbfc2]",
};

function NextStepCell({ step }: { step: BookingNextStep }) {
  return (
    <div className="flex items-start gap-2">
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", STEP_TONE[step.tone])} aria-hidden />
      <div className="min-w-0">
        <div className={cn("font-medium", step.tone === "danger" ? "text-red-700" : step.tone === "done" ? "text-[#857a7d]" : "text-[#2a1f22]")}>
          {step.label}
          {step.owner === "STAFF" && step.tone !== "danger" ? <span className="ml-1.5 rounded bg-[#f6ece8] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7b0a2b]">You</span> : null}
        </div>
        {step.detail ? <div className={cn("text-xs", step.detail === "overdue" ? "font-semibold text-red-700" : "text-[#857a7d]")}>{step.detail}</div> : null}
      </div>
    </div>
  );
}

function initials(name: unknown): string {
  return String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function EcommerceBookingsPage() {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [status, setStatus] = useState(ALL);
  const [refundStatus, setRefundStatus] = useState(ALL);
  const [search, setSearch] = useState("");
  const pager = useCursorPagination(20, `${status}|${refundStatus}|${search}`);
  const query = useGetEcommerceBookingsQuery({
    ...pager.queryParams,
    ...(status !== ALL ? { status } : {}),
    ...(refundStatus !== ALL ? { refundStatus } : {}),
    ...(search.trim() ? { q: search.trim() } : {}),
  });

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Online store"
        icon={CalendarClock}
        title="Advance bookings"
        description="Ornaments customers have reserved with an advance. Bill a booking once the final price is known, cancel it, or follow its refunds."
        actions={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/ecommerce/booking-policies">
              <ScrollText /> Booking policies
            </Link>
          </Button>
        }
      />
      <div className="space-y-3">
        <div role="tablist" aria-label="Booking status" className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => setStatus(tab.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                status === tab.value
                  ? "border-[#7b0a2b] bg-[#7b0a2b] text-white"
                  : "border-[#e8dcd7] bg-white text-[#5f5256] hover:border-[#cdb8b1]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a3979a]" />
            <Input
              className="h-10 rounded-xl bg-white pl-9"
              placeholder="Search booking number or product"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search bookings"
            />
          </div>
          <div className="min-w-[11rem]">
            <Select value={refundStatus} onValueChange={setRefundStatus}>
              <SelectTrigger aria-label="Refund status" className="h-10 rounded-xl bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any refund state</SelectItem>
                {Object.entries(REFUND_STATUS_LABEL)
                  .filter(([value]) => value !== "NONE")
                  .map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {query.isLoading ? (
        <PageSkeleton cards={2} />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <div className="rounded-[1.15rem] border border-[#e8dcd7] bg-white">
          <EmptyState
            icon={CalendarClock}
            title="No bookings found"
            detail="Bookings appear here once customers reserve an ornament with an advance."
          />
        </div>
      ) : (
        <Surface bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-sm">
              <thead>
                <tr className="border-b border-[#f3eae7] bg-[#fcf9f7] text-left text-[11px] uppercase tracking-wide text-[#857a7d]">
                  <th className="px-5 py-3 font-semibold">Booking</th>
                  <th className="px-3 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Piece</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 text-right font-semibold">Paid</th>
                  <th className="px-3 py-3 font-semibold">Next step</th>
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3eae7]">
                {items.map((b) => {
                  const step = bookingNextStep(b, now);
                  const total = Number(b.finalBilling?.totalPaise ?? b.estimateTotalPaise ?? 0);
                  const paid = Number(b.advance?.capturedPaise ?? 0) + Number(b.balance?.capturedPaise ?? 0);
                  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                  return (
                    <tr key={b.id} className="group cursor-pointer hover:bg-[#fcf8f6]" onClick={() => router.push(`/ecommerce/bookings/${b.id}`)}>
                      <td className="px-5 py-3.5">
                        <Link className="font-semibold text-[#7b0a2b] hover:underline" href={`/ecommerce/bookings/${b.id}`} onClick={(e) => e.stopPropagation()}>
                          {b.bookingNumber}
                        </Link>
                        <div className="text-xs text-[#857a7d]">{dateTime(b.createdAt)}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        {b.customer ? (
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f6ece8] text-xs font-bold text-[#7b0a2b]">{initials(b.customer.name)}</span>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-[#2a1f22]">{b.customer.name}</div>
                              <div className="text-xs text-[#857a7d]">{b.customer.mobile}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#857a7d]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="font-medium text-[#2a1f22]">{b.product?.name ?? "—"}</div>
                        <div className="text-xs text-[#857a7d]">
                          {b.product?.sku}
                          {b.pickupBranch?.name ? ` · ${b.pickupBranch.name}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={b.status} label={BOOKING_STATUS_LABEL[b.status] ?? b.status} />
                          {b.refundStatus && b.refundStatus !== "NONE" ? (
                            <StatusBadge status={b.refundStatus} label={REFUND_STATUS_LABEL[b.refundStatus]} />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <div className="font-semibold tabular-nums text-[#2a1f22]">{inr(paid)}</div>
                        <div className="text-xs tabular-nums text-[#857a7d]">of {inr(total)}{b.finalBilling ? "" : " est."}</div>
                        <div className="ml-auto mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-[#f1e7e3]">
                          <div className="h-full rounded-full bg-[#7b0a2b]" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <NextStepCell step={step} />
                      </td>
                      <td className="px-3 py-3.5 text-[#c2b5b8] group-hover:text-[#7b0a2b]">
                        <ChevronRight className="size-4" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#f3eae7] px-5 py-3 text-sm">
            <Button variant="outline" size="sm" disabled={!pager.canPrevious} onClick={pager.goPrevious}>
              Previous
            </Button>
            <span className="text-[#857a7d]">Page {pager.pageIndex + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!query.data?.meta.hasMore}
              onClick={() => pager.goNext(query.data?.meta.nextCursor)}
            >
              Next
            </Button>
          </div>
        </Surface>
      )}
    </div>
  );
}
