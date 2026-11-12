"use client";

/**
 * Scheme detail page laid out per the approved v2 plan:
 * hero → pay card → schedule / recent contributions → at maturity → Passbook · Download · Plan rules.
 */
import { useState } from "react";
import { Check, Download, FileText, Gem, Gift, BadgePercent, BookOpen, Info, LockKeyhole, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomerPayableSummary } from "@/src/components/customer/customer-payable-summary";
import { formatCustomerDate } from "@/src/components/customer/customer-ui";
import { CkBadge, CkBar, CkCard, CkIcon, CkNote } from "@/src/components/customer/customer-kit";
import { buildFixedSchedule, type ScheduleRow } from "@/src/features/customer/customer-scheme-schedule";
import {
  AuthoritativePassbookList,
  FixedHero,
  FlexibleFreeHero,
  FlexibleLockedHero,
  normalizeSchemeMode,
  PassbookList,
  RulesBlock,
} from "@/src/features/customer/customer-scheme-detail-views";
import type {
  CustomerMaturityBenefit,
  CustomerPassbookRow,
  CustomerPlanRulesSection,
  CustomerSchemeDetail,
  MoneyRef,
  PaymentListItem,
} from "@/src/types/customer";

const PRIMARY = "var(--customer-primary, #5e1622)";

function PeMark({ light = false, size = 22 }: { light?: boolean; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-md text-[0.6rem] font-extrabold"
      style={{ width: size, height: size, background: light ? "#fff" : "#5f259f", color: light ? "#5f259f" : "#fff" }}
      aria-hidden
    >
      Pe
    </span>
  );
}

function channelMark(payment?: PaymentListItem) {
  if (!payment) return null;
  if (payment.channel === "CASH") {
    return <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--ck-ok)] text-xs font-bold text-white">₹</span>;
  }
  return <PeMark size={36} />;
}

function paymentSubLine(payment?: PaymentListItem, fallback?: string) {
  if (!payment) return fallback ?? "";
  const channel = payment.channel === "CASH" ? "Cash at counter" : payment.channelLabel ?? "PhonePe";
  return [channel, payment.receiptNumber].filter(Boolean).join(" · ");
}

function payAmountShort(scheme: CustomerSchemeDetail) {
  return scheme.nextActionAmount?.amountDisplay ?? scheme.payableRange?.suggested?.amountDisplay;
}

function dueLabel(scheme: CustomerSchemeDetail) {
  const tail = (scheme.nextActionLabel ?? "").split("·").pop()?.trim();
  return tail && /\d/.test(tail) ? tail.replace(/^due\s*/i, "") : null;
}

/* ───────────── pieces ───────────── */

function NextPayCard({
  scheme,
  schemeIsGold,
  onPay,
  payEnabled,
}: {
  scheme: CustomerSchemeDetail;
  schemeIsGold: boolean;
  onPay: () => void;
  payEnabled: boolean;
}) {
  const amount = payAmountShort(scheme);
  if (!amount) return null;
  const due = dueLabel(scheme);
  return (
    <CkCard className="mt-3 flex items-center gap-3 p-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-[var(--ck-muted)]">
          {schemeIsGold ? "Next contribution" : "Next instalment"}
          {due ? ` · due ${due}` : ""}
        </p>
        <p className="mt-0.5 text-[1.5rem] font-bold leading-tight tracking-[-0.03em] tabular-nums text-[var(--ck-ink)]">{amount}</p>
      </div>
      <button
        type="button"
        onClick={onPay}
        disabled={!payEnabled}
        className="flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[0.82rem] font-semibold text-white disabled:opacity-50"
        style={{ background: PRIMARY }}
      >
        <PeMark light />
        Pay now
      </button>
    </CkCard>
  );
}

function ScheduleCircle({ row, index }: { row: ScheduleRow; index: number }) {
  if (row.status === "PAID") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ck-ok-soft)] text-[var(--ck-ok)]">
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (row.isBenefit || row.status === "BENEFIT") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ck-gold-soft)] text-[#8a6a24]">
        <Gift className="size-3.5" />
      </span>
    );
  }
  const n = row.stepLabel?.replace(/\D/g, "") || String(index + 1);
  return (
    <span
      className="grid size-7 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold"
      style={row.status === "DUE" ? { background: PRIMARY, color: "#fff" } : { background: "#f3ede6", color: "var(--ck-muted)" }}
    >
      {n}
    </span>
  );
}

