"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, CalendarClock, Check, FileText, RefreshCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FieldLabel, PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { InfoList, InfoRow, Notice } from "@/src/components/admin-ui/detail-parts";
import { toastApiError } from "@/src/lib/api-error";
import { hasPermission } from "@/src/lib/permissions";
import { useAppSelector } from "@/src/store/hooks";
import {
  useBillEcommerceBookingMutation,
  useCancelEcommerceBookingMutation,
  useGetEcommerceBookingQuery,
  useRecordEcommerceBookingManualRefundMutation,
  useRequoteEcommerceBookingMutation,
  useRetryEcommerceBookingRefundMutation,
} from "@/src/store/api/admin-api";
import {
  BOOKING_STAGES,
  BOOKING_STATUS_LABEL,
  bookingNextStep,
  type BookingNextStep,
  bookingStageIndex,
  bpsLabel,
  dateTime,
  inr,
  OPEN_BOOKING,
  RATE_RULE_LABEL,
  REFUND_STATUS_LABEL,
  TERMINAL_REFUND,
} from "@/src/features/ecommerce/ecommerce-booking-ui";

const NEXT_TONE: Record<BookingNextStep["tone"], string> = {
  action: "bg-[#fbf2ef] text-[#5c0820]",
  waiting: "bg-amber-50 text-amber-950",
  danger: "bg-red-50 text-red-900",
  done: "bg-[#f7f4f3] text-[#4a3b3f]",
};

