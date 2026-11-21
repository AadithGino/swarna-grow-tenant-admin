"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, CircleAlert, Clock, FileText, Gem, Info, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { toastApiError } from "@/src/lib/api-error";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import { openCustomerPaymentTarget, pickPhonePeGatewayUrl } from "@/src/lib/customer-payment-redirect";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { readShopPaymentAttemptId, saveShopPaymentAttemptId } from "@/src/lib/shop-payment-idempotency";
import {
  attemptForStage,
  bookingAttemptKey,
  bookingPayAction,
  bookingPaymentHint,
  excessAdvanceLabel,
  bookingPollMs,
  bookingRefundNotice,
  bookingStatusLabel,
  bookingSteps,
  canCancelBooking,
  estimateCancellation,
  formatBookingWhen,
  type CustomerBooking,
} from "@/src/lib/customer-shop-booking";
import { customerShopBookingsPath, customerShopBookingPath, customerShopOrderPath } from "@/src/lib/customer-shop-paths";
import { formatShopInr, SHOP_INK, SHOP_MUTED } from "@/src/features/customer/customer-shop-ui";
import {
  useCancelShopBookingMutation,
  useCreateShopBookingPaymentIntentMutation,
  useGetShopBookingQuery,
  useGetShopFulfilmentOptionsQuery,
  useLazyPollShopBookingPaymentIntentQuery,
} from "@/src/store/api/customer-api";
import { cn } from "@/lib/utils";

const card = "rounded-[1.5rem] border border-[#ecdfd8] bg-white p-5";
const sectionTitle = "text-[15px] font-semibold text-[#221a1d]";

const STATUS_TONE: Record<string, string> = {
  PENDING_ADVANCE: "bg-amber-50 text-amber-800",
  CONFIRMED: "bg-emerald-50 text-emerald-800",
  BALANCE_PENDING: "bg-amber-50 text-amber-800",
  CONVERTED: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-stone-100 text-stone-700",
  EXPIRED: "bg-stone-100 text-stone-700",
};

const NOTICE_TONE = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
} as const;

export function BookingStatusPill({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_TONE[status] ?? "bg-stone-100 text-stone-700")}>
      {bookingStatusLabel(status)}
    </span>
  );
}