function rowBadge(row: ScheduleRow) {
  if (row.isBenefit || row.status === "BENEFIT") return <CkBadge tone="gold">Benefit</CkBadge>;
  if (row.status === "PAID") return <CkBadge tone="ok" dot>Paid</CkBadge>;
  if (row.status === "DUE") return <CkBadge tone="warn" dot>Due</CkBadge>;
  return <CkBadge tone="muted">Upcoming</CkBadge>;
}

function ScheduleList({
  scheme,
  schemeIsGold,
  onDownloadReceipt,
}: {
  scheme: CustomerSchemeDetail;
  schemeIsGold: boolean;
  onDownloadReceipt: (payment: PaymentListItem) => void;
}) {
  const rows = buildFixedSchedule(scheme);
  const [expanded, setExpanded] = useState(false);
  const total = scheme.progressCard.installmentsTotal ?? rows.length;
  // Keep the two most recent paid rows visible; fold anything older behind "Show N earlier".
  const lastPaidIndex = rows.reduce((acc, r, i) => (r.status === "PAID" ? i : acc), -1);
  const foldBefore = Math.max(0, lastPaidIndex - 1);
  const hidden = expanded ? 0 : foldBefore;
  const visible = rows.slice(hidden);

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-[-0.015em] text-[var(--ck-ink)]">{schemeIsGold ? "Contributions" : "Payment schedule"}</h2>
        <span className="text-[0.8rem] font-semibold" style={{ color: PRIMARY }}>
          {total} {schemeIsGold ? "months" : "instalments"}
        </span>
      </div>
      {rows.length ? (
        <div className="overflow-hidden rounded-[1.15rem] border border-[var(--ck-line)] bg-white">
          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="block w-full border-b border-[var(--ck-line-soft)] py-3 text-center text-[0.8rem] font-semibold"
              style={{ color: PRIMARY }}
            >
              Show {hidden} earlier {schemeIsGold ? "months" : "paid instalments"}
            </button>
          ) : null}
          {visible.map((row, i) => {
            const clickable = row.status === "PAID" && row.payment?.receiptDownloadPath;
            const sub =
              row.status === "PAID"
                ? paymentSubLine(row.payment, row.detailLine)
                : row.isBenefit
                  ? "Covered by your benefit"
                  : row.status === "DUE"
                    ? schemeIsGold
                      ? "Converted to grams on payment"
                      : `Instalment ${row.stepLabel?.replace(/\D/g, "") || hidden + i + 1} of ${total}`
                    : row.detailLine ?? "";
            const content = (
              <>
                <ScheduleCircle row={row} index={hidden + i} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.88rem] font-semibold tabular-nums text-[var(--ck-ink)]">{row.label}</p>
                  {sub ? <p className="mt-0.5 truncate text-xs text-[var(--ck-muted)]">{sub}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[0.88rem] font-semibold tabular-nums text-[var(--ck-ink)]">{row.isBenefit ? "Free" : row.amountDisplay}</span>
                  {rowBadge(row)}
                </div>
              </>
            );
            const cls = "flex w-full items-center gap-3 border-b border-[var(--ck-line-soft)] px-3.5 py-3 text-left last:border-b-0";
            return clickable ? (
              <button key={row.key} type="button" className={cls} onClick={() => row.payment && onDownloadReceipt(row.payment)} title="Download receipt">
                {content}
              </button>
            ) : (
              <div key={row.key} className={cls}>
                {content}
              </div>
            );
          })}
        </div>
      ) : (
        <CkCard className="p-4 text-sm text-[var(--ck-muted)]">Instalment schedule is not available yet.</CkCard>
      )}
    </section>
  );
}

