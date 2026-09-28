"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronRight, Download, LoaderCircle, Lock } from "lucide-react";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import {
  useGetCustomerPaymentQuery,
  useGetCustomerPaymentsQuery,
} from "@/src/store/api/customer-api";
import { downloadCustomerPaymentReceipt } from "@/src/lib/customer-receipt";
import type { PaymentListItem } from "@/src/types/customer";
import { paymentHasGoldAccrual } from "@/src/lib/gold-payment-display";
import { CUSTOMER_MOBILE_NAV_DOCK } from "@/src/features/customer/customer-scheme-detail-views";
import { ProfileSubpageHeader } from "@/src/features/customer/customer-profile-shared";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MainTab = "payments" | "passbook";
type PayFilter = "ALL" | "PAID" | "PENDING";

const paymentListCardClass =
  "flex items-start gap-2 rounded-2xl border border-[#e8e2dc] bg-white p-4 shadow-[0_4px_16px_rgba(var(--customer-primary-rgb,115,3,33),0.05)] transition active:scale-[0.99]";

function formatPaymentDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPaymentDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const time = d
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
  return `${date} • ${time}`;
}

function formatAmountHero(display: string) {
  return display.replace(/^(\u20B9)\s*/, "$1 ");
}

function formatPaymentDateTimeOffset(iso: string, addMinutes: number) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  d.setMinutes(d.getMinutes() + addMinutes);
  return formatPaymentDateTime(d.toISOString());
}

function formatInrDisplay(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function displaySchemeNumber(schemeNumber: string) {
  return schemeNumber.replace(/^Scheme\s+/i, "").trim();
}

function paidThisYear(items: PaymentListItem[]) {
  const year = new Date().getFullYear();
  const rows = items.filter((p) => {
    if (p.status !== "SUCCESS" && p.status !== "PARTIALLY_REFUNDED") return false;
    const when = new Date(p.paidAt ?? p.createdAt);
    return when.getFullYear() === year;
  });
  return {
    totalPaise: rows.reduce((sum, p) => sum + p.amount.amountPaise, 0),
    count: rows.length,
  };
}

function displayTransactionId(id: string) {
  const tail = id.replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase();
  return tail ? `T${tail}` : id;
}

function ChannelMark({ channel }: { channel: PaymentListItem["channel"] }) {
  if (channel === "PHONEPE") {
    return (
      <span className="grid size-5 place-items-center rounded bg-[#5f259f] text-[8px] font-black text-white">
        Pe
      </span>
    );
  }
  if (channel === "UPI") {
    return (
      <span className="grid size-5 place-items-center rounded bg-[#2e7d32] text-[7px] font-black text-white">
        UPI
      </span>
    );
  }
  return (
    <span className="grid size-5 place-items-center rounded bg-[#ece6e1] text-[8px] font-bold text-[#706b77]">
      ₹
    </span>
  );
}

function channelDisplayName(payment: PaymentListItem) {
  if (payment.channel === "PHONEPE") return "PhonePe";
  if (payment.channel === "UPI") return "UPI";
  if (payment.channel === "CARD") return "Card / POS";
  if (payment.channel === "CASH") return payment.recordedByLabel ? `Cash · ${payment.recordedByLabel}` : "Cash";
  if (payment.channel === "BANK_TRANSFER") return "Bank transfer";
  return payment.channelLabel ?? "Payment";
}

function StatusPill({ payment }: { payment: PaymentListItem }) {
  const isPaid = payment.status === "SUCCESS";
  const isPartiallyRefunded = payment.status === "PARTIALLY_REFUNDED";
  const isPending = payment.status === "PENDING";
  const isFailed = payment.status === "FAILED" || payment.status === "REVERSED";
  const label = isPaid
    ? "Paid"
    : isPending
      ? "Pending"
      : isFailed
        ? "Failed"
        : isPartiallyRefunded
          ? "Partially refunded"
          : (payment.statusLabel ?? payment.status);
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
        isPaid && "bg-[#eafbf3] text-[#0b9860]",
        isPending && "bg-amber-50 text-amber-800",
        isPartiallyRefunded && "bg-amber-50 text-amber-800",
        isFailed && "bg-[#fdecec] text-[#c62828]",
        !isPaid && !isPending && !isFailed && !isPartiallyRefunded && "bg-red-50 text-red-700",
      )}
    >
      {label}
    </span>
  );
}