/** Booked → advance paid → billed → order, with the date each step happened. */
function BookingTracker({ booking: b }: { booking: Record<string, any> }) {
  const at = bookingStageIndex(b.status);
  const dates = [b.createdAt, b.advance?.capturedAt, b.status === "BALANCE_PENDING" || b.status === "CONVERTED" ? b.finalBilling?.billedAt ?? null : null, b.order ? b.order.createdAt ?? null : null];
  const stopped = at == null;
  return (
    <div className="mt-4">
      <ol className="grid grid-cols-4">
        {BOOKING_STAGES.map((stage, i) => {
          // A closed booking still shows what happened before it stopped (e.g. the advance was paid).
          const happened = [true, Number(b.advance?.capturedPaise ?? 0) > 0, Boolean(b.finalBilling), Boolean(b.order)][i];
          const reached = stopped ? happened : i <= (at ?? -1);
          return (
            <li key={stage.key} className="relative">
              {i > 0 ? <span aria-hidden className={cn("absolute right-full top-3.5 h-0.5 w-full", reached ? "bg-[#7b0a2b]" : "bg-[#eadfdb]")} /> : null}
              <div className="relative flex flex-col items-start">
                <span className={cn("relative z-10 grid size-7 place-items-center rounded-full ring-4 ring-white", reached ? "bg-[#7b0a2b] text-white" : "bg-[#f1e7e3] text-[#a3979a]")}>
                  {reached ? <Check width={16} height={16} strokeWidth={3} aria-hidden /> : <span className="text-xs font-bold">{i + 1}</span>}
                </span>
                <span className={cn("mt-2 text-sm font-semibold", reached ? "text-[#2a1f22]" : "text-[#a3979a]")}>{stage.label}</span>
                <span className="text-xs text-[#857a7d]">{reached && dates[i] ? dateTime(dates[i]) : "\u00a0"}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {stopped ? (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#f7f4f3] px-3 py-1 text-xs font-semibold text-[#5f5256]">
          <X className="size-3.5" /> {b.status === "CANCELLED" ? `Cancelled ${dateTime(b.cancelledAt)}` : "Expired before it was paid"}
        </p>
      ) : null}
    </div>
  );
}

type Refund = {
  id: string;
  amountPaise: number;
  status: string;
  source: string;
  orderId: string | null;
  failureReason: string | null;
  createdAt: string | null;
};

export function EcommerceBookingDetailPage({ bookingId }: { bookingId: string }) {
  const query = useGetEcommerceBookingQuery(bookingId);
  const user = useAppSelector((s) => s.session.session?.user);
  const canRefund = hasPermission(user, "ecommerce.refund.operate");
  const canWaiveFee = hasPermission(user, "ecommerce.booking.fee.waive");
  const [bill, billState] = useBillEcommerceBookingMutation();
  const [requote, requoteState] = useRequoteEcommerceBookingMutation();
  const [cancel, cancelState] = useCancelEcommerceBookingMutation();
  const [recordManual, manualState] = useRecordEcommerceBookingManualRefundMutation();
  const [retryRefund, retryState] = useRetryEcommerceBookingRefundMutation();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [waiveFee, setWaiveFee] = useState(false);
  const [requoteOpen, setRequoteOpen] = useState(false);
  const [requoteReason, setRequoteReason] = useState("");
  const [manualFor, setManualFor] = useState<Refund | null>(null);
  const [manualRef, setManualRef] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [manualEvidence, setManualEvidence] = useState("");

  if (query.isLoading) return <PageSkeleton cards={3} />;
  if (query.isError || !query.data?.id) {
    return <QueryError error={query.error} onRetry={() => query.refetch()} />;
  }
  const b = query.data;
  const refunds: Refund[] = b.refunds ?? [];
  // The rows are the truth: a retry that is being processed is "in progress", never "failed".
  const refundFailed = refunds.some((r) => r.status === "FAILED");
  const refundInProgress = !refundFailed && refunds.some((r) => r.status === "INITIATED" || r.status === "PROVIDER_PENDING");
  const attempts: Record<string, any>[] = b.attempts ?? [];
  const events: Record<string, any>[] = b.events ?? [];
  const isOpen = OPEN_BOOKING.has(b.status);
  const feeBps = Number(b.policy?.cancellationFeeBps ?? 0);
  const capturedPaise = Number(b.advance?.capturedPaise ?? 0);
  const feePaise = Math.floor((capturedPaise * feeBps) / 10_000);
  const next = bookingNextStep(b);
  const totalPaise = Number(b.finalBilling?.totalPaise ?? b.estimateTotalPaise ?? 0);
  const paidPaise = capturedPaise + Number(b.balance?.capturedPaise ?? 0);
  const paidPct = totalPaise > 0 ? Math.min(100, Math.round((paidPaise / totalPaise) * 100)) : 0;

  async function run(action: () => Promise<unknown>, success: string, done?: () => void) {
    try {
      await action();
      toast.success(success);
      done?.();
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/ecommerce/bookings", label: "All bookings" }}
        eyebrow="Online store · Advance bookings"
        icon={CalendarClock}
        title={b.bookingNumber}
        description={b.product?.name ? `${b.product.name}${b.product.sku ? ` (${b.product.sku})` : ""} · pickup at ${b.pickupBranch?.name ?? "the branch"}` : undefined}
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} label={BOOKING_STATUS_LABEL[b.status] ?? b.status} />
            {b.refundStatus && b.refundStatus !== "NONE" ? (
              <StatusBadge status={b.refundStatus} label={REFUND_STATUS_LABEL[b.refundStatus]} />
            ) : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {b.status === "BALANCE_PENDING" ? (
              <Button variant="outline" className="rounded-xl" onClick={() => setRequoteOpen(true)}>
                <RefreshCcw /> Re-quote bill
              </Button>
            ) : null}
            {isOpen ? (
              <Button
                variant="outline"
                className="rounded-xl text-red-700"
                onClick={() => {
                  setWaiveFee(false);
                  setCancelReason("");
                  setCancelOpen(true);
                }}
              >
                <Ban /> Cancel booking
              </Button>
            ) : null}
          </div>
        }
      />

      {refundFailed ? (
        <Notice tone="red" title="A refund for this booking failed">
          The payment provider rejected a refund. Retry it below, or record it as paid outside if you returned the money another way.
        </Notice>
      ) : refundInProgress ? (
        <Notice tone="blue" title="Refund in progress">
          A refund has been sent to the payment provider and is not settled yet. It will update here when the provider confirms.
        </Notice>
      ) : null}
      {Number(b.expiryDeferrals ?? 0) >= 3 ? (
        <Notice tone="red" title="This booking cannot be expired automatically">
          The provider has not confirmed a payment for it after several tries. An alert is open for it; check the payment attempts below.
        </Notice>
      ) : null}

      <Surface bodyClassName="p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#857a7d]">Progress</p>
            <BookingTracker booking={b} />
          </div>
          <div className={cn("flex flex-col justify-center gap-2 border-t px-6 py-5 lg:border-l lg:border-t-0", NEXT_TONE[next.tone])}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{next.owner === "STAFF" ? "Your next step" : next.owner === "CUSTOMER" ? "Waiting on the customer" : "Status"}</p>
            <p className="text-lg font-bold leading-snug">{next.label}</p>
            {next.detail ? <p className="text-sm opacity-80">{next.detail}</p> : null}
            {b.status === "BALANCE_PENDING" ? (
              <p className="text-sm opacity-80">
                {inr(b.finalBilling?.balancePaise)} due by {dateTime(b.balanceDueAt)}. After that the booking expires and the advance is refunded.
              </p>
            ) : null}
            {b.status === "CONFIRMED" ? (
              <Button
                className="mt-1 w-fit rounded-xl"
                disabled={billState.isLoading}
                onClick={() =>
                  run(() => bill({ bookingId }).unwrap(), "Final bill prepared. The customer can now pay the balance.").catch(() => undefined)
                }
              >
                <FileText /> Prepare final bill
              </Button>
            ) : null}
          </div>
        </div>
      </Surface>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <Surface title="Payment summary">
          <div className="px-5 pb-1 pt-1">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs text-[#857a7d]">{b.finalBilling ? "Final total" : "Estimate when booked"}</p>
                <p className="text-[1.7rem] font-extrabold leading-tight tabular-nums text-[#2a1f22]">{inr(totalPaise)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#857a7d]">Paid so far</p>
                <p className="text-lg font-bold tabular-nums text-[#1f6b4c]">{inr(paidPaise)}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1e7e3]">
              <div className="h-full rounded-full bg-[#1f6b4c]" style={{ width: `${paidPct}%` }} />
            </div>
          </div>
          <InfoList>
            {b.finalBilling ? <InfoRow label="Estimate when booked">{inr(b.estimateTotalPaise)}</InfoRow> : null}
            <InfoRow label="Advance required">{inr(b.advance?.requiredPaise)}</InfoRow>
            <InfoRow label="Advance paid" hint={b.advance?.capturedAt ? dateTime(b.advance.capturedAt) : undefined}>{inr(b.advance?.capturedPaise)}</InfoRow>
            {b.finalBilling ? <InfoRow label="Balance to pay">{inr(b.finalBilling.balancePaise)}</InfoRow> : null}
          </InfoList>
          {b.finalBilling ? (
            <InfoList>
              <InfoRow label="Subtotal">{inr(b.finalBilling.subtotalPaise)}</InfoRow>
              <InfoRow label="Tax">{inr(b.finalBilling.taxPaise)}</InfoRow>
              <InfoRow label="Gold rate used">{b.finalBilling.rateSource === "BOOKED" ? "Booked rate" : "Rate on the billing day"}</InfoRow>
              {Number(b.finalBilling.excessAdvancePaise) > 0 ? (
                <InfoRow label="Advance above the final total" hint="Refunded to the customer when the order is created">
                  {inr(b.finalBilling.excessAdvancePaise)}
                </InfoRow>
              ) : null}
            </InfoList>
          ) : (
            <p className="px-5 pb-4 text-sm text-[#7a6d70]">The final bill has not been prepared yet.</p>
          )}
          {(b.billingRevisions ?? []).length ? (
            <div className="border-t border-[#f3eae7] px-5 py-3 text-xs text-[#7a6d70]">
              <p className="mb-1 font-semibold text-[#4a3b3f]">Earlier bills</p>
              <ul className="space-y-1">
                {b.billingRevisions.map((r: Record<string, any>, i: number) => (
                  <li key={i}>
                    {dateTime(r.at)} — was {inr(r.previousTotalPaise)} · {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Surface>

        <div className="space-y-6">
        {b.customer ? (
          <Surface title="Customer">
            <div className="flex items-center gap-3 px-5 pb-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f6ece8] text-sm font-bold text-[#7b0a2b]">
                {String(b.customer.name ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[#2a1f22]">{b.customer.name}</p>
                <p className="text-sm text-[#7a6d70]">{b.customer.mobile}</p>
                {b.customer.customerNumber ? <p className="text-xs text-[#a2969a]">{b.customer.customerNumber}</p> : null}
              </div>
              <Button asChild size="sm" variant="outline" className="rounded-lg">
                <Link href={`/customers/${b.customer.id}`}>Open</Link>
              </Button>
            </div>
          </Surface>
        ) : null}
        <Surface title="Terms and deadlines">
          <InfoList>
            <InfoRow label="Advance due by">{b.status === "PENDING_ADVANCE" ? dateTime(b.advanceDueAt) : "Paid"}</InfoRow>
            <InfoRow label="Balance due by">{dateTime(b.balanceDueAt)}</InfoRow>
            <InfoRow label="Gold rate protected until">{dateTime(b.rateProtectedUntil)}</InfoRow>
            {isOpen && b.rateProtectedUntil && b.balanceDueAt && new Date(b.rateProtectedUntil) < new Date(b.balanceDueAt) ? (
              <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                {new Date(b.rateProtectedUntil) <= new Date()
                  ? "Rate protection has ended. A final bill now uses the billing-day gold rate."
                  : "Rate protection ends before the balance is due. A final bill after it ends uses the billing-day gold rate."}
              </p>
            ) : null}
            <InfoRow label="Gold rate rule">{RATE_RULE_LABEL[b.policy?.rateRule] ?? b.policy?.rateRule ?? "—"}</InfoRow>
            <InfoRow label="Cancellation fee">{bpsLabel(feeBps)} of the advance</InfoRow>
            <InfoRow label="Terms accepted">{dateTime(b.policy?.termsAcceptedAt)}</InfoRow>
            <InfoRow label="Order">{b.order ? `${b.order.orderNumber} (${b.order.status})` : "—"}</InfoRow>
            {b.status === "CANCELLED" ? (
              <>
                <InfoRow label="Cancelled">{dateTime(b.cancelledAt)}</InfoRow>
                <InfoRow label="Fee kept">{inr(b.cancellationFeePaise)}</InfoRow>
                {b.feeWaiver ? (
                  <InfoRow label="Fee waived">
                    {inr(b.feeWaiver.waivedPaise)} by staff {b.feeWaiver.by} on {dateTime(b.feeWaiver.at)}
                  </InfoRow>
                ) : null}
                <InfoRow label="Reason">{b.cancelReason ?? "—"}</InfoRow>
              </>
            ) : null}
          </InfoList>
          {b.policy?.termsText ? (
            <details className="border-t border-[#f3eae7] px-5 py-3 text-sm">
              <summary className="cursor-pointer font-semibold text-[#4a3b3f]">Terms the customer accepted</summary>
              <p className="mt-2 whitespace-pre-wrap text-[#5f5256]">{b.policy.termsText}</p>
            </details>
          ) : null}
        </Surface>
        </div>
      </div>

      <Surface title="Refunds" description="Money returned to the customer for this booking">
        {refunds.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-[#7a6d70]">No refunds for this booking.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-[#f3eae7] text-left text-xs uppercase tracking-wide text-[#857a7d]">
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="px-3 py-3 text-right font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Note</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3eae7]">
                {refunds.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3">{refundSourceLabel(r.source)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{inr(r.amountPaise)}</td>
                    <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-3 text-xs text-[#7a6d70]">{r.failureReason ?? ""}</td>
                    <td className="px-3 py-3 text-right">
                      {canRefund && !TERMINAL_REFUND.has(r.status) ? (
                        r.orderId ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/ecommerce/orders/${r.orderId}`}>Handle on the order</Link>
                          </Button>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-2">
                            {r.status === "ASSIGNED" || r.status === "FAILED" ? (
                              <Button
                                size="sm"
                                disabled={retryState.isLoading}
                                onClick={() =>
                                  run(
                                    () => retryRefund({ bookingId, refundId: r.id }).unwrap(),
                                    r.status === "FAILED" ? "Refund retried" : "Refund sent to the provider",
                                  ).catch(() => undefined)
                                }
                              >
                                {r.status === "FAILED" ? "Retry refund" : "Send refund"}
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setManualFor(r);
                                setManualRef("");
                                setManualReason("");
                                setManualEvidence("");
                              }}
                            >
                              Record as paid outside
                            </Button>
                          </div>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <Surface title="Payment attempts" description="Every payment started for this booking, including ones that ended">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-[#f3eae7] text-left text-xs uppercase tracking-wide text-[#857a7d]">
                <th className="px-5 py-3 font-semibold">For</th>
                <th className="px-3 py-3 text-right font-semibold">Amount</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Window ends</th>
                <th className="px-3 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3eae7]">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3">{a.purpose === "BOOKING_ADVANCE" ? "Advance" : "Balance"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{inr(a.amountPaise)}</td>
                  <td className="px-3 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-3 py-3">{dateTime(a.expiresAt)}</td>
                  <td className="px-3 py-3 text-xs text-[#7a6d70]">{a.failureReason ?? a.operationalStatus ?? ""}</td>
                </tr>
              ))}
              {attempts.length === 0 ? (
                <tr><td className="px-5 py-4 text-[#7a6d70]" colSpan={5}>No payments started.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {events.length ? (
          <details className="border-t border-[#f3eae7] px-5 py-3 text-sm">
            <summary className="cursor-pointer font-semibold text-[#4a3b3f]">Provider activity ({events.length})</summary>
            <ul className="mt-2 space-y-1 text-xs text-[#5f5256]">
              {events.map((e, i) => (
                <li key={i}>
                  {dateTime(e.at)} — {e.outcome}
                  {e.reason ? ` (${e.reason})` : ""}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </Surface>

      <ActionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this booking"
        description="The stock is released and the advance is refunded, less the cancellation fee set by the policy."
        actionLabel="Cancel booking"
        submitDisabled={cancelReason.trim().length < 8 || cancelState.isLoading}
        onSubmit={() =>
          run(
            () => cancel({ bookingId, reason: cancelReason.trim(), waiveFee: canWaiveFee && waiveFee }).unwrap(),
            "Booking cancelled",
            () => setCancelOpen(false),
          )
        }
      >
        <div className="grid gap-4">
          <div>
            <FieldLabel>Reason (kept on the booking)</FieldLabel>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="At least 8 characters" />
          </div>
          {capturedPaise > 0 ? (
            <label className="flex items-start justify-between gap-4 rounded-xl border border-[#ead9b8] bg-[#fffaf0] p-3 text-sm">
              <span>
                <span className="block font-semibold">Waive the cancellation fee</span>
                <span className="block text-[#7a6d70]">
                  {feeBps > 0
                    ? waiveFee
                      ? `The customer gets the whole ${inr(capturedPaise)} back.`
                      : `The shop keeps ${inr(feePaise)} (${bpsLabel(feeBps)}); the customer gets ${inr(capturedPaise - feePaise)} back.`
                    : "This policy has no cancellation fee."}
                  {feeBps > 0 && !canWaiveFee ? " Waiving the fee needs the fee-waiver permission, which the tenant owner can grant." : ""}
                  {feeBps > 0 && canWaiveFee && waiveFee ? " Your name and the reason above are recorded in the audit trail." : ""}
                </span>
              </span>
              <Switch checked={canWaiveFee && waiveFee} onCheckedChange={setWaiveFee} disabled={feeBps === 0 || !canWaiveFee} aria-label="Waive cancellation fee" />
            </label>
          ) : (
            <p className="text-sm text-[#7a6d70]">No advance has been paid, so nothing is refunded.</p>
          )}
        </div>
      </ActionDialog>

      <ActionDialog
        open={requoteOpen}
        onOpenChange={setRequoteOpen}
        title="Re-quote the final bill"
        description="Prices the bill again, for example after correcting a wrong gold rate. Only possible while the customer has not started paying the balance."
        actionLabel="Re-quote"
        submitDisabled={requoteReason.trim().length < 8 || requoteState.isLoading}
        onSubmit={() =>
          run(
            () => requote({ bookingId, reason: requoteReason.trim() }).unwrap(),
            "Bill re-quoted",
            () => {
              setRequoteOpen(false);
              setRequoteReason("");
            },
          )
        }
      >
        <div>
          <FieldLabel>Why is the bill being re-quoted?</FieldLabel>
          <Textarea value={requoteReason} onChange={(e) => setRequoteReason(e.target.value)} placeholder="At least 8 characters" />
        </div>
      </ActionDialog>

      <ActionDialog
        open={manualFor != null}
        onOpenChange={(open) => !open && setManualFor(null)}
        title="Record a refund paid outside the gateway"
        description={manualFor ? `Use this only if you returned ${inr(manualFor.amountPaise)} to the customer yourself (bank transfer, cash). The refund is closed and cannot be sent through the provider afterwards.` : undefined}
        actionLabel="Record refund"
        submitDisabled={
          manualRef.trim().length < 4 || manualReason.trim().length < 8 || manualEvidence.trim().length < 8 || manualState.isLoading
        }
        onSubmit={() =>
          manualFor
            ? run(
                () =>
                  recordManual({
                    bookingId,
                    refundId: manualFor.id,
                    providerRefundReference: manualRef.trim(),
                    reason: manualReason.trim(),
                    evidenceNote: manualEvidence.trim(),
                  }).unwrap(),
                "Refund recorded",
                () => setManualFor(null),
              )
            : Promise.resolve()
        }
      >
        <div className="grid gap-4">
          <div>
            <FieldLabel>Payment reference (UTR / receipt number)</FieldLabel>
            <Input value={manualRef} onChange={(e) => setManualRef(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Reason</FieldLabel>
            <Textarea value={manualReason} onChange={(e) => setManualReason(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div>
            <FieldLabel>Evidence note</FieldLabel>
            <Textarea value={manualEvidence} onChange={(e) => setManualEvidence(e.target.value)} placeholder="Where the proof of payment is kept" />
          </div>
        </div>
      </ActionDialog>
    </div>
  );
}

function refundSourceLabel(source: string): string {
  switch (source) {
    case "BOOKING_CANCELLATION":
      return "Booking cancelled";
    case "BOOKING_EXPIRY":
      return "Booking expired";
    case "BOOKING_EXCESS_ADVANCE":
      return "Advance above the final total";
    case "PAYMENT_EXCEPTION":
      return "Payment could not be applied";
    default:
      return source || "Refund";
  }
}