function Steps({ booking }: { booking: CustomerBooking }) {
  const steps = bookingSteps(booking);
  return (
    <ol className="relative grid grid-cols-4 text-center" aria-label="Booking progress">
      {steps.map((step, i) => (
        <li key={step.key} className="relative flex flex-col items-center gap-1.5">
          {i > 0 ? (
            <span
              aria-hidden
              className={cn(
                "absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2",
                step.state === "done" || step.state === "current" ? "bg-[var(--customer-primary,#730321)]" : "bg-[#ecdfd8]",
              )}
            />
          ) : null}
          <span
            className={cn(
              "relative z-10 grid size-7 place-items-center rounded-full text-xs font-bold ring-4 ring-white",
              step.state === "done" && "bg-[var(--customer-primary,#730321)] text-white",
              step.state === "current" && "border-2 border-[var(--customer-primary,#730321)] bg-white text-[var(--customer-primary,#730321)]",
              step.state === "upcoming" && "bg-[#f4ece7] text-stone-500",
              step.state === "stopped" && "bg-stone-100 text-stone-400",
            )}
          >
            {step.state === "done" ? <Check className="size-4" /> : i + 1}
          </span>
          <span className={cn("px-1 text-[0.7rem] leading-tight", step.state === "current" ? "font-semibold text-[#221a1d]" : SHOP_MUTED)}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function timeLeft(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  if (h >= 48) return `${Math.floor(h / 24)} days left`;
  if (h >= 1) return `${h} h ${Math.floor((ms % 3_600_000) / 60_000)} min left`;
  return `${Math.max(1, Math.floor(ms / 60_000))} min left`;
}

type PollAttempt = ReturnType<typeof useLazyPollShopBookingPaymentIntentQuery>[0];

/** The remembered attempt for this stage, as the server sees it now; null when there is none or the poll fails. */
async function fetchStageAttempt(poll: PollAttempt, bookingId: string, kind: "ADVANCE" | "BALANCE") {
  const id = readShopPaymentAttemptId(bookingAttemptKey(bookingId, kind));
  if (!id) return null;
  try {
    return (await poll({ bookingId, paymentAttemptId: id }).unwrap()).paymentIntent;
  } catch {
    return null; // the booking itself is the source of truth; ignore a failed poll
  }
}

export function CustomerShopBookingPage({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const [pollMs, setPollMs] = useState(5_000);
  const query = useGetShopBookingQuery(bookingId, { pollingInterval: pollMs });
  const fulfilment = useGetShopFulfilmentOptionsQuery();
  const [createIntent, intentState] = useCreateShopBookingPaymentIntentMutation();
  const [cancelBooking, cancelState] = useCancelShopBookingMutation();
  const [pollAttempt] = useLazyPollShopBookingPaymentIntentQuery();
  const [attempt, setAttempt] = useState<Record<string, unknown> | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const b = query.data as unknown as CustomerBooking | undefined;

  useEffect(() => {
    const next = bookingPollMs(b);
    if (next !== pollMs) setPollMs(next);
  }, [b, pollMs]);

  const pay = b ? bookingPayAction(b) : null;
  const payKind = pay?.kind;

  // Watch the payment attempt only while there is something to pay; depend on the kind, not the object.
  useEffect(() => {
    setAttempt(null); // a new stage starts with no attempt; the previous stage's payment is history
    if (!payKind) return;
    let live = true;
    const run = async () => {
      const found = await fetchStageAttempt(pollAttempt, bookingId, payKind);
      if (live && found) setAttempt(found);
    };
    void run();
    const t = window.setInterval(() => void run(), 4_000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [payKind, bookingId, pollAttempt]);

  const branchName = useMemo(() => {
    const branches = (fulfilment.data?.pickup as { branches?: { id?: string; name?: string }[] } | undefined)?.branches ?? [];
    return branches.find((x) => x.id === b?.pickupBranchId)?.name ?? null;
  }, [fulfilment.data, b?.pickupBranchId]);

  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  if (!b) return null;

  const refund = bookingRefundNotice(b);
  const stageAttempt = attemptForStage(attempt, payKind);
  const hint = pay ? bookingPaymentHint(stageAttempt) : null;
  const cancellation = estimateCancellation(b);
  const bookingHref = customerShopBookingPath(tenantSlug, bookingId);

  async function onPay() {
    const redirectUrl = `${window.location.origin}${bookingHref}`;
    try {
      const res = await createIntent({ bookingId, redirectUrl, idempotencyKey: newIdempotencyKey() }).unwrap();
      const pi = res.paymentIntent;
      setAttempt(pi);
      if (pay) saveShopPaymentAttemptId(bookingAttemptKey(bookingId, pay.kind), String(pi.id));
      const gatewayUrl = pickPhonePeGatewayUrl(pi);
      const token = typeof pi.token === "string" ? pi.token : null;
      await openCustomerPaymentTarget(
        { token, redirectUrl: gatewayUrl || redirectUrl, paymentUrl: gatewayUrl || undefined },
        {
          tenantSlug,
          statusRedirectUrl: redirectUrl,
          initiateLink: async () => ({ redirectUrl, gatewayUrl }),
          navigate: (path) => router.push(path),
        },
      );
      void query.refetch();
    } catch (err) {
      toastApiError(err);
      if (pay) {
        const found = await fetchStageAttempt(pollAttempt, bookingId, pay.kind);
        if (found) setAttempt(found);
      }
      void query.refetch();
    }
  }

  async function onCancel() {
    try {
      await cancelBooking({ bookingId, reason: reason.trim() || undefined }).unwrap();
      toast.success("Booking cancelled");
      setCancelOpen(false);
      setReason("");
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <Link href={customerShopBookingsPath(tenantSlug)} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" /> All bookings
      </Link>

      <section className="overflow-hidden rounded-[1.5rem] border border-[#ecdfd8] bg-white">
        <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-[#fbf1ec] to-[#fffaf6] px-5 pb-4 pt-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-[var(--customer-primary,#730321)] shadow-sm ring-1 ring-[#ecdfd8]">
              <Gem className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="font-serif text-[1.55rem] leading-tight text-[#221a1d]">{b.product?.name ?? "Your booking"}</h1>
              <p className={cn("mt-0.5 text-xs", SHOP_MUTED)}>
                Booking {b.bookingNumber ?? b.id.slice(-8)}
                {b.createdAt ? ` · ${formatBookingWhen(b.createdAt)}` : ""}
              </p>
            </div>
          </div>
          <BookingStatusPill status={b.status} />
        </div>
        <div className="px-4 pb-5 pt-4"><Steps booking={b} /></div>
      </section>

      {pay ? (
        <section className="overflow-hidden rounded-[1.5rem] border-2 border-[var(--customer-primary,#730321)] bg-white">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className={sectionTitle}>{pay.kind === "ADVANCE" ? "Pay the advance to hold your piece" : "Pay the balance to complete your purchase"}</h2>
              {timeLeft(pay.dueAt, now) ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                  <Clock className="size-3.5" /> {timeLeft(pay.dueAt, now)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[2.1rem] font-extrabold leading-none tabular-nums tracking-tight text-[#221a1d]">{formatShopInr(pay.amountPaise, 2)}</p>
            {pay.dueAt ? (
              <p className={cn("mt-2 text-sm", SHOP_MUTED)}>
                Pay by {formatBookingWhen(pay.dueAt)}
                {pay.kind === "ADVANCE" ? ", or the booking is released." : ", or the booking expires and your advance is refunded."}
              </p>
            ) : null}
            {pay.kind === "BALANCE" && b.finalBilling ? (
              <dl className="mt-4 space-y-1.5 rounded-2xl bg-[#faf6f2] px-4 py-3 text-sm">
                <Row label="Final price" value={formatShopInr(b.finalBilling.totalPaise, 2)} />
                <Row label="Advance already paid" value={`− ${formatShopInr(b.advance?.capturedPaise, 2)}`} />
              </dl>
            ) : null}
            {hint ? <p className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900"><Info className="mt-0.5 size-4 shrink-0" />{hint}</p> : null}
            <Button type="button" className="mt-4 h-12 w-full rounded-[14px] text-[15px] font-bold text-white" style={customerBrandStyle.primaryBg} disabled={intentState.isLoading || String(stageAttempt?.status) === "SUCCEEDED"} onClick={() => void onPay()}>
              {intentState.isLoading ? "Opening payment…" : String(stageAttempt?.status) === "INITIATED" ? "Resume payment" : `${pay.label} · ${formatShopInr(pay.amountPaise, 2)}`}
            </Button>
            <p className={cn("mt-2 flex items-center justify-center gap-1.5 text-[11px]", SHOP_MUTED)}><ShieldCheck className="size-3.5" /> Secure payment through PhonePe</p>
          </div>
        </section>
      ) : null}

      {b.status === "CONFIRMED" ? (
        <section className={cn(card, "flex gap-3")}>
          <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <h2 className={sectionTitle}>Your piece is reserved</h2>
            <p className={cn("mt-1", SHOP_MUTED)}>
              We have received your advance of {formatShopInr(b.advance?.capturedPaise, 2)}. The store will bill the final price and you will get a message to pay the balance
              {b.balanceDueAt ? ` by ${formatBookingWhen(b.balanceDueAt)}` : ""}.
            </p>
          </div>
        </section>
      ) : null}

      {b.status === "CONVERTED" && b.order ? (
        <section className={cn(card, "flex flex-wrap items-center justify-between gap-3")}>
          <div className="text-sm">
            <h2 className={sectionTitle}>Order {b.order.orderNumber ?? ""} is placed</h2>
            <p className={cn("mt-1", SHOP_MUTED)}>Your balance is paid. Collect your piece from {branchName ?? "the branch"} when the store tells you it is ready.</p>
          </div>
          <Button asChild variant="outline" className="rounded-full"><Link href={customerShopOrderPath(tenantSlug, b.order.id)}>View order</Link></Button>
        </section>
      ) : null}

      {b.status === "EXPIRED" ? (
        <p className="flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"><CircleAlert className="mt-0.5 size-4 shrink-0" />This booking expired because a payment was not completed in time.</p>
      ) : null}
      {b.status === "CANCELLED" ? (
        <p className="flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          Cancelled{b.cancelledAt ? ` on ${formatBookingWhen(b.cancelledAt)}` : ""}.
          {Number(b.cancellationFeePaise) > 0 ? ` A cancellation fee of ${formatShopInr(b.cancellationFeePaise, 2)} was kept as per the booking policy.` : ""}
        </p>
      ) : null}

      {refund ? (
        <section className={cn("rounded-[1.25rem] border p-5 text-sm", NOTICE_TONE[refund.tone])}>
          <h2 className="text-[15px] font-semibold">{refund.title}{refund.amountPaise > 0 ? ` · ${formatShopInr(refund.amountPaise, 2)}` : ""}</h2>
          <p className="mt-1">{refund.detail}</p>
        </section>
      ) : null}

      <section className={card}>
        <h2 className={sectionTitle}>Price</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Estimate when booked" value={formatShopInr(b.estimateTotalPaise, 2)} />
          {b.finalBilling ? <Row label="Final price" value={formatShopInr(b.finalBilling.totalPaise, 2)} strong /> : null}
          <Row label="Advance paid" value={formatShopInr(b.advance?.capturedPaise, 2)} />
          {b.finalBilling ? (
            <>
              <div className="border-t border-dashed border-[#ecdfd8] pt-2"><Row label="Balance to pay" value={formatShopInr(b.finalBilling.balancePaise, 2)} strong /></div>
              {Number(b.finalBilling.excessAdvancePaise) > 0 ? <Row label={excessAdvanceLabel(b.refundStatus)} value={formatShopInr(b.finalBilling.excessAdvancePaise, 2)} /> : null}
            </>
          ) : null}
        </dl>
      </section>

      <section className={cn(card, "divide-y divide-[#f3eae5] py-1")}>
        <div className="flex items-center gap-3 py-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#faf3ee] text-[var(--customer-primary,#730321)]"><Store className="size-4" /></span>
          <div className="min-w-0 flex-1 text-sm">
            <p className={cn("text-xs", SHOP_MUTED)}>Pickup branch</p>
            <p className="font-semibold text-[#221a1d]">{branchName ?? "Branch pickup"}</p>
          </div>
        </div>
        {b.rateProtectedUntil ? (
          <div className="flex items-center gap-3 py-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#faf3ee] text-[var(--customer-primary,#730321)]"><ShieldCheck className="size-4" /></span>
            <div className="min-w-0 flex-1 text-sm">
              <p className={cn("text-xs", SHOP_MUTED)}>Rate protected until</p>
              <p className="font-semibold text-[#221a1d]">{formatBookingWhen(b.rateProtectedUntil)}</p>
            </div>
          </div>
        ) : null}
        {b.policy?.termsText ? (
          <div className="py-3.5">
            <button type="button" className="flex w-full items-center gap-3 text-left text-sm" onClick={() => setTermsOpen((v) => !v)}>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#faf3ee] text-[var(--customer-primary,#730321)]"><FileText className="size-4" /></span>
              <span className="flex-1 font-semibold text-[#221a1d]">{termsOpen ? "Hide booking terms" : "Show booking terms"}</span>
              <ChevronDown className={cn("size-4 text-stone-400 transition-transform", termsOpen && "rotate-180")} />
            </button>
            {termsOpen ? <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#faf6f2] p-3 text-xs leading-5 text-[#5b4f53]">{b.policy.termsText}</p> : null}
          </div>
        ) : null}
      </section>

      {canCancelBooking(b) ? (
        <div className="text-center">
          <Button type="button" variant="ghost" className="text-red-700 hover:text-red-800" onClick={() => setCancelOpen(true)}>Cancel booking</Button>
        </div>
      ) : null}

      <Dialog open={cancelOpen} onOpenChange={(next) => !cancelState.isLoading && setCancelOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>The piece will be released for other customers.</DialogDescription>
          </DialogHeader>
          {cancellation.capturedPaise > 0 ? (
            <dl className="space-y-1.5 rounded-xl border border-[#ecdfd8] p-3 text-sm">
              <Row label="Advance paid" value={formatShopInr(cancellation.capturedPaise, 2)} />
              {cancellation.feePaise > 0 ? <Row label="Cancellation fee kept" value={`− ${formatShopInr(cancellation.feePaise, 2)}`} /> : null}
              <Row label="Refund to you" value={formatShopInr(cancellation.refundPaise, 2)} strong />
            </dl>
          ) : (
            <p className={cn("text-sm", SHOP_MUTED)}>You have not paid anything yet, so there is nothing to refund.</p>
          )}
          <Textarea placeholder="Reason (optional)" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={cancelState.isLoading} onClick={() => setCancelOpen(false)}>Keep booking</Button>
            <Button type="button" variant="destructive" disabled={cancelState.isLoading} onClick={() => void onCancel()}>
              {cancelState.isLoading ? "Cancelling…" : "Cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={SHOP_MUTED}>{label}</dt>
      <dd className={cn("text-right", strong ? "font-semibold" : "", SHOP_INK)}>{value}</dd>
    </div>
  );
}
