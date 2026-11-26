"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
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
  CustomerSchemeDetail,
  SchemeCard,
  WeightRef,
} from "@/src/types/customer";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { isDarkBrandColor } from "@/src/lib/customer-tenant-branding";
import { customerPath } from "@/src/lib/customer-tenant";
import { useGetPublicCustomerUploadDownloadQuery } from "@/src/store/api/customer-api";

function uploadIdFromPath(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/\/uploads\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function CustomerBrand({ compact = false, subtitle }: { compact?: boolean; subtitle?: string | null }) {
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
  const darkBrand = isDarkBrandColor(tenant?.primaryColor);

  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      {logoSrc ? (
        <span
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[11px] ring-1",
            darkBrand ? "bg-[var(--customer-primary,#0d0d0d)] ring-black/10" : "bg-white ring-black/8",
          )}
        >
          <Image
            src={logoSrc}
            alt=""
            width={128}
            height={128}
            unoptimized
            className="h-auto max-h-10 w-auto max-w-10 object-contain"
          />
        </span>
      ) : showInitial ? (
        <span
          className="relative grid size-10 shrink-0 place-items-center rounded-[10px] text-lg font-bold text-white"
          style={{ background: "var(--customer-primary, #730321)" }}
        >
          {initial}
        </span>
      ) : (
        <span
          className="size-10 shrink-0 animate-pulse rounded-[10px]"
          style={{ background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.12)" }}
        />
      )}
      {!compact ? (
        <span className="min-w-0 leading-none">
          <b
            className="block truncate text-[0.98rem] font-bold tracking-[-0.01em] text-[var(--ck-ink)] sm:text-[1.1rem]"
          >
            {title}
          </b>
          <small className="mt-1 block truncate text-[0.7rem] font-normal text-[var(--ck-muted)] sm:text-[0.72rem]">
            {subtitle?.trim() || "Powered by SwarnaGrow"}
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
        <h1 className="text-[1.65rem] font-bold tracking-[-.03em] text-[var(--ck-ink)] sm:text-[2rem]">{title}</h1>
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

export { CustomerHomeSchemeCard, CustomerSchemesActiveCard, CustomerSchemesPastCard } from "@/src/components/customer/customer-scheme-cards";

export function formatCustomerDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso.includes("T") ? iso : `${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function progressWidth(percent: number) {
  return `${Math.min(100, Math.max(0, Math.round(percent)))}%`;
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
