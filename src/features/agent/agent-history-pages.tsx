"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  Gem,
  HandCoins,
  ReceiptText,
  RotateCcw,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useInfiniteScroll } from "@/src/hooks/use-infinite-scroll";
import {
  useCancelAgentHandoverMutation,
  useCreateAgentHandoverMutation,
  useGetAgentCashSummaryQuery,
  useGetAgentHandoverQuery,
  useGetAgentHandoversQuery,
  useGetAgentPaymentQuery,
  useGetAgentPaymentsPageQuery,
} from "@/src/store/api/agent-api";
import { downloadAgentPaymentReceipt } from "@/src/lib/agent-receipt";
import type { AgentHandoverTimelineEvent, AgentPayment } from "@/src/types/agent";
import {
  AgentCard,
  AgentEmpty,
  AgentLoadingCards,
  AgentPageHeader,
  AgentStatus,
  formatAgentMoney,
  formatAgentTime,
  formatAgentWeight,
} from "@/src/components/agent/agent-ui";

const HISTORY_PAGE_SIZE = 20;

function formatHandoverEvent(event: string) {
  switch (event) {
    case "SUBMITTED":
      return "Submitted to branch";
    case "AWAITING_ACCEPTANCE":
      return "Awaiting branch acceptance";
    case "ACCEPTED":
      return "Accepted by branch";
    case "ACCEPTED_WITH_DISCREPANCY":
      return "Accepted with discrepancy";
    case "REJECTED":
      return "Rejected by branch";
    case "CANCELLED":
      return "Cancelled";
    default:
      return event.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }
}