function PaymentListCard({ payment, tenantSlug }: { payment: PaymentListItem; tenantSlug: string | null }) {
  const when = payment.paidAt ?? payment.createdAt;
  const receipt = payment.receiptNumber?.trim();

  return (
    <Link href={customerPath(tenantSlug, "payments", payment.id)} className={paymentListCardClass}>
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-x-3 gap-y-2">
        <p className="text-xs font-semibold text-[#8a8490]">{formatPaymentDate(when)}</p>
        <p className="text-right text-sm font-black text-[#171722]">{payment.amount.amountDisplay}</p>

        <p className="min-w-0 truncate text-[0.9375rem] font-bold leading-snug text-[#171722]">
          {payment.schemeName}
        </p>
        <div className="flex justify-end">
          <StatusPill payment={payment} />
        </div>

        <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#777280]">
          <ChannelMark channel={payment.channel} />
          <span className="truncate">{channelDisplayName(payment)}</span>
        </p>
        {receipt ? (
          <p className="max-w-[9.5rem] truncate text-right text-[10px] font-semibold text-[#8a8490]">{receipt}</p>
        ) : (
          <span aria-hidden />
        )}

        {paymentHasGoldAccrual(payment) && payment.goldAccrual ? (
          <p className="col-span-2 text-[10px] font-semibold text-[var(--customer-accent,#8b5f08)]">
            {payment.goldAccrual.weightDisplay} gold booked
            {payment.goldAccrual.ratePerGramDisplay
              ? ` · ${payment.goldAccrual.ratePerGramDisplay.replace(/\s*\/\s*g/i, "")}/g`
              : ""}
          </p>
        ) : null}
      </div>
      <ChevronRight className="size-4 shrink-0 self-center text-[#b0a9b3]" strokeWidth={2.5} />
    </Link>
  );
}

async function downloadReceipt(payment: PaymentListItem) {
  if (!payment.receiptDownloadPath) {
    toast.error("Receipt is available after payment is successful");
    return;
  }
  try {
    const name = payment.receiptNumber ? `${payment.receiptNumber}.pdf` : `receipt-${payment.id}.pdf`;
    await downloadCustomerPaymentReceipt(payment.receiptDownloadPath, name);
    toast.success("Receipt downloaded");
  } catch {
    toast.error("Could not download receipt. Try again.");
  }
}

