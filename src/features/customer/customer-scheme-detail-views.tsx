"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  Download,
  FileText,
  Info,
  LoaderCircle,
  LockKeyhole,
  PieChart,
  Scale,
  ShieldCheck,
  Sparkles,
  Wallet,
  Gem,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCustomerDate } from "@/src/components/customer/customer-ui";
import { CustomerPayableSummary } from "@/src/components/customer/customer-payable-summary";
import type {
  CustomerDisplayMode,
  CustomerMaturityBenefit,
  CustomerPlanRulesSection,
  CustomerSchemeDetail,
  PaymentListItem,
} from "@/src/types/customer";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { formatGoldPurchaseDate, paymentHasGoldAccrual } from "@/src/lib/gold-payment-display";
import { isGoldWeightScheme } from "@/src/lib/customer-gold-ui";
import {
  buildFixedSchedule,
  type ScheduleRow,
  type ScheduleStatus,
} from "@/src/features/customer/customer-scheme-schedule";

export function normalizeSchemeMode(mode: CustomerDisplayMode): CustomerDisplayMode {
  return mode === "FLEXIBLE_CAPPED_WINDOW" ? "FLEXIBLE_LOCK_WINDOW" : mode;
}

function progressWidth(percent: number) {
  return `${Math.min(100, Math.max(0, Math.round(percent)))}%`;
}

const detailSurfaceClass =
  "rounded-2xl border border-[#e8e2dc] bg-white p-4 shadow-[0_4px_16px_rgba(var(--customer-primary-rgb,115,3,33),0.05)] sm:p-5";

function displaySchemeNumber(schemeNumber: string) {
  return schemeNumber.replace(/^Scheme\s+/i, "").replace(/^Scheme no\.\s*/i, "").trim();
}

function heroLotus() {
  return (
    <svg
      className="pointer-events-none absolute -bottom-6 -right-3 h-36 w-36 opacity-[0.14]"
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
  );
}

function scheduleStatusPill(status: ScheduleStatus) {
  if (status === "PAID") return "bg-[#eafbf3] text-[#0b9860]";
  if (status === "DUE") return "bg-[#fdecec] text-[#c62828]";
  if (status === "BENEFIT") return "bg-[#fff2cf] text-[#6b4e32]";
  return "bg-[#f0ece8] text-[#8a8490]";
}

function scheduleStatusText(status: ScheduleStatus) {
  if (status === "UPCOMING") return "Upcoming";
  if (status === "DUE") return "Due";
  if (status === "BENEFIT") return "At maturity";
  return "Paid";
}