function AgentPaymentHistoryRow({ payment }: { payment: AgentPayment }) {
  return (
    <Link href={`/agent/history/collections/${payment.id}`} className="block transition hover:bg-[#fdf9f6]">
    <div className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ${payment.weightMg ? "bg-[#fff2cb] text-[#996800]" : "bg-[#eaf9f1] text-[#087a50]"}`}
        >
          {payment.weightMg ? <Gem className="size-5" /> : <Banknote className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-black">{payment.customer.name}</p>
              <p className="mt-0.5 text-xs text-[#867c7f]">
                {payment.scheme.planName ?? "Savings scheme"} · {payment.scheme.enrollmentNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-black">{formatAgentMoney(payment.amountPaise)}</p>
              {(payment.refundedAmountPaise ?? 0) > 0 ? (
                <p className="mt-0.5 text-[0.68rem] font-semibold text-amber-700">
                  {formatAgentMoney(payment.refundedAmountPaise ?? 0)} refunded
                </p>
              ) : null}
              {payment.weightMg ? (
                <p className="mt-0.5 text-xs font-black text-[#91630c]">{formatAgentWeight(payment.weightMg)}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f1eae6] pt-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[#82787b]">
              <ReceiptText className="size-3.5" />
              {payment.receiptNumber}
            </span>
            <span className="text-[#82787b]">{formatAgentTime(payment.paidAt)}</span>
            <AgentStatus value={payment.status} />
          </div>
        </div>
      </div>
    </div>
    </Link>
  );
}

function AgentCollectionsHistoryList() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const payments = useGetAgentPaymentsPageQuery({ limit: HISTORY_PAGE_SIZE, cursor });

  const loadMore = useCallback(() => {
    if (payments.isFetching || !payments.data?.hasMore || !payments.data.nextCursor) return;
    setCursor(payments.data.nextCursor);
  }, [payments.data, payments.isFetching]);

  const sentinelRef = useInfiniteScroll(loadMore, Boolean(payments.data?.hasMore && !payments.isFetching));

  const initialLoading = payments.isLoading && !payments.data?.items.length;
  const items = payments.data?.items ?? [];

  if (initialLoading) return <AgentLoadingCards />;
  if (!items.length) {
    return (
      <AgentEmpty
        title="No collections yet"
        description="Successful cash collections will appear here with their receipt numbers."
      />
    );
  }

  return (
    <AgentCard className="overflow-hidden">
      <div className="divide-y divide-[#eee6e1]">
        {items.map((payment) => (
          <AgentPaymentHistoryRow key={payment.id} payment={payment} />
        ))}
      </div>
      <div ref={sentinelRef} className="flex min-h-12 items-center justify-center border-t border-[#eee6e1] px-4 py-3">
        {payments.isFetching && cursor ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#82787b]">
            <Spinner className="size-4" />
            Loading more receipts…
          </span>
        ) : payments.data?.hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            className="text-xs font-black text-[#730321] hover:underline"
          >
            Load more
          </button>
        ) : items.length >= HISTORY_PAGE_SIZE ? (
          <span className="text-xs text-[#958b8d]">End of history</span>
        ) : null}
      </div>
    </AgentCard>
  );
}

export function AgentHistoryPage() {
  const [tab, setTab] = useState<"COLLECTIONS" | "HANDOVERS">("COLLECTIONS");
  const handovers = useGetAgentHandoversQuery({});

  return (
    <div className="space-y-6">
      <AgentPageHeader
        eyebrow="Your activity"
        title="Collection history"
        description="Receipts and branch cash submissions recorded under your login."
      />
      <div className="inline-flex rounded-xl bg-[#eee9e6] p-1">
        <button
          type="button"
          onClick={() => setTab("COLLECTIONS")}
          className={`rounded-lg px-4 py-2 text-sm font-black ${tab === "COLLECTIONS" ? "bg-white text-[#730321] shadow-sm" : "text-[#766c6f]"}`}
        >
          Collections
        </button>
        <button
          type="button"
          onClick={() => setTab("HANDOVERS")}
          className={`rounded-lg px-4 py-2 text-sm font-black ${tab === "HANDOVERS" ? "bg-white text-[#730321] shadow-sm" : "text-[#766c6f]"}`}
        >
          Cash submissions
        </button>
      </div>
      {tab === "COLLECTIONS" ? (
        <AgentCollectionsHistoryList key="collections" />
      ) : handovers.isLoading ? (
        <AgentLoadingCards />
      ) : handovers.data?.length ? (
        <div className="space-y-3">
          {handovers.data.map((handover) => (
            <Link key={handover.id} href={`/agent/history/handovers/${handover.id}`}>
              <AgentCard className="p-4 transition hover:border-[#d6bb7a] sm:p-5">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-2xl ${handover.status === "ACCEPTED" ? "bg-[#eaf9f1] text-[#087a50]" : handover.status === "PENDING" ? "bg-[#fff3d7] text-[#996800]" : "bg-[#f5efef] text-[#756b6e]"}`}
                  >
                    <HandCoins className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-lg font-black">{formatAgentMoney(handover.amountPaise)}</p>
                      <AgentStatus value={handover.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-[#857b7e]">{handover.remarks ?? "Cash submitted to branch"}</p>
                    <p className="mt-2 text-xs font-semibold text-[#857b7e]">{formatAgentTime(handover.submittedAt)}</p>
                  </div>
                </div>
              </AgentCard>
            </Link>
          ))}
        </div>
      ) : (
        <AgentEmpty title="No cash submissions" description="Cash handovers you submit to the branch will appear here." />
      )}
    </div>
  );
}

