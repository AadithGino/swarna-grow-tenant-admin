"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  ChevronRight,
  Gift,
  IndianRupee,
  Layers3,
  MapPin,
  Scale,
  Shield,
  Smartphone,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/src/components/common/data-table";
import {
  ChartSeriesView,
  hasChartSeriesData,
} from "@/src/components/common/chart-series-view";
import { StatCard, Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import type { ChartSeriesBlock } from "@/src/types/admin-report";
import { PlanSchedulePreviewPanel } from "@/src/features/schemes/plan-preview-panel";
import type { PlanSchedulePreviewData } from "@/src/features/schemes/plan-preview-types";
import type { FieldEntry } from "@/src/features/schemes/plan-contract-fields";
import { cn } from "@/lib/utils";

/* ─── Shared primitives ─────────────────────────────────────────────── */

function YesNoBadge({ ok, yes = "Yes", no = "No" }: { ok: boolean; yes?: string; no?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        ok ? "bg-emerald-500/15 text-emerald-800" : "bg-[#f3eef0] text-[#776a6d]",
      )}
    >
      {ok ? <Check className="size-3" /> : <X className="size-3 opacity-60" />}
      {ok ? yes : no}
    </span>
  );
}

/* ─── Banner & alerts ─────────────────────────────────────────────── */