function RecentContributions({ payments, onOpenPassbook, count }: { payments: PaymentListItem[]; onOpenPassbook: () => void; count?: number }) {
  const recent = [...payments]
    .filter((p) => p.status === "SUCCESS")
    .sort((a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime())
    .slice(0, 3);
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-[-0.015em] text-[var(--ck-ink)]">Recent contributions</h2>
        <button type="button" onClick={onOpenPassbook} className="text-[0.8rem] font-semibold" style={{ color: PRIMARY }}>
          {count ? `${count} entries` : "Passbook"} ›
        </button>
      </div>
      {recent.length ? (
        <div className="overflow-hidden rounded-[1.15rem] border border-[var(--ck-line)] bg-white">
          {recent.map((p) => (
            <div key={p.id} className="flex items-center gap-3 border-b border-[var(--ck-line-soft)] px-3.5 py-3 last:border-b-0">
              {channelMark(p)}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.88rem] font-semibold text-[var(--ck-ink)]">Contribution</p>
                <p className="mt-0.5 truncate text-xs text-[var(--ck-muted)]">
                  {p.paidAt ? formatCustomerDate(p.paidAt) : "—"}
                  {p.receiptNumber ? ` · ${p.receiptNumber}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[0.88rem] font-semibold tabular-nums text-[var(--ck-ink)]">{p.amount.amountDisplay}</span>
                <CkBadge tone="ok" dot>
                  Paid
                </CkBadge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CkCard className="p-4 text-sm text-[var(--ck-muted)]">No contributions yet.</CkCard>
      )}
    </section>
  );
}

function QuickAmounts({
  amounts,
  selected,
  onPick,
}: {
  amounts: MoneyRef[];
  selected?: number | null;
  onPick: (paise: number) => void;
}) {
  if (!amounts.length) return null;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(amounts.length, 4)}, minmax(0, 1fr))` }}>
      {amounts.map((m) => {
        const on = selected === m.amountPaise;
        return (
          <button
            key={m.amountPaise}
            type="button"
            onClick={() => onPick(m.amountPaise)}
            className={cn("rounded-xl border py-2.5 text-[0.85rem] font-semibold tabular-nums", on ? "" : "border-[var(--ck-line)] bg-white text-[var(--ck-ink-2)]")}
            style={on ? { borderColor: PRIMARY, color: PRIMARY, background: "rgba(var(--customer-primary-rgb, 94, 22, 34), 0.06)" } : undefined}
          >
            {m.amountDisplay}
          </button>
        );
      })}
    </div>
  );
}

function FreeWindowMonthCard({
  scheme,
  onPay,
  payEnabled,
}: {
  scheme: CustomerSchemeDetail;
  onPay: (paise?: number) => void;
  payEnabled: boolean;
}) {
  const range = scheme.payableRange;
  const quick = range?.quickAmounts ?? [];
  const [pick, setPick] = useState<number | null>(range?.suggested?.amountPaise ?? quick[0]?.amountPaise ?? null);
  const max = range?.remainingThisCycle ?? range?.maxPayable;
  const paidPaise = range?.cycleCap?.amountPaise ? Math.max(0, range.cycleCap.amountPaise - (range.remainingThisCycle?.amountPaise ?? 0)) : 0;
  const paidThisMonth = {
    amountDisplay: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paidPaise / 100),
  };
  const pct = max && max.amountPaise + paidPaise > 0 ? (paidPaise / (paidPaise + max.amountPaise)) * 100 : 0;
  const pickDisplay = quick.find((q) => q.amountPaise === pick)?.amountDisplay;

  return (
    <CkCard className="mt-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[0.92rem] font-semibold text-[var(--ck-ink)]">This month</p>
        <CkBadge tone="muted">{range?.contributionIsOptional === false ? "Due" : "Optional"}</CkBadge>
      </div>
      <p className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-[1.75rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--ck-ink)]">{paidThisMonth?.amountDisplay ?? "₹0"}</span>
        {max ? <span className="text-[0.8rem] text-[var(--ck-muted)]">paid of up to {max.amountDisplay}</span> : null}
      </p>
      <CkBar className="mt-2.5" percent={pct} />
      {quick.length ? (
        <>
          <p className="mb-2 mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-[var(--ck-muted)]">Quick amounts</p>
          <QuickAmounts amounts={quick} selected={pick} onPick={setPick} />
        </>
      ) : null}
      <button
        type="button"
        disabled={!payEnabled}
        onClick={() => onPay(pick ?? undefined)}
        className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[0.92rem] font-semibold text-white disabled:opacity-50"
        style={{ background: PRIMARY }}
      >
        <PeMark light />
        {pickDisplay ? `Contribute ${pickDisplay} with PhonePe` : "Contribute with PhonePe"}
      </button>
    </CkCard>
  );
}

function CappedCycleCard({
  scheme,
  onPay,
  payEnabled,
}: {
  scheme: CustomerSchemeDetail;
  onPay: (paise?: number) => void;
  payEnabled: boolean;
}) {
  const range = scheme.payableRange;
  const cap = scheme.progressCard.cycleCap ?? range?.cycleCap;
  const remaining = scheme.progressCard.remainingThisCycle ?? range?.remainingThisCycle;
  const paidPaise = cap && remaining ? Math.max(0, cap.amountPaise - remaining.amountPaise) : 0;
  const paidDisplay = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paidPaise / 100);
  const pct = cap && cap.amountPaise > 0 ? (paidPaise / cap.amountPaise) * 100 : 0;
  const quick = range?.quickAmounts ?? [];
  const [pick, setPick] = useState<number | null>(remaining?.amountPaise ?? null);
  const cycleName = range?.targetCycle
    ? new Date(`${range.targetCycle}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long" })
    : null;
  const open = (remaining?.amountPaise ?? 0) > 0;

  return (
    <CkCard className="mt-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[0.92rem] font-semibold text-[var(--ck-ink)]">{cycleName ? `${cycleName} cycle` : "This cycle"}</p>
        <CkBadge tone={open ? "ok" : "muted"} dot>
          {open ? "Open" : "Limit reached"}
        </CkBadge>
      </div>
      <p className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-[1.85rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--ck-ink)]">{remaining?.amountDisplay ?? "₹0"}</span>
        <span className="text-[0.8rem] text-[var(--ck-muted)]">available to contribute</span>
      </p>
      <CkBar className="mt-4 h-2.5" percent={pct} />
      <div className="mt-2 flex justify-between text-xs text-[var(--ck-muted)]">
        <span>{paidDisplay} paid</span>
        {cap ? <span>Cap {cap.amountDisplay}</span> : null}
      </div>
      {quick.length ? (
        <div className="mt-3">
          <QuickAmounts amounts={quick} selected={pick} onPick={setPick} />
        </div>
      ) : null}
      <button
        type="button"
        disabled={!payEnabled || !open}
        onClick={() => onPay(pick ?? undefined)}
        className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[0.92rem] font-semibold text-white disabled:opacity-50"
        style={{ background: PRIMARY }}
      >
        <PeMark light />
        Contribute up to {remaining?.amountDisplay ?? "your limit"}
      </button>
    </CkCard>
  );
}

function benefitIcon(scheme: CustomerSchemeDetail, schemeIsGold: boolean) {
  const t = `${scheme.maturityBenefit?.title ?? ""} ${scheme.benefitLabel ?? ""}`.toUpperCase();
  if (schemeIsGold || t.includes("GOLD")) return Gem;
  if (t.includes("CASH") || t.includes("BONUS") || t.includes("%")) return BadgePercent;
  return Gift;
}

function AtMaturity({
  scheme,
  schemeIsGold,
  maturityBenefit,
  redemptionEligible,
  redemptionBlocker,
  redemptionModes,
  onRedeem,
  note,
}: {
  scheme: CustomerSchemeDetail;
  schemeIsGold: boolean;
  maturityBenefit: CustomerMaturityBenefit;
  redemptionEligible: boolean;
  redemptionBlocker?: string;
  redemptionModes: string[];
  onRedeem: () => void;
  note?: string | null;
}) {
  const Icon = benefitIcon(scheme, schemeIsGold);
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-base font-bold tracking-[-0.015em] text-[var(--ck-ink)]">At maturity</h2>
      <CkCard className="flex items-center gap-3 p-3.5">
        <CkIcon icon={Icon} tone="gold" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] text-[var(--ck-muted)]">Maturity benefit</p>
          <p className="text-[0.9rem] font-semibold leading-snug text-[var(--ck-ink)]">{maturityBenefit.title || scheme.benefitLabel}</p>
          <p className="text-xs text-[var(--ck-ink-2)]">On {formatCustomerDate(scheme.maturityDate)}</p>
        </div>
      </CkCard>
      <CkCard className="mt-2 flex items-center gap-3 p-3.5">
        <CkIcon icon={LockKeyhole} />
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] text-[var(--ck-muted)]">Redemption</p>
          <p className="text-[0.9rem] font-semibold leading-snug text-[var(--ck-ink)]">
            {redemptionEligible ? "You can redeem this scheme" : redemptionBlocker ?? "Not eligible yet"}
          </p>
          {redemptionModes.length ? <p className="text-xs capitalize text-[var(--ck-ink-2)]">{redemptionModes.join(" or ")}</p> : null}
        </div>
        {redemptionEligible ? (
          <Button size="sm" className="rounded-xl text-white" style={{ background: PRIMARY }} onClick={onRedeem}>
            Redeem
          </Button>
        ) : null}
      </CkCard>
      {note ? (
        <CkNote icon={Info} className="mt-2">
          {note}
        </CkNote>
      ) : null}
    </section>
  );
}

function downloadPassbookCsv(scheme: CustomerSchemeDetail, rows: CustomerPassbookRow[] | undefined, payments: PaymentListItem[]) {
  const lines: string[][] = [["Date", "Entry", "Amount", "Status", "Mode", "Receipt"]];
  if (rows?.length) {
    for (const r of rows) {
      const amt = r.netAmount ?? r.amountPaid ?? r.payment?.amountPaid ?? r.amountDue;
      lines.push([
        r.paidAt ?? r.dueDate ?? "",
        r.installmentNumber ? `Instalment ${r.installmentNumber}` : `Entry ${r.entryNumber}`,
        amt ? String(amt.amountPaise / 100) : "",
        r.status,
        r.mode ?? "",
        r.receiptNumber ?? r.payment?.receiptNumber ?? "",
      ]);
    }
  } else {
    for (const p of payments) {
      lines.push([p.paidAt ?? p.createdAt, "Payment", String(p.amount.amountPaise / 100), p.status, p.channelLabel ?? p.channel, p.receiptNumber ?? ""]);
    }
  }
  const csv = lines.map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `passbook-${scheme.schemeNumber.replace(/\W+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ───────────── page body ───────────── */

export function SchemeDetailPlanView({
  scheme,
  schemeIsGold,
  payEnabled,
  onPay,
  maturityBenefit,
  planRuleSections,
  payments,
  passbookRows,
  redemptionEligible,
  redemptionBlocker,
  redemptionModes,
  onRedeem,
  onDownloadReceipt,
}: {
  scheme: CustomerSchemeDetail;
  schemeIsGold: boolean;
  payEnabled: boolean;
  onPay: (amountPaise?: number) => void;
  maturityBenefit: CustomerMaturityBenefit;
  planRuleSections: CustomerPlanRulesSection[];
  payments: PaymentListItem[];
  passbookRows?: CustomerPassbookRow[];
  redemptionEligible: boolean;
  redemptionBlocker?: string;
  redemptionModes: string[];
  onRedeem: () => void;
  onDownloadReceipt: (payment: PaymentListItem) => void;
}) {
  const mode = normalizeSchemeMode(scheme.displayMode);
  const [sheet, setSheet] = useState<"passbook" | "rules" | null>(null);
  const actions = Array.isArray(scheme.lifecycleActions)
    ? scheme.lifecycleActions
    : Object.entries(scheme.lifecycleActions ?? {}).filter(([, v]) => v).map(([k]) => k);
  const canDownload = actions.length === 0 || actions.includes("DOWNLOAD_PASSBOOK");
  const passbookCount = scheme.passbookSummary?.totalEntries;

  return (
    <>
      {mode === "FIXED" ? <FixedHero scheme={scheme} schemeIsGold={schemeIsGold} /> : null}
      {mode === "FLEXIBLE_FREE_WINDOW" ? <FlexibleFreeHero scheme={scheme} /> : null}
      {mode === "FLEXIBLE_LOCK_WINDOW" ? <FlexibleLockedHero scheme={scheme} /> : null}

      {mode === "FIXED" ? <NextPayCard scheme={scheme} schemeIsGold={schemeIsGold} onPay={() => onPay()} payEnabled={payEnabled} /> : null}
      {mode === "FLEXIBLE_FREE_WINDOW" ? (
        <>
          <FreeWindowMonthCard scheme={scheme} onPay={onPay} payEnabled={payEnabled} />
          {scheme.helperText ? (
            <CkNote icon={Info} tone="blue" className="mt-3">
              {scheme.helperText}
            </CkNote>
          ) : null}
        </>
      ) : null}
      {mode === "FLEXIBLE_LOCK_WINDOW" ? (
        <>
          <CappedCycleCard scheme={scheme} onPay={onPay} payEnabled={payEnabled} />
          {scheme.helperText ? (
            <CkNote icon={Info} tone="blue" className="mt-3">
              {scheme.helperText}
            </CkNote>
          ) : null}
          <CkCard className="mt-2 flex items-center gap-3 p-3.5">
            <CkIcon icon={LockKeyhole} />
            <div className="min-w-0 flex-1">
              <p className="text-[0.7rem] text-[var(--ck-muted)]">Next cycle advance</p>
              <p className="text-[0.9rem] font-semibold text-[var(--ck-ink)]">Locked</p>
              <p className="text-xs text-[var(--ck-ink-2)]">Opens after the current cycle</p>
            </div>
          </CkCard>
        </>
      ) : null}

      {mode === "FIXED" ? (
        <ScheduleList scheme={scheme} schemeIsGold={schemeIsGold} onDownloadReceipt={onDownloadReceipt} />
      ) : (
        <RecentContributions payments={payments} onOpenPassbook={() => setSheet("passbook")} count={mode === "FLEXIBLE_LOCK_WINDOW" ? passbookCount : undefined} />
      )}

      <AtMaturity
        scheme={scheme}
        schemeIsGold={schemeIsGold}
        maturityBenefit={maturityBenefit}
        redemptionEligible={redemptionEligible}
        redemptionBlocker={redemptionBlocker}
        redemptionModes={redemptionModes}
        onRedeem={onRedeem}
        note={
          mode === "FIXED"
            ? scheme.helperText
            : mode === "FLEXIBLE_LOCK_WINDOW"
              ? "Final-cycle payments may be lower than your monthly cap so the scheme can close exactly at maturity balance."
              : null
        }
      />

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { key: "passbook", label: "Passbook", icon: BookOpen, onClick: () => setSheet("passbook"), show: true },
          { key: "download", label: "Download", icon: Download, onClick: () => downloadPassbookCsv(scheme, passbookRows, payments), show: canDownload },
          { key: "rules", label: "Plan rules", icon: ScrollText, onClick: () => setSheet("rules"), show: true },
        ]
          .filter((a) => a.show)
          .map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={a.onClick}
              className="flex flex-col items-center gap-1.5 rounded-[14px] border border-[var(--ck-line)] bg-white py-3 text-xs font-semibold text-[var(--ck-ink-2)]"
            >
              <a.icon className="size-5" style={{ color: PRIMARY }} strokeWidth={1.8} />
              {a.label}
            </button>
          ))}
      </div>

      <Dialog open={sheet === "passbook"} onOpenChange={(o) => setSheet(o ? "passbook" : null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Passbook</DialogTitle>
            <DialogDescription>
              {scheme.planName} · {scheme.schemeNumber.replace(/^Scheme\s+/i, "")}
            </DialogDescription>
          </DialogHeader>
          {passbookRows ? <AuthoritativePassbookList rows={passbookRows} /> : <PassbookList payments={payments} onDownloadReceipt={onDownloadReceipt} />}
        </DialogContent>
      </Dialog>
      <Dialog open={sheet === "rules"} onOpenChange={(o) => setSheet(o ? "rules" : null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-4" />
              Plan rules
            </DialogTitle>
            <DialogDescription>{scheme.planName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {planRuleSections.length ? (
              planRuleSections.map((section) => <RulesBlock key={section.title} section={section} />)
            ) : (
              <p className="text-sm text-[var(--ck-muted)]">Paid contributions never expire and stay in your ledger. Payment limits follow your current plan phase.</p>
            )}
            {scheme.payableRange ? <CustomerPayableSummary range={scheme.payableRange} displayMode={scheme.displayMode} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
