"use client";

import Link from "next/link";
import { COLLECTION_FREQUENCY_LABELS } from "@/src/types/collection";
import { CalendarDays, ChevronRight, CircleCheck, Info, Sparkles } from "lucide-react";
import type { CustomerDisplayMode, CustomerPastScheme, CustomerSchemeDetail, SchemeCard } from "@/src/types/customer";
import { SchemeShopBalanceLine } from "@/src/components/scheme-shop-balance";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { CkBadge, CkBar, CkCard, CkIcon, CkSegments } from "@/src/components/customer/customer-kit";

export function ckFormatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso.includes("T") ? iso : `${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeMode(mode: CustomerDisplayMode): CustomerDisplayMode {
  return mode === "FLEXIBLE_CAPPED_WINDOW" ? "FLEXIBLE_LOCK_WINDOW" : mode;
}

/** "8 of 12 instalments" → { done: 8, total: 12 } */
export function parseOfCount(label?: string | null): { done: number; total: number } | null {
  const m = /(\d+)\s*of\s*(\d+)/i.exec(label ?? "");
  if (!m) return null;
  const done = Number(m[1]);
  const total = Number(m[2]);
  return total > 0 ? { done, total } : null;
}

function goldBalance(scheme: SchemeCard) {
  return scheme.goldAccumulated ?? scheme.goldAccrued;
}

function dueDate(scheme: SchemeCard) {
  const split = (scheme.nextActionLabel ?? "").split("·").pop()?.trim();
  return split && /\d/.test(split) ? split : null;
}

export function schemeTypeBadges(scheme: SchemeCard) {
  const mode = normalizeMode(scheme.displayMode);
  const isGold = scheme.valueBasis === "GOLD_WEIGHT";
  if (mode === "FIXED") {
    if (scheme.oneTimeRules) return [{ key: "type", label: "One-time gold", tone: "gold" as const }];
    if (scheme.collectionFrequency) return [{ key: "frequency", label: `${COLLECTION_FREQUENCY_LABELS[scheme.collectionFrequency]} collection`, tone: "gold" as const, dot: false }];
    return isGold
      ? [{ key: "type", label: "Gold weight", tone: "gold" as const }]
      : [{ key: "type", label: "Fixed", tone: "brand" as const }];
  }
  const out: { key: string; label: string; tone: "blue" | "ok" | "warn" | "gold" | "brand"; dot?: boolean }[] = [
    { key: "type", label: isGold ? "Gold weight" : "Flexible", tone: isGold ? "gold" : "blue" },
  ];
  if (mode === "FLEXIBLE_FREE_WINDOW") out.push({ key: "phase", label: "Free window", tone: "ok", dot: true });
  if (mode === "FLEXIBLE_LOCK_WINDOW") out.push({ key: "phase", label: "Capped phase", tone: "warn", dot: true });
  return out;
}

function cappedNumbers(scheme: SchemeCard) {
  const detail = "progressCard" in scheme ? (scheme as CustomerSchemeDetail) : null;
  const cap = detail?.progressCard.cycleCap ?? scheme.cycleCap;
  const remaining = detail?.progressCard.remainingThisCycle ?? scheme.remainingThisCycle;
  const paidPaise = cap && remaining ? Math.max(0, cap.amountPaise - remaining.amountPaise) : null;
  const paid =
    paidPaise == null
      ? null
      : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paidPaise / 100);
  const pct = cap && cap.amountPaise > 0 && paidPaise != null ? (paidPaise / cap.amountPaise) * 100 : 0;
  return { cap, remaining, paid, pct };
}

/** Month chips for the free window (M1…Mn). */
function FreeWindowMonths({ current, total, completed }: { current: number; total: number; completed: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n <= completed;
        const now = n === current && !done;
        return (
          <span
            key={n}
            className="grid h-[1.4rem] flex-1 place-items-center rounded-md text-[0.6rem] font-semibold"
            style={
              done
                ? { background: "var(--ck-blue)", color: "#fff" }
                : now
                  ? { background: "#fff", color: "var(--ck-blue)", boxShadow: "inset 0 0 0 1.5px var(--ck-blue)" }
                  : { background: "var(--ck-track)", color: "var(--ck-muted)" }
            }
          >
            M{n}
          </span>
        );
      })}
    </div>
  );
}

/** Progress visual that matches the scheme type. */
export function SchemeTypeProgress({ scheme }: { scheme: SchemeCard }) {
  const mode = normalizeMode(scheme.displayMode);
  if (mode === "FLEXIBLE_FREE_WINDOW") {
    const detail = "progressCard" in scheme ? (scheme as CustomerSchemeDetail) : null;
    const current = detail?.progressCard.freeWindowMonth ?? scheme.freeWindowMonth;
    const total = detail?.progressCard.freeWindowMonths ?? scheme.freeWindowMonths;
    if (current && total) {
      const completed = detail?.progressCard.freeWindowMonthsCompleted ?? Math.max(0, current - 1);
      return <FreeWindowMonths current={current} total={total} completed={completed} />;
    }
    return <CkBar percent={scheme.progressPercent ?? 0} color="var(--ck-blue)" />;
  }
  if (mode === "FLEXIBLE_LOCK_WINDOW") {
    const { pct } = cappedNumbers(scheme);
    return <CkBar percent={pct} />;
  }
  const count = parseOfCount(scheme.progressLabel);
  if (count && count.total <= 36) {
    return <CkSegments total={count.total} filled={count.done} due={scheme.canPay ? count.done + 1 : null} />;
  }
  return <CkBar percent={scheme.progressPercent ?? 0} />;
}

function homeCardLeft(scheme: SchemeCard, cappedLeft?: string) {
  if (cappedLeft) return `${cappedLeft} left`;
  const mode = normalizeMode(scheme.displayMode);
  if (mode === "FLEXIBLE_FREE_WINDOW") {
    const m = scheme.freeWindowMonth;
    const t = scheme.freeWindowMonths;
    return m && t ? `Month ${m} of ${t}` : scheme.progressLabel;
  }
  const count = parseOfCount(scheme.progressLabel);
  if (!count || scheme.oneTimeRules || scheme.collectionFrequency) return scheme.progressLabel;
  return scheme.valueBasis === "GOLD_WEIGHT" ? `${count.done} of ${count.total} months` : `${count.done} of ${count.total} paid`;
}

/** Compact card for the home screen carousel. */
export function CustomerHomeSchemeCard({ scheme }: { scheme: SchemeCard; paymentsEnabled?: boolean }) {
  const { tenantSlug } = useCustomerTenant();
  const href = customerPath(tenantSlug, "schemes", scheme.id);
  const badges = schemeTypeBadges(scheme);
  const gold = scheme.valueBasis === "GOLD_WEIGHT" ? goldBalance(scheme) : undefined;
  const mode = normalizeMode(scheme.displayMode);
  const capped = mode === "FLEXIBLE_LOCK_WINDOW" ? cappedNumbers(scheme) : null;

  return (
    <Link href={href} className="block w-[15.5rem] shrink-0 snap-start">
      <CkCard className="flex h-full flex-col p-3.5">
        <div className="flex items-center justify-between gap-2">
          <CkBadge tone={badges[0].tone}>{badges[0].label}</CkBadge>
          <span className="truncate text-[0.7rem] text-[var(--ck-muted)]">{scheme.schemeNumber.replace(/^Scheme\s+/i, "")}</span>
        </div>
        <p className="mt-2.5 truncate text-[0.95rem] font-semibold text-[var(--ck-ink)]">{scheme.planName}</p>
        <p className="mt-2 text-[1.45rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--ck-ink)]">
          {gold?.weightDisplay ?? scheme.totalPaid?.amountDisplay ?? "₹0"}
        </p>
        <SchemeShopBalanceLine summary={scheme.shopBalanceSummary} className="mt-1.5" />
        <div className="mt-3">
          <SchemeTypeProgress scheme={scheme} />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2 text-[0.72rem] text-[var(--ck-muted)]">
          <span className="truncate">{homeCardLeft(scheme, capped?.remaining?.amountDisplay)}</span>
          <b className="shrink-0 font-semibold text-[var(--ck-ink)]">Matures {ckFormatDate(scheme.maturityDate)}</b>
        </div>
      </CkCard>
    </Link>
  );
}

/** Full card for the My schemes list. */
export function CustomerSchemesActiveCard({ scheme }: { scheme: SchemeCard }) {
  const { tenantSlug } = useCustomerTenant();
  const href = customerPath(tenantSlug, "schemes", scheme.id);
  const mode = normalizeMode(scheme.displayMode);
  const badges = schemeTypeBadges(scheme);
  const gold = scheme.valueBasis === "GOLD_WEIGHT" ? goldBalance(scheme) : undefined;
  const capped = mode === "FLEXIBLE_LOCK_WINDOW" ? cappedNumbers(scheme) : null;
  const due = dueDate(scheme);

  const headline = gold?.weightDisplay ?? scheme.totalPaid?.amountDisplay ?? "₹0";
  const side = scheme.oneTimeRules ? scheme.progressLabel : gold ? `${scheme.totalPaid?.amountDisplay ?? "₹0"} contributed` : scheme.progressLabel;

  let footIcon = CalendarDays;
  let foot: React.ReactNode = <>Matures <b className="font-semibold text-[var(--ck-ink)]">{ckFormatDate(scheme.maturityDate)}</b></>;
  if (scheme.nextActionAmount && due && (mode === "FIXED" || gold)) {
    foot = (
      <>
        Next <b className="font-semibold tabular-nums text-[var(--ck-ink)]">{scheme.nextActionAmount.amountDisplay}</b> due {due}
      </>
    );
  } else if (scheme.oneTimeRules && scheme.nextActionLabel) {
    foot = scheme.nextActionLabel;
  } else if (mode === "FLEXIBLE_FREE_WINDOW") {
    footIcon = Sparkles;
    foot = scheme.nextActionLabel || foot;
  } else if (capped) {
    footIcon = Info;
    foot = "A contribution limit, not an amount due";
  }
  const FootIcon = footIcon;

  return (
    <Link href={href} className="block">
      <CkCard as="article" className="p-4">
        <div className="flex items-center gap-1.5">
          {badges.map((b) => (
            <CkBadge key={b.key} tone={b.tone} dot={b.dot}>
              {b.label}
            </CkBadge>
          ))}
          <span className="ml-auto truncate text-[0.72rem] text-[var(--ck-muted)]">{scheme.schemeNumber.replace(/^Scheme\s+/i, "")}</span>
        </div>
        <h3 className="mt-2.5 truncate text-base font-semibold text-[var(--ck-ink)]">{scheme.planName}</h3>
        <div className="mb-2.5 mt-3 flex items-end justify-between gap-3">
          <p className="text-[1.6rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--ck-ink)]">{headline}</p>
          <p className="truncate text-right text-xs text-[var(--ck-muted)]">{side}</p>
        </div>
        <SchemeShopBalanceLine summary={scheme.shopBalanceSummary} className="mb-2" />
        <SchemeTypeProgress scheme={scheme} />
        {capped?.cap ? (
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {[
              ["Cycle cap", capped.cap.amountDisplay],
              ["Paid", capped.paid ?? "—"],
              ["Left", capped.remaining?.amountDisplay ?? "—"],
            ].map(([label, value], i) => (
              <div key={label} className="rounded-[10px] bg-[#f7f2ec] px-2.5 py-2">
                <p className="text-[0.66rem] text-[var(--ck-muted)]">{label}</p>
                <p className="text-[0.85rem] font-semibold tabular-nums" style={i === 2 ? { color: "var(--customer-primary, #5e1622)" } : undefined}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex items-center gap-2 border-t border-[var(--ck-line-soft)] pt-3 text-[0.8rem] text-[var(--ck-ink-2)]">
          <FootIcon className="size-4 shrink-0 text-[var(--ck-muted)]" />
          <span className="min-w-0 flex-1 truncate">{foot}</span>
          <ChevronRight className="size-4 shrink-0 text-[#ad9fa2]" />
        </div>
      </CkCard>
    </Link>
  );
}

function pastClosureLabel(closureType: string) {
  const value = closureType.trim().toUpperCase();
  if (value.includes("REDEEM")) return "Redeemed";
  if (value.includes("MATUR")) return "Matured";
  if (value.includes("CLOSE")) return "Closed";
  return value.replace(/_/g, " ").toLowerCase();
}

export function CustomerSchemesPastCard({ scheme }: { scheme: CustomerPastScheme }) {
  const { tenantSlug } = useCustomerTenant();
  const href = customerPath(tenantSlug, "schemes", scheme.id);
  return (
    <Link href={href} className="block">
      <CkCard className="flex items-center gap-3 p-3.5">
        <CkIcon icon={CircleCheck} tone="ok" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.92rem] font-semibold text-[var(--ck-ink)]">{scheme.planName}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--ck-muted)]">
            {scheme.schemeNumber.replace(/^Scheme\s+/i, "")} · {pastClosureLabel(scheme.closureType)} {ckFormatDate(scheme.closedAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold tabular-nums text-[var(--ck-ink)]">{scheme.finalValue.amountDisplay}</p>
          {scheme.benefitReceived.amountPaise > 0 ? (
            <p className="text-xs font-semibold tabular-nums text-[var(--ck-ok)]">+{scheme.benefitReceived.amountDisplay} benefit</p>
          ) : null}
        </div>
      </CkCard>
    </Link>
  );
}