export function CustomerPaymentsPage() {
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerPaymentsQuery();
  const [mainTab, setMainTab] = useState<MainTab>("payments");
  const [filter, setFilter] = useState<PayFilter>("ALL");

  const items = useMemo(() => data ?? [], [data]);
  const yearSummary = useMemo(() => paidThisYear(items), [items]);

  const filtered = useMemo(() => {
    let rows = [...items].sort(
      (a, b) =>
        new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime(),
    );
    if (mainTab === "passbook") {
      rows = rows.filter((p) => p.status === "SUCCESS" || p.status === "PARTIALLY_REFUNDED");
    } else if (filter === "PAID") {
      rows = rows.filter((p) => p.status === "SUCCESS" || p.status === "PARTIALLY_REFUNDED");
    } else if (filter === "PENDING") {
      rows = rows.filter((p) => p.status === "PENDING");
    }
    return rows;
  }, [items, mainTab, filter]);

  if (isLoading) return <PageSkeleton />;
  if (isError) return <QueryError onRetry={refetch} />;

  const filters: { key: PayFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "PAID", label: "Paid" },
    { key: "PENDING", label: "Pending" },
  ];

  return (
    <div
      className="mx-auto max-w-lg"
      style={{ paddingBottom: `calc(${CUSTOMER_MOBILE_NAV_DOCK} + 0.75rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <h1 className="text-[1.65rem] font-black tracking-[-.03em] text-[#11111b]">Payments</h1>
      <p className="mt-1 text-sm text-[#777280]">Track your payments and gold savings</p>

      <div
        className="mt-5 grid grid-cols-2 gap-1 rounded-full p-1"
        style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.12)" }}
      >
        {(
          [
            { key: "payments", label: "Payments" },
            { key: "passbook", label: "Contributions" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMainTab(tab.key)}
            className={cn(
              "rounded-full py-2.5 text-sm font-bold transition",
              mainTab === tab.key ? "text-white shadow-sm" : "text-[#8a8490]",
            )}
            style={mainTab === tab.key ? { background: "var(--customer-primary, #730321)" } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === "payments" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-bold transition",
                filter === item.key
                  ? "border-transparent text-white shadow-sm"
                  : "border-[#e5ddd7] bg-white text-[#706b77]",
              )}
              style={filter === item.key ? { background: "var(--customer-primary, #730321)" } : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <section
        className="relative mt-5 overflow-hidden rounded-[1.35rem] p-5 text-white shadow-[0_16px_40px_rgba(var(--customer-primary-rgb,115,3,33),0.28)]"
        style={{ background: "var(--customer-primary, #730321)" }}
      >
        <svg
          className="pointer-events-none absolute -bottom-6 -right-3 h-32 w-32 opacity-[0.16]"
          viewBox="0 0 120 120"
          fill="none"
          aria-hidden
        >
          <circle cx="62" cy="62" r="44" stroke="var(--customer-accent, #c9a227)" strokeWidth="1" />
          <path
            d="M62 28c7 12 16 18 26 20-9 4-16 11-26 20-10-9-17-16-26-20 10-2 19-8 26-20Z"
            stroke="var(--customer-accent, #c9a227)"
            strokeWidth="1.1"
            fill="none"
          />
        </svg>
        <p className="relative z-10 text-sm font-semibold text-white/85">Paid this year</p>
        <p className="relative z-10 mt-1 text-[2rem] font-black leading-none tracking-[-.03em]">
          {formatInrDisplay(yearSummary.totalPaise)}
        </p>
        <p className="relative z-10 mt-2 text-xs font-medium text-white/80">
          {yearSummary.count} transaction{yearSummary.count === 1 ? "" : "s"}
        </p>
      </section>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#e8e2dc] bg-white p-10 text-center shadow-sm">
            <p className="font-black text-[#171722]">No entries yet</p>
            <p className="mt-2 text-sm text-[#777280]">
              {mainTab === "passbook"
                ? "Retained contributions appear here after payment confirmation. Open a scheme for its full passbook."
                : "Contributions appear here once recorded."}
            </p>
          </div>
        ) : (
          filtered.map((payment) => (
            <PaymentListCard key={payment.id} payment={payment} tenantSlug={tenantSlug} />
          ))
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-[#ece6e1] py-4 last:border-b-0">
      <p className="text-[11px] font-semibold text-[#8a8490]">{label}</p>
      <div className="mt-1 text-[0.9375rem] font-bold leading-snug text-[#171722]">{value}</div>
    </div>
  );
}

const paymentDetailCardClass =
  "rounded-2xl border border-[#e8e2dc] bg-white shadow-[0_4px_18px_rgba(23,23,34,0.06)]";

function GoldBarsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="2" y="14" width="8" height="10" rx="1" fill="var(--customer-accent, #c9a227)" />
      <rect x="11" y="10" width="8" height="14" rx="1" fill="#e8c547" />
      <rect x="20" y="14" width="8" height="10" rx="1" fill="#a67c00" />
    </svg>
  );
}

function TimelineStep({
  label,
  time,
  done,
  last,
}: {
  label: string;
  time: string;
  done: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full",
            done ? "bg-[#0b9860] text-white" : "border-2 border-[#e5ddd7]",
          )}
        >
          {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
        {!last ? (
          <span className={cn("my-0.5 w-0.5 min-h-[1.5rem] flex-1", done ? "bg-[#0b9860]" : "bg-[#e5ddd7]")} />
        ) : null}
      </div>
      <div className={cn("pb-4", last && "pb-0")}>
        <p className="text-sm font-bold text-[#171722]">{label}</p>
        <p className="text-[11px] text-[#777280]">{time}</p>
      </div>
    </div>
  );
}

export function CustomerPaymentDetailPage({ id }: { id: string }) {
  const { tenantSlug } = useCustomerTenant();
  const { data: payment, isLoading, isError, refetch } = useGetCustomerPaymentQuery(id);
  const [downloading, setDownloading] = useState(false);

  if (isLoading || !payment) return <PageSkeleton />;
  if (isError) return <QueryError onRetry={refetch} />;

  const when = payment.paidAt ?? payment.createdAt;
  const whenLabel = formatPaymentDateTime(when);
  const isPaid = payment.status === "SUCCESS";
  const isPartiallyRefunded = payment.status === "PARTIALLY_REFUNDED";
  const isRetained = isPaid || isPartiallyRefunded;
  const hasGold = paymentHasGoldAccrual(payment) && payment.goldAccrual;

  const onDownload = async () => {
    setDownloading(true);
    try {
      await downloadReceipt(payment);
    } finally {
      setDownloading(false);
    }
  };

  const statusWord = isPaid
    ? "PAID"
    : isPartiallyRefunded
      ? "PARTIALLY REFUNDED"
      : (payment.statusLabel ?? payment.status).toUpperCase();
  const gold = payment.goldAccrual;
  const showGold =
    hasGold || payment.valueBasis === "GOLD_WEIGHT" || /gold/i.test(payment.schemeName);
  const rateDisplay = gold?.ratePerGramDisplay
    ? gold.ratePerGramDisplay.includes("/")
      ? gold.ratePerGramDisplay
      : `${gold.ratePerGramDisplay}/g`
    : "—";

  const canDownload = Boolean(payment.receiptDownloadPath);

  const transactionLabel =
    payment.transactionId?.trim() || displayTransactionId(payment.id);

  return (
    <div
      className="mx-auto max-w-lg -mt-1"
      style={{ paddingBottom: `calc(${CUSTOMER_MOBILE_NAV_DOCK} + 0.75rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <ProfileSubpageHeader
        tenantSlug={tenantSlug}
        title="Payment details"
        backHref={customerPath(tenantSlug, "payments")}
        centered
      />

      <div
        className={cn(
          "mt-4 flex items-center gap-4 rounded-2xl px-4 py-4",
          isPaid ? "bg-[#ecf8f1]" : isPartiallyRefunded || payment.status === "PENDING" ? "bg-amber-50" : "bg-[#fdecec]",
        )}
      >
        <span
          className={cn(
            "grid size-14 shrink-0 place-items-center rounded-full",
            isPaid ? "bg-[#0b9860] text-white" : isPartiallyRefunded || payment.status === "PENDING" ? "bg-amber-500 text-white" : "bg-[#c62828] text-white",
          )}
        >
          <Check className="size-8" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "text-[11px] font-extrabold tracking-[0.14em]",
              isPaid ? "text-[#0b9860]" : isPartiallyRefunded || payment.status === "PENDING" ? "text-amber-800" : "text-[#c62828]",
            )}
          >
            {statusWord}
          </p>
          <p className="mt-1 text-[2rem] font-black leading-none tracking-[-.03em] text-[#171722]">
            {formatAmountHero(payment.amount.amountDisplay)}
          </p>
          <p className="mt-2 text-xs font-medium text-[#777280]">{whenLabel}</p>
        </div>
      </div>

      <section className={cn("mt-3 px-4 py-0.5", paymentDetailCardClass)}>
        <DetailRow label="Scheme" value={payment.schemeName} />
        <DetailRow label="Scheme number" value={displaySchemeNumber(payment.schemeNumber) || "—"} />
        <DetailRow label="Receipt" value={payment.receiptNumber ?? "—"} />
        <DetailRow
          label="Channel"
          value={
            <span className="inline-flex items-center gap-1.5">
              <ChannelMark channel={payment.channel} />
              {channelDisplayName(payment)}
            </span>
          }
        />
        <DetailRow label="Transaction ID" value={transactionLabel} />
        {isPartiallyRefunded ? (
          <>
            <DetailRow label="Original payment" value={payment.grossAmount?.amountDisplay ?? payment.amount.amountDisplay} />
            <DetailRow label="Refunded" value={payment.refundedAmount?.amountDisplay ?? "—"} />
            <DetailRow label="Retained in scheme" value={payment.netAmount?.amountDisplay ?? payment.amount.amountDisplay} />
          </>
        ) : null}
      </section>

      {showGold ? (
        <section className="mt-3 flex items-stretch rounded-2xl bg-[#f3ead4] px-4 py-3.5">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <GoldBarsIcon className="mt-0.5 size-9 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#777280]">Gold booked</p>
              <p className="mt-0.5 text-[0.9375rem] font-black text-[#171722]">{gold?.weightDisplay ?? "—"}</p>
            </div>
          </div>
          <span className="mx-3 w-px shrink-0 self-stretch bg-[#dcc9a8]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[#777280]">Rate</p>
            <p className="mt-0.5 text-[0.9375rem] font-black text-[#171722]">
              {rateDisplay.startsWith("₹") ? formatAmountHero(rateDisplay) : rateDisplay}
            </p>
          </div>
        </section>
      ) : null}

      {isRetained ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#fff1e8] px-3.5 py-2.5 text-xs font-semibold text-[var(--customer-primary,#730321)]">
          <Lock className="size-3.5 shrink-0" strokeWidth={2.25} />
          <p>This passbook entry cannot be edited.</p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={downloading || !canDownload}
        onClick={onDownload}
        className={cn(
          "mt-3 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl border bg-white text-base font-bold text-[var(--customer-primary,#730321)] transition active:scale-[0.99]",
          "border-[var(--customer-primary,#730321)] hover:bg-[#fffafb]",
          (!canDownload || downloading) && "opacity-60",
        )}
      >
        {downloading ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : (
          <>
            <Download className="size-[1.125rem]" strokeWidth={2.25} />
            Download receipt
          </>
        )}
      </button>

      {isRetained ? (
        <section className={cn("mt-4 p-4", paymentDetailCardClass)}>
          <TimelineStep label="Payment received" time={whenLabel} done />
          <TimelineStep label="Verified" time={formatPaymentDateTimeOffset(when, 1)} done last />
        </section>
      ) : null}
    </div>
  );
}
