"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Gem,
  IndianRupee,
  Layers3,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CustomerDisplayMode,
  CustomerPastScheme,
  CustomerSchemeDetail,
  SchemeCard,
  WeightRef,
} from "@/src/types/customer";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useGetPublicCustomerUploadDownloadQuery } from "@/src/store/api/customer-api";

function uploadIdFromPath(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/\/uploads\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function CustomerBrand({ compact = false }: { compact?: boolean }) {
  const { tenant } = useCustomerTenant();
  const logoUploadId = uploadIdFromPath(tenant?.logoUrl);
  const { data: logoDownload, isError: logoFailed } = useGetPublicCustomerUploadDownloadQuery(
    logoUploadId as string,
    { skip: !logoUploadId },
  );
  // Prefer the public-download presign. Never hit /uploads/:id directly — that route is not public.
  const logoSrc =
    logoDownload?.downloadUrl
    ?? (tenant?.logoUrl && /^https?:\/\//i.test(tenant.logoUrl) ? tenant.logoUrl : null);
  const title = tenant?.appDisplayName ?? tenant?.displayName ?? "Kairali Gold Savings";
  const initial = title.slice(0, 1).toUpperCase();
  const showInitial = !logoSrc && (!logoUploadId || logoFailed);

  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      {logoSrc ? (
        <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
          <Image src={logoSrc} alt="" fill sizes="44px" unoptimized className="object-contain p-1" />
        </span>
      ) : showInitial ? (
        <span
          className="relative grid size-11 shrink-0 place-items-center rounded-xl text-lg font-extrabold text-white"
          style={{ background: "var(--customer-primary, #730321)" }}
        >
          {initial}
        </span>
      ) : (
        <span
          className="size-11 shrink-0 animate-pulse rounded-xl"
          style={{ background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.12)" }}
        />
      )}
      {!compact ? (
        <span className="min-w-0 leading-none">
          <b
            className="block truncate text-[1.05rem] font-black tracking-tight sm:text-[1.22rem]"
            style={{ color: "var(--customer-primary, #730321)" }}
          >
            {title}
          </b>
          <small className="mt-0.5 block truncate text-[0.68rem] font-medium text-[#8a8490] sm:text-[0.72rem]">
            Powered by SwarnaGrow
          </small>
        </span>
      ) : null}
    </span>
  );
}

export function CustomerPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1.5 text-[0.72rem] font-extrabold uppercase tracking-[.18em] text-[var(--customer-accent,#9a6c17)]">{eyebrow}</p> : null}
        <h1 className="text-[1.8rem] font-black tracking-[-.035em] text-[#171722] sm:text-[2.15rem]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#706b77] sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function CustomerSectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-[0.7rem] font-extrabold uppercase tracking-[.17em] text-[var(--customer-accent,#976814)]">{eyebrow}</p> : null}
        <h2 className="mt-0.5 text-[1.45rem] font-black tracking-[-.025em] text-[#171722]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function normalizeDisplayMode(mode: CustomerDisplayMode): CustomerDisplayMode {
  return mode === "FLEXIBLE_CAPPED_WINDOW" ? "FLEXIBLE_LOCK_WINDOW" : mode;
}

export function SchemeModePill({ mode }: { mode: SchemeCard["displayMode"] }) {
  const normalized = normalizeDisplayMode(mode);
  const map: Record<CustomerDisplayMode, string> = {
    FIXED: "Fixed",
    FLEXIBLE_FREE_WINDOW: "Flexible · Free phase",
    FLEXIBLE_LOCK_WINDOW: "Flexible · Capped",
    FLEXIBLE_CAPPED_WINDOW: "Flexible · Capped",
  };
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[0.68rem] font-extrabold",
        normalized === "FIXED" ? "bg-[#f6edf0]" : "bg-[#fff2cf]",
      )}
      style={{
        color:
          normalized === "FIXED"
            ? "var(--customer-primary, #730321)"
            : "var(--customer-accent, #805b14)",
      }}
    >
      {map[normalized] ?? mode}
    </span>
  );
}