function scheduleIconWrap(status: ScheduleStatus) {
  if (status === "PAID") {
    return (
      <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full bg-[#0b9860] text-white shadow-sm">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "DUE") {
    return (
      <span
        className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-white shadow-sm"
        style={{ background: "var(--customer-primary, #730321)" }}
      >
        <Clock3 className="size-3.5" strokeWidth={2.25} />
      </span>
    );
  }
  if (status === "BENEFIT") {
    return (
      <span
        className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-[#6b4e32] shadow-sm"
        style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.35)" }}
      >
        <Gem className="size-3.5" strokeWidth={2.15} />
      </span>
    );
  }
  return (
    <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full bg-[#f0ece8] text-[#b0a9b3] ring-1 ring-[#e5ddd7]">
      <span className="text-[10px] font-black leading-none">···</span>
    </span>
  );
}

function FixedHero({ scheme, schemeIsGold }: { scheme: CustomerSchemeDetail; schemeIsGold?: boolean }) {
  const paid = scheme.progressCard.installmentsPaid ?? 0;
  const total = scheme.progressCard.installmentsTotal ?? 0;
  const totalPaid = scheme.totalPaid?.amountDisplay ?? "₹0";
  const goldBalance =
    scheme.goldAccumulated ?? scheme.goldAccrued ?? scheme.progressCard.goldAccumulated ?? scheme.progressCard.goldAccrued;
  const progress = total ? (paid / total) * 100 : scheme.progressPercent ?? 0;
  const paidLabel = schemeIsGold && goldBalance ? goldBalance.weightDisplay : totalPaid;
  const paidSuffix = schemeIsGold && goldBalance ? "gold saved" : "paid";

  const statusUpper = (scheme.statusLabel ?? "Active").toUpperCase().replace(/\s+/g, " ");

  return (
    <section
      className="relative overflow-hidden rounded-[1.35rem] p-5 text-white shadow-[0_16px_40px_rgba(var(--customer-primary-rgb,115,3,33),0.28)] sm:p-6"
      style={{ background: "var(--customer-primary, #730321)" }}
    >
      {heroLotus()}
      <span className="relative z-10 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[0.62rem] font-extrabold tracking-[0.06em]">
        {statusUpper} • FIXED
      </span>
      <h2 className="relative z-10 mt-3 text-xl font-black leading-snug sm:text-[1.35rem]">{scheme.planName}</h2>
      <p className="relative z-10 mt-1 text-sm text-white/75">Scheme no. {displaySchemeNumber(scheme.schemeNumber)}</p>

      <div className="relative z-10 mt-5 grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <p className="text-[1.75rem] font-black leading-none tracking-tight sm:text-[2rem]">{paidLabel}</p>
          <p className="mt-1 text-sm font-semibold text-white/80">{paidSuffix}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-xs font-medium text-white/85">
            {scheme.progressLabel || `${paid} of ${total} instalments`}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-[#f4a9b8]" style={{ width: progressWidth(progress) }} />
          </div>
          <p className="mt-2 text-[0.65rem] leading-snug text-white/75">
            Maturity on{" "}
            <span className="font-bold text-white">{formatCustomerDate(scheme.maturityDate)}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function FlexibleFreeHero({ scheme }: { scheme: CustomerSchemeDetail }) {
  const totalPaid = scheme.totalPaid?.amountDisplay ?? "₹0";
  const month = scheme.progressCard.freeWindowMonth ?? scheme.freeWindowMonth ?? 0;
  const months = scheme.progressCard.freeWindowMonths ?? scheme.freeWindowMonths ?? 0;

  return (
    <section
      className="relative overflow-hidden rounded-[1.35rem] p-5 text-white sm:p-6"
      style={{ background: "var(--customer-primary, #730321)" }}
    >
      {heroLotus()}
      <span className="relative z-10 inline-flex rounded-md bg-white/15 px-2.5 py-1 text-[0.62rem] font-extrabold tracking-[0.08em]">
        FLEXIBLE · FREE WINDOW
      </span>
      <h2 className="relative z-10 mt-4 text-xl font-black">{scheme.planName}</h2>
      <p className="relative z-10 mt-1 text-sm text-white/75">Scheme no. {displaySchemeNumber(scheme.schemeNumber)}</p>
      <p className="relative z-10 mt-5 text-[2rem] font-black tracking-tight">
        {totalPaid}
        <span className="ml-2 text-base font-semibold text-white/80">saved</span>
      </p>
      {month && months ? (
        <p className="relative z-10 mt-4 text-xs font-semibold text-white/85">
          Month {month} of {months}
        </p>
      ) : (
        <p className="relative z-10 mt-4 text-xs font-semibold text-white/85">{scheme.progressLabel}</p>
      )}
    </section>
  );
}

function FlexibleLockedHero({ scheme }: { scheme: CustomerSchemeDetail }) {
  const totalPaid = scheme.totalPaid?.amountDisplay ?? "₹0";

  return (
    <section
      className="relative overflow-hidden rounded-[1.35rem] p-5 text-white sm:p-6"
      style={{ background: "var(--customer-primary, #730321)" }}
    >
      {heroLotus()}
      <span className="relative z-10 inline-flex items-center gap-1 rounded-md bg-[rgba(var(--customer-accent-rgb,201,162,39),0.35)] px-2.5 py-1 text-[0.62rem] font-extrabold tracking-[0.06em] text-[#fff8e6]">
        <LockKeyhole className="size-3" />
        FLEXIBLE · LOCKED
      </span>
      <h2 className="relative z-10 mt-4 text-xl font-black">{scheme.planName}</h2>
      <p className="relative z-10 mt-1 text-sm text-white/75">Scheme no. {displaySchemeNumber(scheme.schemeNumber)}</p>
      <div className="relative z-10 mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
        <div>
          <p className="text-xs text-white/75">Total saved</p>
          <p className="mt-1 text-xl font-black">{totalPaid}</p>
        </div>
        <div className="border-l border-white/20 pl-4">
          <p className="text-xs text-white/75">Matures</p>
          <p className="mt-1 text-xl font-black">{formatCustomerDate(scheme.maturityDate)}</p>
        </div>
      </div>
    </section>
  );
}

function ScheduleStepRail({ row }: { row: ScheduleRow }) {
  if (row.isBenefit) {
    return (
      <span
        className="flex h-7 w-9 items-center justify-center rounded-md text-[0.5rem] font-extrabold uppercase leading-[1.05] tracking-wide text-[#6b4e32]"
        style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.25)" }}
      >
        Benefit
      </span>
    );
  }
  return (
    <span className="flex h-7 w-9 items-center justify-center text-sm font-black tabular-nums text-[#a59da8]">
      {row.stepLabel}
    </span>
  );
}

function ReceiptPdfDownloadButton({
  payment,
  onDownload,
  compact,
}: {
  payment: PaymentListItem;
  onDownload: (payment: PaymentListItem) => void | Promise<void>;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  if (!payment.receiptDownloadPath) return null;

  const run = async () => {
    setLoading(true);
    try {
      await onDownload(payment);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={run}
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-bold text-[var(--customer-primary,#730321)]"
        style={{ borderColor: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.28)" }}
      >
        {loading ? <LoaderCircle className="size-3 animate-spin" /> : <Download className="size-3" strokeWidth={2.5} />}
        PDF
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={run}
      className="mt-3 flex w-full items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition hover:bg-[#fffafb]"
      style={{ borderColor: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.22)" }}
    >
      <span
        className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--customer-primary,#730321)]"
        style={{ background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.08)" }}
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : <FileText className="size-5" strokeWidth={2} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#171722]">Download receipt PDF</span>
        <span className="mt-0.5 block truncate text-xs text-[#77727c]">
          {payment.receiptNumber ? `Invoice ${payment.receiptNumber}` : "Verified payment invoice"}
        </span>
      </span>
      <Download className="size-4 shrink-0 text-[var(--customer-primary,#730321)]" strokeWidth={2.25} />
    </button>
  );
}

function MaturityBenefitScheduleCard({ row }: { row: ScheduleRow }) {
  return (
    <div
      className="rounded-[1.1rem] border px-3.5 py-3.5"
      style={{
        borderColor: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.32)",
        background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.12)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#fff2cf] px-2 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-wide text-[#6b4e32]">
            Benefit
          </span>
          <span
            className="grid size-7 place-items-center rounded-full text-[#6b4e32]"
            style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.35)" }}
          >
            <Gem className="size-3.5" strokeWidth={2.15} />
          </span>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-wide",
            scheduleStatusPill("BENEFIT"),
          )}
        >
          {scheduleStatusText("BENEFIT")}
        </span>
      </div>
      <p className="mt-2.5 text-sm font-black text-[#171722]">{row.label}</p>
      <p className="mt-1 text-sm font-semibold leading-snug text-[#5c4830]">{row.amountDisplay}</p>
      {row.detailLine ? <p className="mt-2 text-xs font-medium text-[#777280]">{row.detailLine}</p> : null}
    </div>
  );
}

function ScheduleGoldMeta({ payment }: { payment: PaymentListItem }) {
  if (!paymentHasGoldAccrual(payment) || !payment.goldAccrual) return null;
  const gold = payment.goldAccrual;
  const rate = gold.ratePerGramDisplay.includes("/")
    ? gold.ratePerGramDisplay
    : `${gold.ratePerGramDisplay}/g`;
  return (
    <p className="mt-1 text-[0.6875rem] font-semibold leading-snug text-[#8b5f08]">
      {gold.weightDisplay} gold credited · {rate}
    </p>
  );
}

function PaymentScheduleRows({
  rows,
  onDownloadReceipt,
  showReceiptActions,
  schemeIsGold,
  variant = "preview",
}: {
  rows: ScheduleRow[];
  onDownloadReceipt?: (payment: PaymentListItem) => void | Promise<void>;
  showReceiptActions?: boolean;
  schemeIsGold?: boolean;
  variant?: "preview" | "full";
}) {
  const showStepRail = variant === "full";

  const instalmentRows = rows.filter((row) => !(row.isBenefit && row.status === "BENEFIT"));
  const benefitRow = rows.find((row) => row.isBenefit && row.status === "BENEFIT");

  return (
    <div className="space-y-0">
      <ul className="space-y-0">
        {instalmentRows.map((row, index) => (
          <li
            key={row.key}
            className={cn(
              "grid gap-x-2.5 pb-4 last:pb-0",
              showStepRail ? "grid-cols-[2.25rem_1.75rem_minmax(0,1fr)]" : "grid-cols-[1.75rem_minmax(0,1fr)]",
            )}
          >
            {showStepRail ? (
              <div className="pt-0.5">
                <ScheduleStepRail row={row} />
              </div>
            ) : null}
            <div className="flex flex-col items-center">
              {scheduleIconWrap(row.status)}
              {index < instalmentRows.length - 1 ? (
                <span className="my-1 min-h-[1.35rem] flex-1 border-l border-dashed border-[#d8d0c8]" aria-hidden />
              ) : null}
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#171722]">{row.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#5c5763]">{row.amountDisplay}</p>
                  {row.detailLine ? (
                    <p className="mt-0.5 text-xs font-medium text-[#77727c]">{row.detailLine}</p>
                  ) : null}
                  {schemeIsGold && row.payment ? <ScheduleGoldMeta payment={row.payment} /> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-wide",
                      scheduleStatusPill(row.status),
                    )}
                  >
                    {scheduleStatusText(row.status)}
                  </span>
                  {showReceiptActions && row.payment && onDownloadReceipt && row.status === "PAID" ? (
                    <ReceiptPdfDownloadButton payment={row.payment} onDownload={onDownloadReceipt} compact />
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {benefitRow ? (
        <div className={instalmentRows.length > 0 ? "mt-3 border-t border-[#ece6e0] pt-3" : undefined}>
          <MaturityBenefitScheduleCard row={benefitRow} />
        </div>
      ) : null}
    </div>
  );
}

export function SchemePaymentReceipts({
  payments,
  onDownloadReceipt,
}: {
  payments: PaymentListItem[];
  onDownloadReceipt: (payment: PaymentListItem) => void | Promise<void>;
}) {
  const paid = [...payments]
    .filter((p) => p.status === "SUCCESS")
    .sort((a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime());

  if (!paid.length) return null;

  return (
    <section className={detailSurfaceClass}>
      <h3 className="text-sm font-black text-[#171722]">Payment invoices</h3>
      <p className="mt-0.5 text-xs text-[#77727c]">Download PDF receipts for verified contributions on this scheme.</p>
      <ul className="mt-4 space-y-3">
        {paid.map((payment) => {
          const when = payment.paidAt ? new Date(payment.paidAt) : new Date(payment.createdAt);
          return (
            <li
              key={payment.id}
              className="rounded-xl border border-[#ece6e0] bg-[#fcfaf8] p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-black text-[#171722]">{payment.amount.amountDisplay}</p>
                  <p className="mt-0.5 text-xs font-medium text-[#77727c]">
                    {when.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    {payment.channelLabel ?? payment.channel.replaceAll("_", " ")}
                  </p>
                </div>
                <span className="rounded-full bg-[#eafbf3] px-2.5 py-0.5 text-[0.62rem] font-extrabold uppercase text-[#0b9860]">
                  Paid
                </span>
              </div>
              <ReceiptPdfDownloadButton payment={payment} onDownload={onDownloadReceipt} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PaymentScheduleBlock({
  scheme,
  onDownloadReceipt,
  schemeIsGold,
}: {
  scheme: CustomerSchemeDetail;
  onDownloadReceipt?: (payment: PaymentListItem) => void | Promise<void>;
  schemeIsGold?: boolean;
}) {
  const rows = buildFixedSchedule(scheme);
  const instalmentCount = scheme.progressCard.installmentsTotal ?? rows.length;
  const showGoldMeta = schemeIsGold ?? isGoldWeightScheme(scheme.valueBasis);

  return (
    <section className={detailSurfaceClass}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-black text-[#171722]">Payment schedule</h3>
        {instalmentCount > 0 ? (
          <p className="text-xs font-semibold text-[#77727c]">{instalmentCount} instalments</p>
        ) : null}
      </div>
      {rows.length ? (
        <div className="mt-4">
          <PaymentScheduleRows
            rows={rows}
            variant="full"
            schemeIsGold={showGoldMeta}
            onDownloadReceipt={onDownloadReceipt}
            showReceiptActions
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#77727c]">Instalment schedule is not available yet.</p>
      )}
    </section>
  );
}

export function NextInstalmentCard({
  scheme,
  onPay,
  payEnabled,
  payLabel,
  helperText,
}: {
  scheme: CustomerSchemeDetail;
  onPay: () => void;
  payEnabled: boolean;
  payLabel: string;
  helperText?: string | null;
}) {
  const amount = scheme.nextActionAmount?.amountDisplay ?? scheme.payableRange?.maxPayable?.amountDisplay ?? "—";
  const dueLabel = scheme.nextActionLabel?.includes("·")
    ? scheme.nextActionLabel.split("·").pop()?.trim()
    : formatCustomerDate(scheme.maturityDate);

  const dueDisplay =
    dueLabel && /^\d{4}-\d{2}-\d{2}$/.test(dueLabel.trim())
      ? formatCustomerDate(dueLabel.trim())
      : (dueLabel ?? "—");

  return (
    <section className={cn(detailSurfaceClass, "flex flex-col gap-4")}>
      <div className="flex items-center gap-3.5">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl text-[var(--customer-accent,#8b5f08)]"
          style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.22)" }}
        >
          <CalendarDays className="size-5" strokeWidth={2} />
        </span>
        <div>
          <p className="text-xs font-semibold text-[#77727c]">Next instalment</p>
          <p className="text-2xl font-black text-[#171722]">{amount}</p>
          <p className="mt-0.5 text-xs text-[#77727c]">Due {dueDisplay}</p>
        </div>
      </div>
      <Button
        disabled={!payEnabled}
        onClick={onPay}
        className={cn(
          "h-12 w-full rounded-xl text-base font-black text-white",
          !payEnabled && "opacity-70",
        )}
        style={{ background: "var(--customer-primary, #730321)" }}
      >
        {payLabel}
      </Button>
      {helperText ? (
        <p className="text-center text-[0.68rem] leading-relaxed text-amber-800">{helperText}</p>
      ) : null}
    </section>
  );
}

function FreeWindowBlocks({
  scheme,
  onPay,
  payEnabled,
  payLabel,
}: {
  scheme: CustomerSchemeDetail;
  onPay: () => void;
  payEnabled: boolean;
  payLabel: string;
}) {
  const range = scheme.payableRange;
  const min = range?.minPayable?.amountDisplay ?? "—";
  const max = range?.maxPayable?.amountDisplay ?? "—";
  const month = scheme.progressCard.freeWindowMonth ?? scheme.freeWindowMonth ?? 1;
  const months = scheme.progressCard.freeWindowMonths ?? scheme.freeWindowMonths ?? 6;
  const completed = scheme.progressCard.freeWindowMonthsCompleted ?? Math.max(0, month - 1);
  const lockedAverage = scheme.progressCard.lockedAverage?.amountDisplay;
  const remaining = range?.remainingThisCycle?.amountPaise ?? range?.maxPayable?.amountPaise ?? 0;
  const paidCycle = range?.cycleCap?.amountPaise
    ? range.cycleCap.amountPaise - (range.remainingThisCycle?.amountPaise ?? 0)
    : 0;
  const paidCycleDisplay = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Math.max(0, paidCycle) / 100,
  );

  return (
    <>
      <section
        className="mt-4 rounded-[1.15rem] border p-4"
        style={{
          borderColor: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.35)",
          background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.1)",
        }}
      >
        <div className="flex gap-3">
          <CalendarDays className="size-5 shrink-0 text-[var(--customer-accent,#8b5f08)]" />
          <div>
            <p className="text-sm font-bold text-[#171722]">Pay any amount this month</p>
            <p className="mt-1 text-lg font-black text-[#171722]">
              {min} – {max}
            </p>
            <p className="mt-2 text-xs text-[#706b77]">{scheme.helperText || "Free window locks at the end of the flexible phase."}</p>
          </div>
        </div>
      </section>

      <section className="customer-surface mt-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {Array.from({ length: Math.min(months, 8) }).map((_, index) => {
            const done = index < completed;
            const current = index === completed;
            return (
              <div key={index} className="flex min-w-[3.25rem] flex-col items-center gap-1">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full border-2",
                    done && "border-[var(--customer-primary,#730321)] bg-[var(--customer-primary,#730321)] text-white",
                    current && "size-10 border-[var(--customer-primary,#730321)] bg-[var(--customer-primary,#730321)] text-white shadow-[0_0_0_4px_rgba(var(--customer-primary-rgb,115,3,33),0.15)]",
                    !done && !current && "border-[#ddd6cf] bg-white text-[#b0a9b3]",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
                <span className={cn("text-[0.6rem] font-bold", current ? "text-[var(--customer-primary,#730321)]" : "text-[#8a8490]")}>
                  {current ? "Current" : index < completed ? "Done" : "Upcoming"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {lockedAverage ? (
        <section className="customer-surface mt-4 flex gap-3 p-4 sm:p-5">
          <BarChart3 className="size-5 shrink-0 text-[var(--customer-accent,#8b5f08)]" />
          <div>
            <p className="flex items-center gap-1 text-sm font-bold text-[#171722]">
              Projected monthly cap after lock
              <Info className="size-3.5 text-[#8a8490]" />
            </p>
            <p className="mt-1 text-xl font-black text-[#171722]">{lockedAverage}</p>
            <p className="mt-1 text-xs text-[#77727c]">Based on your current average</p>
          </div>
        </section>
      ) : null}

      <section className="customer-surface mt-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[#77727c]">This month</p>
            <p className="mt-1 text-2xl font-black text-[#171722]">{paidCycleDisplay} paid</p>
            {remaining > 0 ? (
              <p className="mt-1 text-sm text-[#706b77]">
                You can add up to{" "}
                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(remaining / 100)}
              </p>
            ) : null}
          </div>
          <span className="grid size-11 place-items-center rounded-full bg-[#f6edf0] text-[var(--customer-primary,#730321)]">
            <Wallet className="size-5" />
          </span>
        </div>
        <Button
          disabled={!payEnabled}
          onClick={onPay}
          className="mt-4 h-12 w-full rounded-xl font-black text-white"
          style={{ background: "var(--customer-primary, #730321)" }}
        >
          {payLabel}
        </Button>
      </section>
    </>
  );
}

function LockedCycleBlock({
  scheme,
  onPay,
  payEnabled,
  payLabel,
}: {
  scheme: CustomerSchemeDetail;
  onPay: () => void;
  payEnabled: boolean;
  payLabel: string;
}) {
  const cap = scheme.progressCard.cycleCap ?? scheme.cycleCap;
  const remaining = scheme.progressCard.remainingThisCycle ?? scheme.remainingThisCycle;
  const capPaise = cap?.amountPaise ?? 0;
  const remainingPaise = remaining?.amountPaise ?? 0;
  const paidPaise = Math.max(0, capPaise - remainingPaise);
  const usedPercent = capPaise ? Math.round((paidPaise / capPaise) * 100) : 0;
  const paidDisplay = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    paidPaise / 100,
  );
  const cycleLabel = scheme.payableRange?.targetCycle
    ? new Date(`${scheme.payableRange.targetCycle}-01`).toLocaleDateString("en-IN", { month: "long" })
    : "Current";

  return (
    <>
      <section className="customer-surface mt-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black capitalize text-[#171722]">{cycleLabel} cycle</h3>
          <p className="text-[0.65rem] text-[#77727c]">Cycle ends end of month</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[0.65rem] font-semibold text-[#77727c]">Cycle cap</p>
            <p className="mt-1 text-sm font-black">{cap?.amountDisplay ?? "—"}</p>
          </div>
          <div className="border-x border-[#ebe4dc]">
            <p className="text-[0.65rem] font-semibold text-[#77727c]">Paid</p>
            <p className="mt-1 text-sm font-black">{paidDisplay}</p>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold text-[#77727c]">Remaining</p>
            <p className="mt-1 text-sm font-black text-[var(--customer-primary,#730321)]">{remaining?.amountDisplay ?? "—"}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#ece8e4]">
            <div className="h-full rounded-full bg-[var(--customer-primary,#730321)]" style={{ width: progressWidth(usedPercent) }} />
          </div>
          <span className="text-xs font-bold text-[#706b77]">{usedPercent}%</span>
        </div>
        <p className="mt-2 text-[0.65rem] text-[#77727c]">Cap based on your free-window average</p>
        <Button
          disabled={!payEnabled}
          onClick={onPay}
          className="mt-4 h-12 w-full rounded-xl font-black text-white"
          style={{ background: "var(--customer-primary, #730321)" }}
        >
          {payLabel}
        </Button>
      </section>

      <section
        className="mt-3 flex gap-2 rounded-xl border px-3.5 py-3 text-xs leading-5 text-[#6b4e32]"
        style={{
          borderColor: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.45)",
          background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.12)",
        }}
      >
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>Final-cycle payments may be lower than your monthly cap so the scheme can close exactly at maturity balance.</p>
      </section>

      <section className="customer-surface mt-3 flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-sm text-[#706b77]">
          <LockKeyhole className="size-4 shrink-0" />
          <span>Next cycle advance — available after this cycle is complete</span>
        </div>
        <span className="shrink-0 rounded-full bg-[#f0ece8] px-2.5 py-1 text-[0.62rem] font-extrabold text-[#8a8490]">Locked</span>
      </section>
    </>
  );
}

/** Height of customer mobile bottom nav (incl. centre Pay FAB). Keep in sync with customer-shell. */
export const CUSTOMER_MOBILE_NAV_DOCK = "5.85rem";

/** Floating total paid / remaining dock above mobile nav (fixed schemes). */
export function FixedSchemeSummaryDock({ scheme }: { scheme: CustomerSchemeDetail }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[39] lg:hidden"
      style={{ bottom: `calc(${CUSTOMER_MOBILE_NAV_DOCK} + env(safe-area-inset-bottom, 0px))` }}
    >
      <div className="pointer-events-auto mx-auto max-w-lg px-4 pb-1">
        <div className="rounded-2xl shadow-[0_-10px_36px_rgba(32,20,28,0.14)] backdrop-blur-sm">
          <FixedSchemeTotalsCard scheme={scheme} />
        </div>
      </div>
    </div>
  );
}

export function FixedSchemeTotalsCard({ scheme }: { scheme: CustomerSchemeDetail }) {
  const totalPaid = scheme.totalPaid?.amountDisplay ?? "₹0";
  const paid = scheme.progressCard.installmentsPaid ?? 0;
  const total = scheme.progressCard.installmentsTotal ?? 0;
  const remainingCount = Math.max(0, total - paid);
  const instPaise =
    scheme.nextActionAmount?.amountPaise ??
    scheme.payableRange?.maxPayable?.amountPaise ??
    scheme.payableRange?.suggested?.amountPaise ??
    0;
  const remainingDisplay = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    (remainingCount * instPaise) / 100,
  );

  return (
    <div className="rounded-2xl border border-[#e8e2dc] bg-[#faf7f4] px-4 py-3.5 shadow-[0_4px_18px_rgba(var(--customer-primary-rgb,115,3,33),0.06)]">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2.5 pr-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff2cf] text-[var(--customer-accent,#8b5f08)]">
            <Coins className="size-[1.05rem]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.65rem] font-medium text-[#77727c]">Total paid</p>
            <p className="truncate text-base font-black text-[#171722]">{totalPaid}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 border-l border-[#e5ddd7] pl-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff2cf] text-[var(--customer-accent,#8b5f08)]">
            <PieChart className="size-[1.05rem]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.65rem] font-medium text-[#77727c]">Remaining</p>
            <p className="truncate text-base font-black text-[#171722]">{remainingDisplay}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PassbookList({
  payments,
  onDownloadReceipt,
}: {
  payments: PaymentListItem[];
  onDownloadReceipt: (payment: PaymentListItem) => void;
}) {
  if (!payments.length) {
    return <p className="py-8 text-center text-sm text-[#77727c]">No passbook entries yet.</p>;
  }

  return (
    <ul className="divide-y divide-[#ece6e0]">
      {payments.map((payment) => {
        const when = payment.paidAt ? new Date(payment.paidAt) : null;
        return (
          <li key={payment.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 py-4 text-left"
              onClick={() => payment.receiptDownloadPath && onDownloadReceipt(payment)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#171722]">
                  {when
                    ? when.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </p>
                <p className="text-[0.65rem] text-[#77727c]">
                  {when
                    ? when.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
                    : ""}
                </p>
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-sm font-black text-[#171722]">{payment.amount.amountDisplay}</p>
                <p className="text-xs text-[#77727c]">{payment.channelLabel ?? payment.channel}</p>
                {paymentHasGoldAccrual(payment) && payment.goldAccrual ? (
                  <p className="text-[0.65rem] font-semibold text-[#8b5f08]">
                    {payment.goldAccrual.weightDisplay} · {formatGoldPurchaseDate(payment.goldAccrual.purchasedAt ?? payment.paidAt)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {payment.status === "SUCCESS" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0b9860]">
                    <Check className="size-3.5" strokeWidth={3} />
                    Paid
                  </span>
                ) : (
                  <span className="text-xs text-[#77727c]">{payment.statusLabel ?? payment.status}</span>
                )}
                <ChevronRight className="size-4 text-[#b0a9b3]" />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RulesBlock({ section }: { section: CustomerPlanRulesSection }) {
  return (
    <div className="customer-surface p-5">
      <h3 className="text-sm font-black text-[var(--customer-primary,#730321)]">{section.title}</h3>
      <ul className="mt-3 space-y-2">
        {section.items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-[#706b77]">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--customer-accent,#d5a52e)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BenefitTab({
  scheme,
  maturityBenefit,
  schemeIsGold,
  redemptionEligible,
  redemptionBlocker,
  onRedeem,
}: {
  scheme: CustomerSchemeDetail;
  maturityBenefit: CustomerMaturityBenefit;
  schemeIsGold: boolean;
  redemptionEligible: boolean;
  redemptionBlocker?: string;
  onRedeem: () => void;
}) {
  return (
    <section className="customer-surface p-5 sm:p-6">
      <div className="flex gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fff2ce] text-[#946b17]">
          <Gem className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9b7224]">At maturity</p>
          <h2 className="mt-1 text-xl font-black">{maturityBenefit.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#706b77]">
            {maturityBenefit.summary ||
              (schemeIsGold
                ? "Gold benefits use the published rate on or before the maturity date."
                : "Your jeweller will confirm settlement when you redeem.")}
          </p>
        </div>
      </div>
      {maturityBenefit.details.length > 0 && (
        <ul className="mt-5 space-y-2 rounded-2xl bg-[#fbf7f4] p-4 text-sm">
          {maturityBenefit.details.map((line) => (
            <li key={line} className="flex gap-2 text-[#706b77]">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-[#9a6f2a]" />
              {line}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5">
        {redemptionEligible ? (
          <Button onClick={onRedeem} className="rounded-xl font-black text-white" style={{ background: "var(--customer-primary, #730321)" }}>
            Request redemption
          </Button>
        ) : (
          <p className="inline-flex items-center gap-2 rounded-xl bg-[#faf6f3] px-3 py-2 text-xs text-[#706b77]">
            <LockKeyhole className="size-4" />
            {redemptionBlocker ?? "Not eligible yet"}
          </p>
        )}
      </div>
    </section>
  );
}

export function SchemeDetailTabs({
  scheme,
  mode,
  maturityBenefit,
  schemeIsGold,
  planRuleSections,
  payments,
  redemptionEligible,
  redemptionBlocker,
  onRedeem,
  onDownloadReceipt,
  passbookExtra,
  passbookLayout = "default",
}: {
  scheme: CustomerSchemeDetail;
  mode: CustomerDisplayMode;
  maturityBenefit: CustomerMaturityBenefit;
  schemeIsGold: boolean;
  planRuleSections: CustomerPlanRulesSection[];
  payments: PaymentListItem[];
  redemptionEligible: boolean;
  redemptionBlocker?: string;
  onRedeem: () => void;
  onDownloadReceipt: (payment: PaymentListItem) => void;
  passbookExtra?: React.ReactNode;
  passbookLayout?: "default" | "fixed";
}) {
  const { tenantSlug } = useCustomerTenant();

  const tabTriggerClass =
    "flex !h-auto min-h-[3rem] w-full flex-col items-center justify-center gap-1 rounded-none border-0 border-b-2 border-transparent bg-transparent px-1 pb-3 pt-1 text-[0.65rem] font-bold leading-tight text-[#8a8490] shadow-none after:!hidden hover:text-[#5c5763] data-[state=active]:!border-[var(--customer-primary,#730321)] data-[state=active]:!bg-transparent data-[state=active]:!text-[var(--customer-primary,#730321)] data-[state=active]:shadow-none sm:min-h-[2.75rem] sm:flex-row sm:gap-1.5 sm:text-xs";

  return (
    <Tabs defaultValue="passbook" className="mt-4 gap-0">
      <TabsList
        variant="line"
        className="grid !h-auto w-full grid-cols-3 items-stretch gap-0 rounded-none border-b border-[#ece6e0] bg-transparent p-0 shadow-none"
      >
        <TabsTrigger value="passbook" className={tabTriggerClass}>
          <BookOpen className="size-4 shrink-0" strokeWidth={2.25} />
          <span>Passbook</span>
        </TabsTrigger>
        <TabsTrigger value="benefit" className={tabTriggerClass}>
          <BarChart3 className="size-4 shrink-0" strokeWidth={2.25} />
          <span className="max-w-[4.5rem] text-center sm:max-w-none">Maturity benefit</span>
        </TabsTrigger>
        <TabsTrigger value="rules" className={tabTriggerClass}>
          <Scale className="size-4 shrink-0" strokeWidth={2.25} />
          <span>Plan rules</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="passbook" className="mt-3 space-y-3 focus-visible:outline-none">
        {passbookExtra ? <div className="space-y-3">{passbookExtra}</div> : null}
        {passbookLayout === "fixed" ? (
          <>
            <Link
              href={customerPath(tenantSlug, "payments")}
              className={cn(
                detailSurfaceClass,
                "flex items-center justify-between py-3.5 text-sm font-bold text-[var(--customer-primary,#730321)]",
              )}
            >
              View full passbook
              <ChevronRight className="size-4" strokeWidth={2.5} />
            </Link>
          </>
        ) : (
          <section className="customer-surface overflow-hidden px-4 sm:px-5">
            <PassbookList payments={payments} onDownloadReceipt={onDownloadReceipt} />
          </section>
        )}
      </TabsContent>

      <TabsContent value="benefit" className="mt-4">
        <BenefitTab
          scheme={scheme}
          maturityBenefit={maturityBenefit}
          schemeIsGold={schemeIsGold}
          redemptionEligible={redemptionEligible}
          redemptionBlocker={redemptionBlocker}
          onRedeem={onRedeem}
        />
      </TabsContent>

      <TabsContent value="rules" className="mt-4 space-y-4">
        {planRuleSections.length ? (
          planRuleSections.map((section) => <RulesBlock key={section.title} section={section} />)
        ) : (
          <section className="customer-surface p-5">
            <ul className="space-y-3 text-sm text-[#706b77]">
              <li className="flex gap-3">
                <ShieldCheck className="size-5 text-emerald-700" />
                Paid contributions never expire and stay in your immutable ledger.
              </li>
              <li className="flex gap-3">
                <Scale className="size-5 text-[#9a6f2a]" />
                Payment limits follow your current plan phase.
              </li>
            </ul>
          </section>
        )}
        {scheme.payableRange ? (
          <CustomerPayableSummary range={scheme.payableRange} displayMode={scheme.displayMode} />
        ) : null}
      </TabsContent>
    </Tabs>
  );
}

export function SchemeDetailModeBody({
  scheme,
  mode,
  onPay,
  payEnabled,
  payLabel,
  schemeIsGold,
}: {
  scheme: CustomerSchemeDetail;
  mode: CustomerDisplayMode;
  onPay: () => void;
  payEnabled: boolean;
  payLabel: string;
  schemeIsGold?: boolean;
}) {
  const normalized = normalizeSchemeMode(mode);

  if (normalized === "FIXED") {
    return <FixedHero scheme={scheme} schemeIsGold={schemeIsGold} />;
  }

  if (normalized === "FLEXIBLE_FREE_WINDOW") {
    return (
      <>
        <FlexibleFreeHero scheme={scheme} />
        <FreeWindowBlocks scheme={scheme} onPay={onPay} payEnabled={payEnabled} payLabel={payLabel} />
      </>
    );
  }

  return (
    <>
      <FlexibleLockedHero scheme={scheme} />
      <LockedCycleBlock scheme={scheme} onPay={onPay} payEnabled={payEnabled} payLabel={payLabel} />
    </>
  );
}