export function PlanDetailBanner({
  displayName,
  internalName,
  description,
  code,
  status,
  version,
  editLocked,
  pattern,
  valueBasis,
  amountLabel,
  benefitLabel,
  tenureMonths,
  installmentCount,
  activeSchemes,
  totalEnrolments,
  visibleInApp,
  selfEnrol,
}: {
  displayName: string;
  internalName: string;
  description: string;
  code: string;
  status: string;
  version: number;
  editLocked: boolean;
  pattern: string;
  valueBasis: string;
  amountLabel: string;
  benefitLabel: string;
  tenureMonths: number;
  installmentCount?: number;
  activeSchemes: number;
  totalEnrolments: number;
  visibleInApp: boolean;
  selfEnrol: boolean;
}) {
  const patternLabel = pattern.replace(/_/g, " ");
  const basisLabel = valueBasis.replace(/_/g, " ");
  const instalmentWord = pattern.includes("FLEXIBLE") ? "cycles" : "instalments";

  const stats = [
    {
      icon: IndianRupee,
      label: "Contributions",
      value: amountLabel,
      tone: "text-[#730321]",
      bg: "bg-[#f7ecee]",
    },
    {
      icon: Sparkles,
      label: "Benefit",
      value: benefitLabel,
      tone: "text-[#9a6f2a]",
      bg: "bg-[#fff8e8]",
    },
    {
      icon: CalendarClock,
      label: "Tenure",
      value: installmentCount == null ? `${tenureMonths} months` : `${tenureMonths} months · ${installmentCount} ${instalmentWord}`,
      tone: "text-[#2d191d]",
      bg: "bg-[#f3eef0]",
    },
    {
      icon: Layers3,
      label: "Live enrolments",
      value: `${activeSchemes.toLocaleString("en-IN")} active`,
      sub: `${totalEnrolments.toLocaleString("en-IN")} total`,
      tone: "text-emerald-800",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e4d7d2] bg-white shadow-[0_4px_24px_rgb(67_15_25/5%)]">
      <div className="relative bg-gradient-to-br from-[#730321] via-[#7a0b26] to-[#4a0214] px-6 py-7 text-white sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={status}
                className="border-white/30 bg-white/15 text-white"
              />
              {editLocked ? (
                <Badge className="border-amber-300/50 bg-amber-400/25 text-amber-50">
                  Rules locked · v{version}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                  v{version}
                </Badge>
              )}
              <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                {code}
              </Badge>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
              {displayName}
            </h1>
            {internalName !== displayName ? (
              <p className="mt-1 text-sm text-white/60">{internalName}</p>
            ) : null}
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-white/80">
              {description}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-xs lg:justify-end">
            {[patternLabel, basisLabel].map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-white/20 bg-white/10 text-white"
              >
                {tag}
              </Badge>
            ))}
            <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
              <Smartphone className="size-3" />
              {visibleInApp ? "In app" : "Hidden"}
            </Badge>
            <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
              {selfEnrol ? "Self-enrol" : "Staff only"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid divide-y divide-[#eaded9] border-t border-[#eaded9] bg-[#faf7f5] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, sub, tone, bg }) => (
          <div key={label} className="flex gap-3 px-5 py-4">
            <div
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl",
                bg,
                tone,
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className={cn("mt-0.5 text-sm font-bold leading-snug text-[#2d191d]", !sub && "sm:text-base")}>
                {value}
              </p>
              {sub ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PlanStatusAlert({
  variant,
  activeSchemes,
  onEditAvailability,
}: {
  variant: "locked" | "draft" | "active";
  activeSchemes?: number;
  onEditAvailability?: () => void;
}) {
  const styles = {
    locked: {
      border: "border-amber-200",
      bg: "bg-gradient-to-r from-[#fff8e8] to-[#fffdf6]",
      icon: "text-amber-800",
      title: "text-[#805817]",
      body: "text-[#5c4a2a]",
    },
    draft: {
      border: "border-[#eadbb5]",
      bg: "bg-gradient-to-r from-[#fff7df] to-[#fffdf6]",
      icon: "text-[#805817]",
      title: "text-[#805817]",
      body: "text-muted-foreground",
    },
    active: {
      border: "border-emerald-200",
      bg: "bg-gradient-to-r from-emerald-50 to-white",
      icon: "text-emerald-700",
      title: "text-emerald-900",
      body: "text-emerald-800/80",
    },
  }[variant];

  return (
    <div className={cn("flex gap-4 rounded-2xl border px-5 py-4", styles.border, styles.bg)}>
      <div className={cn("mt-0.5 shrink-0", styles.icon)}>
        {variant === "locked" ? (
          <Shield className="size-5" />
        ) : variant === "draft" ? (
          <Layers3 className="size-5" />
        ) : (
          <Check className="size-5" />
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        {variant === "locked" ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("font-bold", styles.title)}>Financial rules are locked</span>
              {activeSchemes != null ? (
                <Badge variant="outline" className="border-amber-300 bg-white/80">
                  {activeSchemes} active enrolments
                </Badge>
              ) : null}
            </div>
            <p className={cn("mt-1.5 leading-relaxed", styles.body)}>
              Duplicate this plan to change amounts or schedule. Update customer app listing via{" "}
              {onEditAvailability ? (
                <button
                  type="button"
                  className="font-semibold text-[#730321] underline-offset-2 hover:underline"
                  onClick={onEditAvailability}
                >
                  App & availability
                </button>
              ) : (
                "App & availability"
              )}{" "}
              without reopening the full editor.
            </p>
          </>
        ) : variant === "draft" ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="DRAFT" />
              <span className={cn("font-bold", styles.title)}>Not visible to customers yet</span>
            </div>
            <p className={cn("mt-1.5", styles.body)}>
              Activate when branches are ready to enrol customers on this template.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="ACTIVE" />
              <span className={cn("font-bold", styles.title)}>Live for enrolment</span>
            </div>
            <p className={cn("mt-1.5", styles.body)}>
              Staff can enrol customers and eligible plans appear according to availability rules.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Overview panels ─────────────────────────────────────────────── */

export function PlanCustomerPreviewCard({
  displayName,
  amountLabel,
  benefitLabel,
  tenureMonths,
  prematureOk,
  lockInMonths,
  redemptionModes,
}: {
  displayName: string;
  amountLabel: string;
  benefitLabel: string;
  tenureMonths: number;
  prematureOk: boolean;
  lockInMonths: number;
  redemptionModes: string[];
}) {
  const redemptionCopy = prematureOk
    ? `Early exit allowed${lockInMonths > 0 ? ` · ${lockInMonths} mo lock-in` : ""}`
    : "Redeem at maturity only";

  return (
    <Surface
      title="What customers see"
      description="Preview of the plan card and key promises at enrolment"
    >
      <div className="p-6">
        <div className="overflow-hidden rounded-2xl border border-[#e4d7d2] bg-gradient-to-br from-[#faf7f5] to-white shadow-inner">
          <div className="border-b border-[#eaded9] bg-white px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">
              Customer app preview
            </p>
            <h3 className="mt-1 text-xl font-extrabold text-[#241316]">{displayName}</h3>
          </div>
          <div className="grid gap-px bg-[#eaded9] sm:grid-cols-3">
            {[
              { icon: IndianRupee, label: "You pay", value: amountLabel },
              { icon: Sparkles, label: "You get", value: benefitLabel },
              { icon: CalendarClock, label: "Duration", value: `${tenureMonths} months` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-[#9a6f2a]">
                  <Icon className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
                </div>
                <p className="mt-2 text-sm font-bold leading-snug text-[#28161a]">{value}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-[#eaded9] bg-white px-5 py-4">
            <p className="text-xs text-muted-foreground">Redemption</p>
            <p className="mt-0.5 text-sm font-semibold text-[#2d191d]">{redemptionCopy}</p>
            {redemptionModes.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {redemptionModes.map((m) => (
                  <Badge key={m} variant="secondary" className="bg-[#f3eef0] font-normal">
                    {m.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Surface>
  );
}

export function PlanEnrolmentPulse({
  enrolments,
  financials,
  loading,
  collectedThisMonth,
}: {
  enrolments?: Record<string, number>;
  financials?: Record<string, { amountDisplay?: string } | unknown>;
  loading?: boolean;
  collectedThisMonth?: string;
}) {
  if (loading) {
    return (
      <Surface title="Portfolio pulse">
        <div className="space-y-3 p-6">
          <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-2 animate-pulse rounded bg-muted" />
        </div>
      </Surface>
    );
  }
  if (!enrolments) return null;

  const collected =
    financials?.totalCollected &&
    typeof financials.totalCollected === "object" &&
    "amountDisplay" in financials.totalCollected
      ? String((financials.totalCollected as { amountDisplay: string }).amountDisplay)
      : "—";
  const active = enrolments.active ?? 0;
  const total = enrolments.total ?? active;
  const pct = total > 0 ? Math.round((active / total) * 100) : 0;

  const breakdown = [
    { label: "Matured", value: enrolments.matured ?? 0, tone: "text-emerald-700" },
    { label: "Redeemed", value: enrolments.redeemed ?? 0, tone: "text-[#730321]" },
    { label: "Closed early", value: enrolments.closedPremature ?? 0, tone: "text-[#805817]" },
    { label: "Defaulted", value: enrolments.defaulted ?? 0, tone: "text-red-700" },
  ];

  return (
    <Surface
      title="Portfolio pulse"
      description="Enrolment mix and collections on this template"
      action={
        <Button variant="ghost" size="sm" className="h-8 text-[#730321]" asChild>
          <Link href="/enrollments">
            View enrolments
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-5 p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-4xl font-extrabold tracking-tight text-[#28161a]">
              {active.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">active enrolments</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">of {total.toLocaleString("en-IN")} total</p>
            <p className="text-lg font-bold text-[#730321]">{pct}% active</p>
          </div>
        </div>
        <Progress value={pct} className="h-2" />

        <div className="grid grid-cols-2 gap-2">
          {breakdown.map(({ label, value, tone }) => (
            <div
              key={label}
              className="rounded-xl border border-[#e4d7d2] bg-[#faf7f5]/80 px-3 py-2.5"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-lg font-bold", tone)}>{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gradient-to-br from-[#f7ecee] to-white p-4 ring-1 ring-[#eaded9]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Total collected</span>
            <span className="text-lg font-extrabold text-[#730321]">{collected}</span>
          </div>
          {collectedThisMonth ? (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#eaded9] pt-2">
              <span className="text-sm text-muted-foreground">This month</span>
              <span className="font-semibold text-[#2d191d]">{collectedThisMonth}</span>
            </div>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

export function PlanChannelPanel({
  allBranches,
  visibleInApp,
  selfEnrol,
  windowLabel,
  maxEnrolments,
  redemptionModes,
  action,
}: {
  allBranches: boolean;
  visibleInApp: boolean;
  selfEnrol: boolean;
  windowLabel: string;
  maxEnrolments: string;
  redemptionModes: string[];
  action?: React.ReactNode;
}) {
  const items = [
    {
      icon: MapPin,
      label: "Branch coverage",
      value: allBranches ? "All showrooms" : "Selected showrooms only",
      ok: true,
    },
    {
      icon: Smartphone,
      label: "Customer app",
      value: visibleInApp ? "Visible in catalogue" : "Hidden from catalogue",
      ok: visibleInApp,
    },
    {
      icon: Store,
      label: "Self-enrol",
      value: selfEnrol ? "Customers can join online" : "Staff-assisted only",
      ok: selfEnrol,
    },
    {
      icon: CalendarClock,
      label: "Enrolment window",
      value: windowLabel,
      ok: true,
    },
    {
      icon: Layers3,
      label: "Capacity",
      value: maxEnrolments,
      ok: maxEnrolments !== "0",
    },
  ];

  return (
    <Surface title="Channels & availability" action={action}>
      <ul className="divide-y divide-[#eaded9]">
        {items.map(({ icon: Icon, label, value, ok }) => (
          <li key={label} className="flex items-start gap-4 px-5 py-4">
            <div
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl",
                ok ? "bg-[#f7ecee] text-[#7b0a2b]" : "bg-[#f3eef0] text-[#776a6d]",
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#2d191d]">{label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{value}</p>
            </div>
          </li>
        ))}
      </ul>
      {redemptionModes.length ? (
        <div className="border-t border-[#eaded9] bg-[#faf7f5]/50 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Settlement modes
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {redemptionModes.map((m) => (
              <Badge key={m} variant="outline" className="bg-white font-normal">
                {m.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </Surface>
  );
}

export function PlanInternalMetaCard({
  rows,
}: {
  rows: { label: string; value: React.ReactNode }[];
}) {
  return (
    <Surface title="Internal reference" description="Staff-only identifiers and classification">
      <dl className="grid gap-4 p-6 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-[#e4d7d2] bg-[#faf7f5]/60 px-4 py-3"
          >
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 font-semibold text-[#2d191d]">{value}</dd>
          </div>
        ))}
      </dl>
    </Surface>
  );
}

/* ─── Schedule ────────────────────────────────────────────────────── */

export function PlanFlexiblePhaseBar({
  flexibleCycles,
  cappedCycles,
  className,
}: {
  flexibleCycles: number;
  cappedCycles: number;
  className?: string;
}) {
  const total = flexibleCycles + cappedCycles;
  const freePct = total > 0 ? (flexibleCycles / total) * 100 : 50;

  return (
    <Surface
      className={className}
      title="Two-phase journey"
      description="How tenure splits between the free window and capped cycles"
    >
      <div className="space-y-6 p-6">
        <div className="relative">
          <div className="flex h-14 overflow-hidden rounded-2xl border border-[#e4d7d2] shadow-inner">
            <div
              className="relative flex items-center justify-center bg-gradient-to-r from-emerald-400/25 to-emerald-500/15"
              style={{ width: `${freePct}%`, minWidth: "5rem" }}
            >
              <span className="text-sm font-extrabold text-emerald-900">
                {flexibleCycles} free cycles
              </span>
            </div>
            <div className="relative flex flex-1 items-center justify-center bg-gradient-to-r from-amber-300/20 to-amber-400/15">
              <span className="text-sm font-extrabold text-[#805817]">
                {cappedCycles} capped cycles
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs font-medium text-muted-foreground">
            <span>Phase 1 · variable payments</span>
            <span>Phase 2 · computed cap per cycle</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="flex items-center gap-2 text-emerald-800">
              <Sparkles className="size-4" />
              <p className="font-bold">Free window</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-emerald-900/75">
              Customers pay variable amounts within plan limits. Totals feed the cap formula for the
              capped phase.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-[#fff8e8] to-white p-5">
            <div className="flex items-center gap-2 text-[#805817]">
              <Scale className="size-4" />
              <p className="font-bold">Capped cycles</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#5c4a2a]">
              Each cycle has its own allowance derived from the free-phase average. Unused cap
              expires at cycle end.
            </p>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function ScheduleTimelineRow({
  number,
  dueDate,
  amount,
  note,
  isFirst,
  isLast,
}: {
  number: number;
  dueDate: string;
  amount: string;
  note?: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast ? (
        <div className="absolute left-[1.125rem] top-10 h-[calc(100%-1.5rem)] w-px bg-[#e4d7d2]" />
      ) : null}
      <div
        className={cn(
          "relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold",
          isFirst
            ? "border-[#730321] bg-[#730321] text-white"
            : "border-[#e4d7d2] bg-white text-[#730321]",
        )}
      >
        {number}
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-[#e4d7d2] bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-[#2d191d]">{dueDate}</p>
          <p className="text-lg font-extrabold text-[#730321]">{amount}</p>
        </div>
        {note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : null}
      </div>
    </div>
  );
}

export function PlanScheduleSection({
  preview,
  loading,
  isFlexible,
  isOneTime,
  error,
  className,
}: {
  preview?: PlanSchedulePreviewData;
  loading?: boolean;
  isFlexible: boolean;
  isOneTime?: boolean;
  error?: string;
  className?: string;
}) {
  const summary = preview?.summary;
  const schedule = preview?.schedule ?? [];

  const summaryTiles = [
    summary?.installmentAmount?.amountDisplay && {
      label: "Instalment",
      value: summary.installmentAmount.amountDisplay,
    },
    summary?.totalPayable?.amountDisplay && {
      label: "Total payable",
      value: summary.totalPayable.amountDisplay,
    },
    summary?.estimatedMaturityValue?.amountDisplay && {
      label: "Est. at maturity",
      value: summary.estimatedMaturityValue.amountDisplay,
    },
    summary?.maturityDate && { label: "Maturity date", value: summary.maturityDate },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className={cn("space-y-6", className)}>
      {isFlexible ? (
        <PlanFlexiblePhaseBar flexibleCycles={6} cappedCycles={5} className="hidden" />
      ) : null}

      <Surface
        title={isOneTime ? "One-time gold preview" : isFlexible ? "Enrolment timeline" : "Instalment schedule preview"}
        description={
          isFlexible
            ? "Phase dates for a new enrolment starting today"
            : isOneTime ? "Payment and bonus dates if funded today" : "Sample schedule at the minimum eligible contribution"
        }
      >
        <div className="space-y-6 p-6">
          {error || isOneTime ? (
            <PlanSchedulePreviewPanel data={preview} loading={loading} error={error} />
          ) : loading ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
              <div className="h-48 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : (
            <>
              {summaryTiles.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {summaryTiles.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl bg-gradient-to-br from-[#f7ecee]/80 to-white px-4 py-3 ring-1 ring-[#eaded9]"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-[#28161a]">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {isFlexible ? (
                <PlanSchedulePreviewPanel
                  data={preview}
                  emptyHint="Schedule preview will appear when plan rules are loaded."
                />
              ) : schedule.length > 0 ? (
                <div className="rounded-2xl border border-[#e4d7d2] bg-[#faf7f5]/40 p-5">
                  <p className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Timeline
                  </p>
                  {schedule.map((row, index) => (
                    <ScheduleTimelineRow
                      key={row.installmentNumber}
                      number={row.installmentNumber}
                      dueDate={row.dueDate}
                      amount={row.amount.amountDisplay}
                      note={row.note ?? undefined}
                      isFirst={index === 0}
                      isLast={index === schedule.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <PlanSchedulePreviewPanel
                  data={preview}
                  emptyHint="Schedule preview will appear when plan rules are loaded."
                />
              )}

              {!isFlexible && schedule.length > 6 ? (
                <details className="rounded-xl border border-[#e4d7d2] bg-white">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#730321]">
                    View full table ({schedule.length} instalments)
                  </summary>
                  <div className="border-t border-[#eaded9] p-4">
                    <DataTable
                      rows={schedule.map((row) => ({
                        id: String(row.installmentNumber),
                        ...row,
                      }))}
                      columns={[
                        {
                          key: "n",
                          header: "#",
                          render: (r) => (
                            <span className="font-semibold">{r.installmentNumber}</span>
                          ),
                        },
                        { key: "due", header: "Due date", render: (r) => r.dueDate },
                        {
                          key: "amt",
                          header: "Amount",
                          render: (r) => <strong>{r.amount.amountDisplay}</strong>,
                        },
                        {
                          key: "note",
                          header: "Note",
                          render: (r) =>
                            r.note ? (
                              <span className="text-sm text-muted-foreground">{r.note}</span>
                            ) : (
                              "—"
                            ),
                        },
                      ]}
                    />
                  </div>
                </details>
              ) : null}
            </>
          )}
        </div>
      </Surface>
    </div>
  );
}

/* ─── Terms ───────────────────────────────────────────────────────── */

export function PlanTermsPanel({
  terms,
  planId,
  canEdit,
}: {
  terms: string;
  planId?: string;
  canEdit?: boolean;
}) {
  const body = terms.trim();
  return (
    <Surface
      title="Terms & conditions"
      description="Legal copy shown at enrolment and in the customer app"
    >
      <div className="p-6">
        {body ? (
          <div className="max-h-96 overflow-y-auto rounded-2xl border border-[#e4d7d2] bg-[#faf7f5]/50 p-5">
            <p className="whitespace-pre-wrap text-sm leading-[1.7] text-[#4f3d41]">{body}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e4d7d2] bg-[#faf7f5] px-6 py-10 text-center">
            <p className="text-sm font-semibold text-[#5c4a4e]">No terms text on this plan yet</p>
            <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
              Add legal wording in the plan builder so staff and customers see consistent terms
              everywhere.
            </p>
            {planId ? (
              <Button variant="outline" className="mt-5" asChild>
                <Link href={`/schemes/${planId}/edit`}>
                  {canEdit ? "Add terms in editor" : "View plan settings"}
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Surface>
  );
}

/* ─── Rules ───────────────────────────────────────────────────────── */

export type PlanRuleSection = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function PlanRuleCard({
  id,
  icon: Icon,
  title,
  description,
  highlight,
  badges,
  entries,
  children,
  sectionIndex,
  sectionTotal,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  highlight?: string;
  badges?: React.ReactNode;
  entries?: FieldEntry[];
  children?: React.ReactNode;
  sectionIndex?: number;
  sectionTotal?: number;
}) {
  return (
    <section
      id={id}
      className="overflow-hidden rounded-2xl border border-[#e4d7d2] bg-white shadow-sm"
    >
      <div className="border-b border-[#eaded9] bg-gradient-to-r from-[#faf7f5] to-white px-5 py-5 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#730321] to-[#9a1a3d] text-white shadow-sm">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-xl font-bold tracking-tight text-[#2d191d]">{title}</h3>
              {sectionIndex != null && sectionTotal != null ? (
                <span className="rounded-full bg-[#f3ecee] px-2.5 py-0.5 text-xs font-semibold text-[#730321]">
                  {sectionIndex} of {sectionTotal}
                </span>
              ) : null}
            </div>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
            {badges ? <div className="mt-3 flex flex-wrap gap-2">{badges}</div> : null}
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        {highlight ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#eaded9] bg-gradient-to-r from-[#f7ecee] via-white to-[#faf7f5] px-4 py-3.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-[#730321]" />
            <p className="text-sm font-semibold leading-relaxed text-[#730321]">{highlight}</p>
          </div>
        ) : null}
        {entries?.length ? (
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {entries.map((e) => (
              <div
                key={e.label}
                className="group rounded-xl border border-[#e4d7d2]/90 bg-[#faf7f5]/60 px-4 py-3.5 transition hover:border-[#d4c4bf] hover:bg-white"
              >
                <dt className="text-[11px] font-bold uppercase tracking-wider text-[#9a8589]">
                  {e.label}
                </dt>
                <dd className="mt-1.5 text-base font-semibold leading-snug text-[#2d191d]">
                  {e.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {children}
      </div>
    </section>
  );
}

function PlanRulesNavItem({
  id,
  label,
  icon: Icon,
  active,
  onSelect,
  compact,
}: PlanRuleSection & {
  active: boolean;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl text-left text-sm font-medium transition",
        compact ? "shrink-0 px-3.5 py-2" : "px-3 py-2.5",
        active
          ? "bg-[#730321] text-white shadow-sm"
          : "text-[#5c4a4e] hover:bg-white hover:text-[#730321]",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "opacity-100" : "opacity-70")} />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function PlanRulesNav({
  sections,
  activeId,
  onSelect,
  className,
}: {
  sections: PlanRuleSection[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "rounded-2xl border border-[#e4d7d2] bg-[#faf7f5]/80 p-3",
        className,
      )}
    >
      <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">
        Rule categories
      </p>
      <ul className="space-y-1">
        {sections.map((section) => (
          <li key={section.id}>
            <PlanRulesNavItem {...section} active={section.id === activeId} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PlanRulesWorkspace({
  sections,
  activeId,
  onSelect,
  children,
}: {
  sections: PlanRuleSection[];
  activeId: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}) {
  const activeIndex = sections.findIndex((section) => section.id === activeId);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5 xl:flex-row xl:gap-6">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:hidden">
        {sections.map((section) => (
          <PlanRulesNavItem
            key={section.id}
            {...section}
            active={section.id === activeId}
            onSelect={onSelect}
            compact
          />
        ))}
      </div>

      <PlanRulesNav
        sections={sections}
        activeId={activeId}
        onSelect={onSelect}
        className="hidden w-[220px] shrink-0 xl:sticky xl:top-4 xl:block xl:self-start"
      />

      <div className="min-w-0 flex-1">
        <div
          key={activeId}
          className="animate-in fade-in-0 slide-in-from-right-2 duration-200"
        >
          {children}
        </div>
        {activeIndex >= 0 && sections.length > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eaded9] pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activeIndex <= 0}
              onClick={() => onSelect(sections[activeIndex - 1].id)}
            >
              Previous
            </Button>
            <p className="text-xs font-medium text-muted-foreground">
              {activeIndex + 1} / {sections.length}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activeIndex >= sections.length - 1}
              onClick={() => onSelect(sections[activeIndex + 1].id)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { YesNoBadge as PlanYesNo };

/* ─── Performance ─────────────────────────────────────────────────── */

const ENROLMENT_STAT_KEYS: {
  key: string;
  label: string;
  tone: "wine" | "gold" | "red" | "green" | "cream";
  icon: typeof Gift;
}[] = [
  { key: "active", label: "Active", tone: "gold", icon: Layers3 },
  { key: "total", label: "All time", tone: "wine", icon: Gift },
  { key: "matured", label: "Matured", tone: "green", icon: Gift },
  { key: "redeemed", label: "Redeemed", tone: "cream", icon: Gift },
  { key: "closedPremature", label: "Closed early", tone: "cream", icon: AlertTriangle },
  { key: "defaulted", label: "Defaulted", tone: "red", icon: AlertTriangle },
];

const FINANCIAL_STAT_KEYS: {
  key: string;
  label: string;
  kind: "money" | "weight";
}[] = [
  { key: "totalCollected", label: "Total collected", kind: "money" },
  { key: "outstandingExpected", label: "Outstanding expected", kind: "money" },
  { key: "goldLiability", label: "Gold liability", kind: "weight" },
  { key: "benefitLiability", label: "Benefit liability", kind: "money" },
];

function displayMoneyOrWeight(value: unknown, kind: "money" | "weight"): string {
  if (!value || typeof value !== "object") return "—";
  if (kind === "weight" && "weightDisplay" in value) {
    return String((value as { weightDisplay: string }).weightDisplay);
  }
  if ("amountDisplay" in value) {
    return String((value as { amountDisplay: string }).amountDisplay);
  }
  return "—";
}

export function PlanPerformanceDashboard({
  enrolments,
  financials,
  charts,
}: {
  enrolments?: Record<string, number>;
  financials?: Record<string, unknown>;
  charts?: Record<string, ChartSeriesBlock>;
}) {
  const chartOrder: { id: string; fallbackTitle: string }[] = [
    { id: "enrolmentTrend", fallbackTitle: "New enrolments by month" },
    { id: "statusDistribution", fallbackTitle: "Enrolment status mix" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ENROLMENT_STAT_KEYS.map(({ key, label, tone, icon: Icon }) => {
          const val = enrolments?.[key];
          if (val == null && key !== "active" && key !== "total") return null;
          return (
            <StatCard
              key={key}
              icon={Icon}
              label={label}
              value={Number(val ?? 0).toLocaleString("en-IN")}
              tone={tone}
            />
          );
        })}
      </div>

      <Surface
        title="Financial exposure"
        description="Cash collected and estimated liabilities tied to this template"
      >
        <dl className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {FINANCIAL_STAT_KEYS.map(({ key, label, kind }) => (
            <div
              key={key}
              className="rounded-2xl border border-[#e4d7d2] bg-gradient-to-br from-[#faf7f5] to-white px-4 py-4"
            >
              <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {kind === "weight" ? (
                  <Scale className="size-3.5 shrink-0" />
                ) : (
                  <IndianRupee className="size-3.5 shrink-0" />
                )}
                {label}
              </dt>
              <dd className="mt-2 text-xl font-extrabold tracking-tight text-[#28161a]">
                {key === "benefitLiability" && financials?.benefitLiabilityGold
                  ? displayMoneyOrWeight(financials.benefitLiabilityGold, "weight")
                  : displayMoneyOrWeight(financials?.[key], kind)}
              </dd>
              {key === "benefitLiability" && Boolean(financials?.benefitLiabilityGold) && (
                <dd className="mt-1 text-xs text-muted-foreground">
                  {financials?.benefitLiabilityAwaitingRate ? "Valuation awaiting gold rate" : displayMoneyOrWeight(financials?.[key], "money")}
                </dd>
              )}
            </div>
          ))}
        </dl>
      </Surface>

      <div className="grid gap-6 lg:grid-cols-2">
        {chartOrder.map(({ id, fallbackTitle }) => {
          const chart = charts?.[id];
          const title =
            (chart && "title" in chart && chart.title ? String(chart.title) : null) ??
            fallbackTitle;
          if (!chart) {
            return (
              <Surface key={id} title={title}>
                <div className="flex min-h-[220px] items-center justify-center p-6 text-sm text-muted-foreground">
                  Charts load from plan analytics — refresh if this persists.
                </div>
              </Surface>
            );
          }
          const hasData = hasChartSeriesData(chart);
          return (
            <Surface key={id} title={title}>
              <div className="p-4 sm:p-6">
                {hasData ? (
                  <ChartSeriesView chart={chart} />
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#e4d7d2] bg-[#faf7f5]/80 px-6 py-10 text-center">
                    <BarChart3 className="size-8 text-[#c4b4ae]" />
                    <p className="text-sm font-medium text-[#5c4a4e]">
                      No enrolments in this period yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Charts update as customers enrol on this plan.
                    </p>
                  </div>
                )}
              </div>
            </Surface>
          );
        })}
      </div>
    </div>
  );
}