export function formatCustomerDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso.includes("T") ? iso : `${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function progressWidth(percent: number) {
  return `${Math.min(100, Math.max(0, Math.round(percent)))}%`;
}

function homeSchemeBadge(mode: SchemeCard["displayMode"]) {
  const normalized = normalizeDisplayMode(mode);
  if (normalized === "FIXED") {
    return { label: "FIXED", filled: true as const, className: "bg-[#f6edf0]", color: "var(--customer-primary, #730321)" };
  }
  if (normalized === "FLEXIBLE_LOCK_WINDOW") {
    return { label: "FLEXIBLE · LOCKED", filled: false as const, className: "bg-[#fff2cf]", color: "var(--customer-accent, #805b14)" };
  }
  return { label: "FLEXIBLE", filled: false as const, className: "bg-[#fff2cf]", color: "var(--customer-accent, #805b14)" };
}

function dueDateFromScheme(scheme: SchemeCard) {
  const label = scheme.nextActionLabel ?? "";
  const split = label.split("·").pop()?.trim();
  if (split && /\d/.test(split)) return split;
  return formatCustomerDate(scheme.maturityDate);
}

export function CustomerHomeSchemeCard({
  scheme,
  paymentsEnabled,
}: {
  scheme: SchemeCard;
  paymentsEnabled: boolean;
}) {
  const { tenantSlug } = useCustomerTenant();
  const href = customerPath(tenantSlug, "schemes", scheme.id);
  const normalized = normalizeDisplayMode(scheme.displayMode);
  const isFixed = normalized === "FIXED";
  const isCapped = normalized === "FLEXIBLE_LOCK_WINDOW";
  const badge = homeSchemeBadge(scheme.displayMode);
  const detail = "progressCard" in scheme ? (scheme as CustomerSchemeDetail) : null;
  const cap = detail?.progressCard.cycleCap ?? scheme.cycleCap;
  const remaining = detail?.progressCard.remainingThisCycle ?? scheme.remainingThisCycle;
  const paid = scheme.totalPaid ?? { amountPaise: 0, amountDisplay: "₹0" };
  const progressPercent = Math.min(100, Math.max(0, scheme.progressPercent ?? 0));
  const payLabel = isFixed
    ? "Pay now"
    : paymentsEnabled && scheme.canPay
      ? "Add payment"
      : "View scheme";
  const barColor = isCapped ? "var(--customer-accent, #c9a227)" : "var(--customer-primary, #730321)";

  const showPayCta = paymentsEnabled && scheme.canPay;

  const payCta = showPayCta ? (
    <Link
      href={href}
      className="inline-flex h-8 min-w-[5.25rem] items-center justify-center rounded-full px-3.5 text-[0.6875rem] font-bold text-white shadow-[0_4px_12px_rgba(var(--customer-primary-rgb,115,3,33),0.22)]"
      style={{ background: "var(--customer-primary, #730321)" }}
    >
      {payLabel}
    </Link>
  ) : (
    <Link
      href={href}
      className="inline-flex h-9 items-center justify-center rounded-full border px-4 text-xs font-bold text-[var(--customer-primary,#730321)]"
      style={{ borderColor: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.28)" }}
    >
      View
    </Link>
  );

  const dueBlock =
    isFixed && scheme.nextActionAmount ? (
      <>
        <p className="text-sm font-black leading-tight text-[#171722]">
          {scheme.nextActionAmount.amountDisplay} due
        </p>
        <p className="mt-0.5 text-xs text-[#77727c]">{dueDateFromScheme(scheme)}</p>
      </>
    ) : (
      <>
        <p className="text-xs font-semibold text-[#77727c]">Maturity</p>
        <p className="mt-0.5 text-sm font-black text-[#171722]">{formatCustomerDate(scheme.maturityDate)}</p>
      </>
    );

  return (
    <article className="overflow-hidden rounded-2xl border border-[#f0ebe6] bg-white p-4 shadow-[0_8px_26px_rgba(var(--customer-primary-rgb,115,3,33),0.07)] sm:p-[1.15rem]">
      <span
        className={cn(
          "inline-flex rounded-full px-2.5 py-0.5 text-[0.62rem] font-extrabold tracking-[0.08em]",
          badge.className,
        )}
        style={{ color: badge.color }}
      >
        {badge.label}
      </span>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
        <div className="min-w-0">
          <Link href={href} className="block truncate text-[0.9375rem] font-black leading-snug text-[#171722]">
            {scheme.planName}
          </Link>
          <p className="mt-0.5 truncate text-xs text-[#77727c]">Scheme {scheme.schemeNumber}</p>
        </div>
        <div className="shrink-0 text-right">{dueBlock}</div>
      </div>

      {isCapped && cap ? (
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#fcfaf6] px-3 py-3 text-center">
          <div>
            <p className="text-[0.65rem] font-semibold text-[#77727c]">Cap</p>
            <p className="mt-0.5 text-xs font-black">{cap.amountDisplay}</p>
          </div>
          <div className="border-x border-[#ebe4dc]">
            <p className="text-[0.65rem] font-semibold text-[#77727c]">Paid</p>
            <p className="mt-0.5 text-xs font-black">{paid.amountDisplay}</p>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold text-[#77727c]">Remaining</p>
            <p className="mt-0.5 text-xs font-black">{remaining?.amountDisplay ?? "—"}</p>
          </div>
        </div>
      ) : null}

      <div className={cn(isCapped && cap ? "mt-3" : "mt-3.5")}>
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#ebebeb]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: progressWidth(progressPercent), background: barColor }}
            />
          </div>
          <div className="shrink-0">{payCta}</div>
        </div>
        <p className="mt-1.5 text-xs font-semibold text-[#706b77]">{scheme.progressLabel}</p>
      </div>
    </article>
  );
}

const schemeListCardClass =
  "block rounded-2xl border border-[#e8e2dc] bg-white p-4 shadow-[0_4px_16px_rgba(var(--customer-primary-rgb,115,3,33),0.05)] sm:p-[1.15rem]";

function displaySchemeNumber(schemeNumber: string) {
  return schemeNumber.replace(/^Scheme\s+/i, "").trim();
}

function schemeListBadges(mode: SchemeCard["displayMode"]) {
  const normalized = normalizeDisplayMode(mode);
  if (normalized === "FIXED") {
    return [{ key: "fixed", label: "FIXED", className: "bg-[#f6edf0]", color: "var(--customer-primary, #730321)" }];
  }
  const badges = [{ key: "flex", label: "FLEXIBLE", className: "bg-[#fff2cf]", color: "#6b4e32" }];
  if (normalized === "FLEXIBLE_LOCK_WINDOW") {
    badges.push({ key: "locked", label: "LOCKED", className: "bg-[#fff2cf]", color: "#6b4e32" });
  }
  return badges;
}

function pastClosureLabel(closureType: string) {
  const value = closureType.trim().toUpperCase();
  if (value.includes("REDEEM")) return "REDEEMED";
  if (value.includes("MATUR")) return "MATURED";
  if (value.includes("CLOSE")) return "CLOSED";
  return value.replace(/_/g, " ");
}

export function CustomerSchemesActiveCard({ scheme }: { scheme: SchemeCard }) {
  const { tenantSlug } = useCustomerTenant();
  const href = customerPath(tenantSlug, "schemes", scheme.id);
  const normalized = normalizeDisplayMode(scheme.displayMode);
  const isFixed = normalized === "FIXED";
  const isLocked = normalized === "FLEXIBLE_LOCK_WINDOW";
  const badges = schemeListBadges(scheme.displayMode);
  const detail = "progressCard" in scheme ? (scheme as CustomerSchemeDetail) : null;
  const cap = detail?.progressCard.cycleCap ?? scheme.cycleCap;
  const remaining = detail?.progressCard.remainingThisCycle ?? scheme.remainingThisCycle;
  const paidTotal = scheme.totalPaid?.amountDisplay ?? "₹0";
  const progressPercent = Math.min(100, Math.max(0, scheme.progressPercent ?? 0));
  const barColor = isLocked ? "var(--customer-accent, #c9a227)" : "var(--customer-primary, #730321)";

  const footerLabel = isFixed ? "Next due" : "Maturity date";
  const footerValue = isFixed
    ? scheme.nextActionAmount
      ? `${scheme.nextActionAmount.amountDisplay} · ${dueDateFromScheme(scheme)}`
      : dueDateFromScheme(scheme)
    : formatCustomerDate(scheme.maturityDate);

  const capPaise = cap?.amountPaise ?? 0;
  const remainingPaise = remaining?.amountPaise ?? 0;
  const paidInCycle =
    cap && remaining
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
          Math.max(0, capPaise - remainingPaise) / 100,
        )
      : "—";

  return (
    <Link href={href} className={schemeListCardClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.key}
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-[0.62rem] font-extrabold tracking-[0.06em]",
                badge.className,
              )}
              style={{ color: badge.color }}
            >
              {badge.label}
            </span>
          ))}
        </div>
        <ChevronRight className="size-[1.15rem] shrink-0 text-[var(--customer-primary,#730321)]" strokeWidth={2.5} />
      </div>

      <div className="mt-2.5 min-w-0">
        <h3 className="truncate text-[1.0625rem] font-black leading-snug text-[#171722]">{scheme.planName}</h3>
        <p className="mt-0.5 truncate text-xs font-medium text-[#77727c]">{displaySchemeNumber(scheme.schemeNumber)}</p>
      </div>

      <p className="mt-3.5 text-[1.375rem] font-black tracking-tight text-[#171722]">
        {paidTotal}
        <span className="ml-1.5 text-[0.9375rem] font-semibold text-[#77727c]">paid</span>
      </p>

      {isLocked && cap ? (
        <div className="mt-3.5 grid grid-cols-3 gap-1 rounded-xl bg-[#fcfaf6] px-2 py-3 text-center">
          <div>
            <p className="text-[0.65rem] font-semibold text-[#77727c]">Cap</p>
            <p className="mt-0.5 text-xs font-black text-[#171722]">{cap.amountDisplay}</p>
          </div>
          <div className="border-x border-[#ebe4dc]">
            <p className="text-[0.65rem] font-semibold text-[#77727c]">Paid</p>
            <p className="mt-0.5 text-xs font-black text-[#171722]">{paidInCycle}</p>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold text-[#77727c]">Left</p>
            <p className="mt-0.5 text-xs font-black text-[#171722]">{remaining?.amountDisplay ?? "—"}</p>
          </div>
        </div>
      ) : (
        <div className="mt-3.5">
          <div className="h-2.5 overflow-hidden rounded-full bg-[#ebebeb]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: progressWidth(progressPercent), background: barColor }}
            />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-[#706b77]">{scheme.progressLabel}</p>
        </div>
      )}

      <div className="mt-4 flex items-stretch gap-3 border-t border-[#ece6e0] pt-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold text-[#77727c]">{footerLabel}</p>
          <p className="mt-0.5 text-sm font-bold leading-snug text-[#171722]">{footerValue}</p>
        </div>
        <div className="w-px shrink-0 self-stretch bg-[#ece6e0]" aria-hidden />
        <span className="inline-flex shrink-0 items-center gap-0.5 self-center text-sm font-bold text-[var(--customer-primary,#730321)]">
          View scheme
          <ChevronRight className="size-4" strokeWidth={2.5} />
        </span>
      </div>
    </Link>
  );
}

export function CustomerSchemesPastCard({ scheme }: { scheme: CustomerPastScheme }) {
  const { tenantSlug } = useCustomerTenant();
  const href = customerPath(tenantSlug, "schemes", scheme.id);
  const badge = pastClosureLabel(scheme.closureType);

  return (
    <Link href={href} className={schemeListCardClass}>
      <span className="inline-flex rounded-full bg-[#f0ece8] px-2.5 py-0.5 text-[0.62rem] font-extrabold tracking-[0.06em] text-[#6f6b78]">
        {badge}
      </span>
      <div className="mt-2.5 min-w-0">
        <h3 className="truncate text-base font-black text-[#171722]">{scheme.planName}</h3>
        <p className="mt-0.5 truncate text-xs font-medium text-[#77727c]">{displaySchemeNumber(scheme.schemeNumber)}</p>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="text-[0.65rem] font-semibold text-[#77727c]">Final value</p>
          <p className="mt-1 text-xs font-black text-[#171722] sm:text-sm">{scheme.finalValue.amountDisplay}</p>
        </div>
        <div className="border-x border-[#ebe4dc]">
          <p className="text-[0.65rem] font-semibold text-[#77727c]">Benefit</p>
          <p className="mt-1 text-xs font-black text-[#171722] sm:text-sm">{scheme.benefitReceived.amountDisplay}</p>
        </div>
        <div>
          <p className="text-[0.65rem] font-semibold text-[#77727c]">Closed on</p>
          <p className="mt-1 text-xs font-black text-[#171722] sm:text-sm">{formatCustomerDate(scheme.closedAt)}</p>
        </div>
      </div>
    </Link>
  );
}

function findGoldBalance(scheme: SchemeCard): WeightRef | undefined {
  if (scheme.goldAccumulated) return scheme.goldAccumulated;
  if (scheme.goldAccrued) return scheme.goldAccrued;
  if ("progressCard" in scheme) {
    const detail = scheme as CustomerSchemeDetail;
    if (detail.progressCard.goldAccumulated) return detail.progressCard.goldAccumulated;
    if (detail.progressCard.goldAccrued) return detail.progressCard.goldAccrued;
    const goldStat = detail.statCards?.find((card) => /gold (balance|saved|accumulated|accrued)/i.test(card.label));
    if (goldStat) return { weightMg: 0, weightDisplay: goldStat.value };
  }
  return undefined;
}

function FlexiblePhaseBar({ scheme }: { scheme: SchemeCard }) {
  const detail = "progressCard" in scheme ? (scheme as CustomerSchemeDetail) : null;
  const current = detail?.progressCard.freeWindowMonth ?? scheme.freeWindowMonth;
  const total = detail?.progressCard.freeWindowMonths ?? scheme.freeWindowMonths;
  if (!current || !total) {
    return (
      <div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e9e7eb]"><div className="h-full rounded-full bg-[#8a062a]" style={{ width: progressWidth(scheme.progressPercent ?? 0) }} /></div>
        <p className="mt-2 text-xs font-bold text-[var(--customer-primary,#730321)]">{Math.round(scheme.progressPercent ?? 0)}% through this phase</p>
      </div>
    );
  }
  const completed = detail?.progressCard.freeWindowMonthsCompleted ?? Math.max(0, current - 1);
  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }).map((_, index) => <span key={index} className={cn("h-2.5 rounded-full", index < completed ? "bg-[var(--customer-primary,#8a062a)]" : index === completed ? "bg-[rgba(var(--customer-primary-rgb,115,3,33),0.45)]" : "bg-[#e8e7eb]")} />)}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[0.72rem]"><b className="text-[var(--customer-primary,#730321)]">Month {current} of {total}</b><span className="text-[#77727c]">{Math.max(0, total - current)} months left</span></div>
    </div>
  );
}

export function CustomerSchemeCard({ scheme, featured = false, className }: { scheme: SchemeCard; featured?: boolean; className?: string }) {
  const { tenantSlug } = useCustomerTenant();
  const totalPaid = scheme.totalPaid ?? { amountPaise: 0, amountDisplay: "₹0" };
  const progressPercent = Math.min(100, Math.max(0, scheme.progressPercent ?? 0));
  const href = customerPath(tenantSlug, "schemes", scheme.id);
  const normalized = normalizeDisplayMode(scheme.displayMode);
  const isFree = normalized === "FLEXIBLE_FREE_WINDOW";
  const isCapped = normalized === "FLEXIBLE_LOCK_WINDOW";
  const isGold = scheme.valueBasis === "GOLD_WEIGHT";
  const goldBalance = findGoldBalance(scheme);
  const detail = "progressCard" in scheme ? (scheme as CustomerSchemeDetail) : null;
  const remaining = detail?.progressCard.remainingThisCycle ?? scheme.remainingThisCycle ?? scheme.nextActionAmount;
  const cap = detail?.progressCard.cycleCap ?? scheme.cycleCap;

  return (
    <article className={cn("customer-surface group relative flex min-w-0 flex-col overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(75,31,42,.09)] sm:p-6", featured && "border-[#d9c17e]", className)}>
      {featured ? <div className="absolute inset-x-0 top-0 h-1 bg-[#c99524]" /> : null}
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-[0.73rem] font-semibold text-[#77727c]">{scheme.schemeNumber}</p><h3 className="mt-2 truncate text-xl font-black tracking-[-.025em] text-[#171722]">{scheme.planName}</h3>{scheme.subtitle ? <p className="mt-0.5 line-clamp-1 text-xs text-[#77727c]">{scheme.subtitle}</p> : null}</div>
        <div className="flex shrink-0 flex-col items-end gap-2"><span className="rounded-full bg-[#eaf9ef] px-3 py-1 text-[0.68rem] font-extrabold text-[#15934b]">{scheme.statusLabel ?? scheme.status}</span><SchemeModePill mode={scheme.displayMode} /></div>
      </div>

      <div className="mt-5">
        {isGold && goldBalance ? (
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[#eee4d7] bg-[#fcfaf6] p-4">
            <div><p className="text-[0.7rem] font-semibold text-[#77727c]">Gold balance</p><p className="mt-1 text-[1.7rem] font-black tracking-tight text-[var(--customer-accent,#8b5f08)]">{goldBalance.weightDisplay}</p></div>
            <div className="border-l border-[#e5ddd7] pl-4"><p className="text-[0.7rem] font-semibold text-[#77727c]">Contributed</p><p className="mt-1 text-xl font-black text-[var(--customer-accent,#8b5f08)]">{totalPaid.amountDisplay}</p></div>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-3"><div><p className="text-[0.72rem] font-semibold text-[#77727c]">Saved so far</p><p className="mt-0.5 text-[1.8rem] font-black tracking-tight text-[var(--customer-accent,#8b5f08)]">{totalPaid.amountDisplay}</p></div><div className="text-right"><p className="text-sm font-black text-[#171722]">{scheme.progressLabel}</p>{scheme.progressDetail ? <p className="mt-0.5 line-clamp-1 text-[0.7rem] text-[#77727c]">{scheme.progressDetail}</p> : null}</div></div>
        )}
      </div>

      <div className="mt-5">
        {isFree ? <FlexiblePhaseBar scheme={scheme} /> : <><div className="h-2 overflow-hidden rounded-full bg-[#e8e7eb]"><div className="h-full rounded-full bg-[var(--customer-primary,#8a062a)] transition-[width] duration-500" style={{ width: progressWidth(progressPercent) }} /></div><div className="mt-2 flex items-center justify-between gap-3 text-[0.72rem]"><b className="text-[var(--customer-primary,#730321)]">{Math.round(progressPercent)}% complete</b><span className="inline-flex items-center gap-1 text-[#77727c]"><CalendarDays className="size-3.5 text-[var(--customer-accent,#a47316)]" />{formatCustomerDate(scheme.maturityDate)}</span></div></>}
      </div>

      {isCapped && (remaining || cap) ? <div className="mt-4 flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-xs" style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.14)" }}><span className="font-semibold text-[var(--customer-accent,#725719)]">Monthly contribution limit</span><b className="text-[var(--customer-accent,#5f4812)]">{remaining?.amountDisplay ?? cap?.amountDisplay} available</b></div> : null}
      {isFree ? <p className="mt-4 rounded-xl px-3.5 py-3 text-xs leading-5 text-[var(--customer-accent,#725719)]" style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.14)" }}>Contributions are optional. Your paid balance always stays; unused monthly allowance does not carry forward.</p> : null}

      <div className="mt-auto flex items-center gap-3 pt-5">
        <span className="inline-flex min-w-0 flex-1 items-center gap-2 text-xs text-[#77727c]"><CalendarDays className="size-4 shrink-0 text-[var(--customer-accent,#a47316)]" />Matures <b className="truncate text-[#292732]">{formatCustomerDate(scheme.maturityDate)}</b></span>
        <Button
          asChild
          className="h-10 shrink-0 rounded-xl px-5 font-bold text-white"
          style={{ background: "var(--customer-primary, #730321)" }}
        >
          <Link href={href}>{scheme.canPay ? (isFree || isCapped ? "View & contribute" : "View & pay") : "View"}<ArrowRight className="ml-1 size-4" /></Link>
        </Button>
      </div>
    </article>
  );
}

export function SchemeProgressRing({ percent, className }: { percent: number; size?: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return <div className={cn("min-w-28", className)}><div className="h-2 overflow-hidden rounded-full bg-[#e8e7eb]"><div className="h-full rounded-full bg-[var(--customer-primary,#8a062a)]" style={{ width: `${clamped}%` }} /></div><p className="mt-1 text-right text-xs font-black text-[var(--customer-primary,#730321)]">{clamped}%</p></div>;
}

export function SchemeProgressVisual({ scheme }: { scheme: CustomerSchemeDetail }) {
  if (scheme.displayMode === "FIXED") {
    const paid = scheme.progressCard.installmentsPaid ?? 0;
    const total = scheme.progressCard.installmentsTotal ?? 0;
    return <div><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(total || 1, 12)}, minmax(0, 1fr))` }}>{Array.from({ length: total }).map((_, index) => <div key={index} className={cn("grid aspect-square place-items-center rounded-lg border text-[0.7rem] font-bold", index < paid ? "border-[#730321] bg-[#730321] text-white" : "border-[#e5ddd7] bg-[#faf7f4] text-[#88828b]")}>{index < paid ? <Check className="size-3.5" /> : index + 1}</div>)}</div><p className="mt-3 text-sm text-[#706b77]">{paid} instalments completed · {Math.max(0, total - paid)} remaining</p></div>;
  }
  const mode = normalizeDisplayMode(scheme.displayMode);
  if (mode === "FLEXIBLE_FREE_WINDOW") return <FlexiblePhaseBar scheme={scheme} />;
  const cap = scheme.progressCard.cycleCap?.amountPaise ?? 0;
  const remaining = scheme.progressCard.remainingThisCycle?.amountPaise ?? 0;
  const used = cap ? Math.max(0, Math.min(100, Math.round(((cap - remaining) / cap) * 100))) : 0;
  return <div><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-[#77727c]">Available this cycle</p><p className="mt-1 text-2xl font-black text-[#8b5f08]">{scheme.progressCard.remainingThisCycle?.amountDisplay ?? "—"}</p></div><div className="text-right"><p className="text-xs text-[#77727c]">Monthly cap</p><p className="mt-1 font-black">{scheme.progressCard.cycleCap?.amountDisplay ?? "—"}</p></div></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e8e7eb]"><div className="h-full rounded-full bg-[#8a062a]" style={{ width: `${used}%` }} /></div><div className="mt-2 flex justify-between text-xs text-[#77727c]"><span>{used}% used</span><span>Resets next cycle</span></div><p className="mt-4 rounded-xl bg-[#fff6de] p-3 text-xs leading-5 text-[#725719]">This is an optional maximum, not an amount owed. Paid money remains permanently in your ledger.</p></div>;
}

export const quickActionIcons = { PAY: IndianRupee, ENROL: Sparkles, PASSBOOK: WalletCards };
export const summaryIcons = [Layers3, Gem, ShieldCheck, CalendarDays, Clock3];