export function AgentHandoverPage() {
  const router = useRouter();
  const summary = useGetAgentCashSummaryQuery();
  const [create, state] = useCreateAgentHandoverMutation();
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const amountPaise = Math.round(Number(amount || 0) * 100);
  const max =
    summary.data?.availableForHandoverPaise ??
    Math.max(
      0,
      (summary.data?.cashInHandPaise ?? 0) -
        (summary.data?.cashPendingAcceptancePaise ?? 0),
    );
  const submit = async () => {
    if (amountPaise <= 0 || amountPaise > max) return toast.error(`Enter an amount up to ${formatAgentMoney(max)}.`);
    try {
      const result = await create({ amountPaise, remarks: remarks.trim() || undefined }).unwrap();
      toast.success("Cash submitted for branch acceptance");
      router.push(`/agent/history/handovers/${result.id}`);
    } catch {
      toast.error("Could not submit the cash handover.");
    }
  };
  if (summary.isLoading) return <AgentLoadingCards />;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/agent" className="inline-flex items-center gap-2 text-sm font-bold text-[#776d70]">
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
      <AgentPageHeader
        eyebrow="Cash control"
        title="Submit cash to branch"
        description="Pending submissions stay in your cash-in-hand until the branch accepts them; you cannot submit the same amount twice."
      />
      <AgentCard className="overflow-hidden">
        <div className="bg-[linear-gradient(120deg,#750321,#4c0317)] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#efc96f]">Available to submit</p>
          <p className="mt-2 text-4xl font-black tracking-[-.04em]">{formatAgentMoney(max)}</p>
          <p className="mt-2 text-xs text-white/60">
            Cash in hand {formatAgentMoney(summary.data?.cashInHandPaise)} · pending{" "}
            {formatAgentMoney(summary.data?.cashPendingAcceptancePaise)}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <Label htmlFor="handover-amount" className="font-bold">
            Submission amount
          </Label>
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-[#730321]">₹</span>
            <Input
              id="handover-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
              className="h-15 rounded-2xl pl-11 text-2xl font-black"
            />
          </div>
          <button type="button" onClick={() => setAmount(String(max / 100))} className="mt-2 text-xs font-black text-[#730321]">
            Use full available amount
          </button>
          <div className="mt-5">
            <Label htmlFor="handover-remarks" className="font-bold">
              Remarks <span className="font-normal text-[#92878a]">(optional)</span>
            </Label>
            <Textarea
              id="handover-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="e.g. End-of-route cash handover"
              className="mt-2 min-h-24 rounded-xl"
            />
          </div>
          <div className="mt-5 rounded-xl border border-[#eddfc0] bg-[#fff9e9] p-3 text-xs leading-5 text-[#79561a]">
            <Clock3 className="mr-1.5 inline size-4" />
            The branch manager must verify and accept this submission. You can cancel while it is pending.
          </div>
          <Button
            onClick={submit}
            disabled={state.isLoading || max === 0}
            className="mt-5 h-12 w-full rounded-xl bg-[#730321] text-base font-black hover:bg-[#5d0219]"
          >
            {state.isLoading ? "Submitting…" : "Submit cash for acceptance"}
          </Button>
        </div>
      </AgentCard>
    </div>
  );
}

export function AgentPaymentDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const payment = useGetAgentPaymentQuery(id);
  const [downloading, setDownloading] = useState(false);

  const downloadReceipt = async () => {
    setDownloading(true);
    try {
      await downloadAgentPaymentReceipt(id, `${payment.data?.receiptNumber ?? "receipt"}.pdf`);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Could not download the receipt.");
    } finally {
      setDownloading(false);
    }
  };

  if (payment.isLoading) return <AgentLoadingCards />;
  if (!payment.data) {
    return <AgentEmpty title="Collection unavailable" description="This receipt may not belong to your account or no longer exists." />;
  }
  const item = payment.data;
  const gold = item.goldAccrual;
  const collectorName =
    typeof item.collectedBy === "object" && item.collectedBy?.name ? item.collectedBy.name : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-bold text-[#776d70]">
        <ArrowLeft className="size-4" />
        Back to history
      </button>
      <AgentCard className="overflow-hidden">
        <div className="bg-[linear-gradient(120deg,#750321,#4c0317)] px-6 py-8 text-white">
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#efc96f]">Collection receipt</p>
          <p className="mt-2 text-4xl font-black tracking-[-.04em]">{formatAgentMoney(item.amountPaise)}</p>
          {item.weightMg ? (
            <p className="mt-1 text-sm font-black text-[#f5d98a]">{formatAgentWeight(item.weightMg)} gold booked</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AgentStatus value={item.status} />
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{item.receiptNumber}</span>
          </div>
        </div>
        <div className="space-y-4 p-5 text-sm sm:p-6">
          <div className="flex items-start gap-3 rounded-2xl border border-[#eee6e1] bg-[#fdf9f6] p-4">
            <UserRound className="mt-0.5 size-5 shrink-0 text-[#730321]" />
            <div className="min-w-0 flex-1">
              <p className="font-black text-[#281b20]">{item.customer.name}</p>
              {item.customer.mobile ? <p className="mt-0.5 text-xs text-[#857b7e]">{item.customer.mobile}</p> : null}
              {item.customer.customerNumber ? (
                <p className="mt-0.5 text-xs font-semibold text-[#857b7e]">#{item.customer.customerNumber}</p>
              ) : null}
              <Link
                href={`/agent/customers/${item.customer.id}`}
                className="mt-2 inline-block text-xs font-black text-[#730321] hover:underline"
              >
                View customer
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Scheme" value={item.scheme.planName ?? "Savings scheme"} />
            <DetailRow label="Enrollment" value={item.scheme.enrollmentNumber} />
            <DetailRow label="Paid on" value={formatAgentTime(item.paidAt)} />
            <DetailRow label="Mode" value={item.mode.replaceAll("_", " ")} />
            {item.targetCycle ? <DetailRow label="Cycle" value={item.targetCycle} /> : null}
            {item.branch?.name ? <DetailRow label="Branch" value={item.branch.name} /> : null}
            {collectorName ? <DetailRow label="Recorded by" value={collectorName} /> : null}
            {(item.refundedAmountPaise ?? 0) > 0 ? (
              <>
                <DetailRow label="Original collection" value={formatAgentMoney(item.grossAmountPaise ?? item.amountPaise)} />
                <DetailRow label="Refunded" value={formatAgentMoney(item.refundedAmountPaise ?? 0)} />
                <DetailRow label="Net retained" value={formatAgentMoney(item.netAmountPaise ?? item.amountPaise)} />
              </>
            ) : null}
          </div>
          {gold && (gold.weightMg > 0 || gold.ratePerGramPaise > 0) ? (
            <div className="rounded-2xl border border-[#eddfc0] bg-[#fff9e9] p-4">
              <p className="text-xs font-black uppercase tracking-[.14em] text-[#91630c]">Gold booking</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {gold.weightMg > 0 ? (
                  <DetailRow label="Weight" value={gold.weightDisplay ?? formatAgentWeight(gold.weightMg)} />
                ) : null}
                {gold.ratePerGramPaise > 0 ? (
                  <DetailRow
                    label="Rate"
                    value={gold.ratePerGramDisplay ?? formatAgentMoney(gold.ratePerGramPaise) + " / g"}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
          {item.remarks ? <DetailRow label="Remarks" value={item.remarks} stacked /> : null}
          {item.reversedAt ? (
            <div className="rounded-xl border border-[#e1b9bd] bg-[#fff2f3] p-3 text-xs text-[#a51e2e]">
              Reversed {formatAgentTime(item.reversedAt)}
              {item.reversalReason ? ` · ${item.reversalReason}` : ""}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              onClick={downloadReceipt}
              disabled={downloading || item.status !== "SUCCESS"}
              className="h-11 flex-1 rounded-xl bg-[#730321] font-black hover:bg-[#5d0219]"
            >
              <Download className="mr-2 size-4" />
              {downloading ? "Downloading…" : "Download PDF receipt"}
            </Button>
            <Button asChild variant="outline" className="h-11 flex-1 rounded-xl font-black">
              <Link href={`/agent/collect/${item.scheme.id}`}>Collect again</Link>
            </Button>
          </div>
        </div>
      </AgentCard>
    </div>
  );
}

function DetailRow({ label, value, stacked }: { label: string; value: string; stacked?: boolean }) {
  if (stacked) {
    return (
      <div className="sm:col-span-2">
        <p className="text-[#857b7e]">{label}</p>
        <p className="mt-1 font-black leading-relaxed text-[#281b20]">{value}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[#857b7e]">{label}</p>
      <p className="mt-0.5 font-black text-[#281b20]">{value}</p>
    </div>
  );
}

function HandoverTimeline({ events }: { events: AgentHandoverTimelineEvent[] }) {
  if (!events.length) return null;
  return (
    <div className="mt-5 border-t border-[#eee6e1] pt-5">
      <p className="text-xs font-black uppercase tracking-[.14em] text-[#857b7e]">Activity</p>
      <ol className="mt-3 space-y-4">
        {events.map((ev, index) => (
          <li key={`${ev.event}-${index}`} className="relative flex gap-3 pl-1">
            <span
              className={`mt-1 grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${index === events.length - 1 ? "bg-[#730321] text-white" : "bg-[#f5efef] text-[#730321]"}`}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <p className="font-black text-[#281b20]">{formatHandoverEvent(ev.event)}</p>
              <p className="mt-0.5 text-xs text-[#857b7e]">
                {formatAgentTime(ev.at)} · {ev.by}
              </p>
              {ev.note ? <p className="mt-2 rounded-xl bg-[#fdf9f6] px-3 py-2 text-xs leading-relaxed text-[#5c4a4e]">{ev.note}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AgentHandoverDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const handover = useGetAgentHandoverQuery(id);
  const [cancel, state] = useCancelAgentHandoverMutation();
  const doCancel = async () => {
    try {
      await cancel(id).unwrap();
      toast.success("Submission cancelled and cash returned to your balance.");
      void handover.refetch();
    } catch {
      toast.error("This submission can no longer be cancelled.");
    }
  };
  if (handover.isLoading) return <AgentLoadingCards />;
  if (!handover.data) {
    return <AgentEmpty title="Submission unavailable" description="It may not belong to your account or no longer exists." />;
  }
  const item = handover.data;
  const icon =
    item.status === "ACCEPTED" ? (
      <CheckCircle2 className="size-8" />
    ) : item.status === "PENDING" ? (
      <Clock3 className="size-8" />
    ) : (
      <XCircle className="size-8" />
    );
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-bold text-[#776d70]">
        <ArrowLeft className="size-4" />
        Back to history
      </button>
      <AgentCard className="overflow-hidden">
        <div
          className={`px-6 py-8 text-center ${item.status === "ACCEPTED" ? "bg-[#eaf9f1] text-[#087a50]" : item.status === "PENDING" ? "bg-[#fff5dc] text-[#956400]" : "bg-[#f8eeee] text-[#8b3940]"}`}
        >
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-white shadow-sm">{icon}</span>
          <div className="mt-4">
            <AgentStatus value={item.status} />
          </div>
          <p className="mt-3 text-4xl font-black tracking-[-.04em] text-[#281b20]">{formatAgentMoney(item.amountPaise)}</p>
          <p className="mt-2 text-sm font-semibold">
            {item.status === "PENDING"
              ? "Waiting for branch acceptance"
              : item.status === "ACCEPTED"
                ? "Cash received by branch"
                : item.status === "CANCELLED"
                  ? "You cancelled this submission"
                  : "Contact your branch manager"}
          </p>
        </div>
        <div className="space-y-3 p-5 text-sm sm:p-6">
          {item.branch?.name ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#eee6e1] bg-[#fdf9f6] px-3 py-2.5 text-xs">
              <Building2 className="size-4 shrink-0 text-[#730321]" />
              <span>
                Submitted to <span className="font-black text-[#281b20]">{item.branch.name}</span>
                {item.branch.code ? ` (${item.branch.code})` : ""}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <span className="text-[#857b7e]">Submitted</span>
            <span className="font-black">{formatAgentTime(item.submittedAt)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#857b7e]">Settled</span>
            <span className="font-black">{item.settledAt ? formatAgentTime(item.settledAt) : "—"}</span>
          </div>
          {item.acceptedAmountPaise != null && item.acceptedAmountPaise !== item.amountPaise ? (
            <div className="flex justify-between gap-4">
              <span className="text-[#857b7e]">Accepted amount</span>
              <span className="font-black">{formatAgentMoney(item.acceptedAmountPaise)}</span>
            </div>
          ) : null}
          {item.discrepancyPaise != null && item.discrepancyPaise !== 0 ? (
            <div className="flex justify-between gap-4">
              <span className="text-[#857b7e]">Discrepancy</span>
              <span className="font-black text-[#956400]">{formatAgentMoney(item.discrepancyPaise)}</span>
            </div>
          ) : null}
          {typeof item.settledBy === "object" && item.settledBy?.name ? (
            <div className="flex justify-between gap-4">
              <span className="text-[#857b7e]">Settled by</span>
              <span className="font-black">{item.settledBy.name}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <span className="text-[#857b7e]">Remarks</span>
            <span className="text-right font-black">{item.remarks ?? "—"}</span>
          </div>
          {item.reason ? (
            <div className="flex justify-between gap-4">
              <span className="text-[#857b7e]">Reason</span>
              <span className="text-right font-black">{item.reason}</span>
            </div>
          ) : null}
          <HandoverTimeline events={item.timeline ?? []} />
          {item.status === "PENDING" ? (
            <Button
              onClick={doCancel}
              disabled={state.isLoading}
              variant="outline"
              className="mt-3 h-11 w-full rounded-xl border-[#e1b9bd] text-[#a51e2e] hover:bg-[#fff2f3]"
            >
              <RotateCcw className="mr-2 size-4" />
              Cancel submission
            </Button>
          ) : null}
        </div>
      </AgentCard>
    </div>
  );
}
