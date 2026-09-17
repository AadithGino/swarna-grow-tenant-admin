"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Gift,
  IndianRupee,
  Layers3,
  MapPin,
  Scale,
  Shield,
  Smartphone,
  Sparkles,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/src/components/common/data-table";
import {
  ChartSeriesView,
  hasChartSeriesData,
} from "@/src/components/common/chart-series-view";
import { StatCard, Surface } from "@/src/components/common/page-parts";
import type { ChartSeriesBlock } from "@/src/types/admin-report";
import { PlanSchedulePreviewPanel } from "@/src/features/schemes/plan-preview-panel";
import type { PlanSchedulePreviewData } from "@/src/features/schemes/plan-preview-types";
import { cn } from "@/lib/utils";

function SummaryPill({
  icon: Icon,
  label,
  value,
  accent = "wine",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: "wine" | "gold" | "green";
}) {
  const tones = {
    wine: "from-[#f7ecee] to-white border-[#eaded9]",
    gold: "from-[#fff8e8] to-white border-[#eadbb5]",
    green: "from-emerald-50 to-white border-emerald-200",
  };
  const iconTone = {
    wine: "text-[#7b0a2b]",
    gold: "text-[#bb6200]",
    green: "text-emerald-700",
  };
  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br p-4 shadow-[0_2px_5px_rgb(67_15_25/3%)]",
        tones[accent],
      )}
    >
      <div className={cn("flex items-center gap-2", iconTone[accent])}>
        <Icon className="size-4 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-[0.95rem] font-bold leading-snug text-[#241316]">
        {value}
      </p>
    </div>
  );
}

/** Full-width hero — first thing below KPI cards. */
export function PlanDetailHero({
  displayName,
  description,
  code,
  amountLabel,
  benefitLabel,
  tenureMonths,
  visibleInApp,
  selfEnrol,
  prematureOk,
  lockInMonths,
}: {
  displayName: string;
  description: string;
  code: string;
  amountLabel: string;
  benefitLabel: string;
  tenureMonths: number;
  visibleInApp: boolean;
  selfEnrol: boolean;
  prematureOk: boolean;
  lockInMonths: number;
}) {
  const redemptionCopy = prematureOk
    ? `Early exit allowed${lockInMonths > 0 ? ` · ${lockInMonths} mo lock-in` : ""}`
    : "Redeem at maturity only";

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e4d7d2] bg-white shadow-[0_2px_5px_rgb(67_15_25/3%)]">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-[#eaded9] bg-gradient-to-br from-[#730321] via-[#8a1030] to-[#5c0218] px-6 py-8 text-white lg:border-b-0 lg:border-r">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">
            Customer-facing plan
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-[1.65rem]">
            {displayName}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85">
            {description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
              {code}
            </Badge>
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
              {tenureMonths} months
            </Badge>
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
              <Smartphone className="size-3" />
              {visibleInApp ? "In app" : "Hidden"}
            </Badge>
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
              {selfEnrol ? "Self-enrol" : "Staff only"}
            </Badge>
          </div>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <SummaryPill
            icon={IndianRupee}
            label="Contributions"
            value={amountLabel}
            accent="wine"
          />
          <SummaryPill
            icon={Sparkles}
            label="Benefit"
            value={benefitLabel}
            accent="gold"
          />
          <SummaryPill
            icon={Shield}
            label="Redemption"
            value={redemptionCopy}
            accent="green"
          />
        </div>
      </div>
    </section>
  );
}

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
      title="Two-phase timeline"
      description="How tenure splits between free and capped windows"
    >
      <div className="space-y-5 p-6">
        <div className="flex h-12 overflow-hidden rounded-xl border border-[#e4d7d2] shadow-inner">
          <div
            className="flex items-center justify-center bg-emerald-500/15 text-sm font-bold text-emerald-900"
            style={{ width: `${freePct}%`, minWidth: "4.5rem" }}
          >
            {flexibleCycles} free
          </div>
          <div className="flex flex-1 items-center justify-center bg-amber-500/15 text-sm font-bold text-[#805817]">
            {cappedCycles} capped
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
            <p className="font-bold text-emerald-900">Free window</p>
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-900/80">
              Variable payments within plan limits. Totals feed the cap formula for the
              next phase.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-[#fff8e8]/80 p-4">
            <p className="font-bold text-[#805817]">Capped cycles</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#5c4a2a]">
              Each cycle has its own allowance from the average. Unused cap expires at
              cycle end.
            </p>
          </div>
        </div>
      </div>
    </Surface>
  );
}

export function PlanSchedulePreviewSurface({
  preview,
  loading,
  isFlexible,
  className,
}: {
  preview?: PlanSchedulePreviewData;
  loading?: boolean;
  isFlexible: boolean;
  className?: string;
}) {
  const summary = preview?.summary;
  const schedule = preview?.schedule ?? [];

  return (
    <Surface
      className={className}
      title={isFlexible ? "Enrolment timeline" : "Sample installment schedule"}
      description={
        isFlexible
          ? "Dates shown for a new enrolment starting today"
          : "Based on minimum contribution · first payment collected at enrolment"
      }
    >
      <div className="space-y-5 p-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : (
          <>
            {summary && !summary.freeWindow ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  summary.installmentAmount?.amountDisplay && {
                    label: "Installment",
                    value: summary.installmentAmount.amountDisplay,
                  },
                  summary.totalPayable?.amountDisplay && {
                    label: "Total payable",
                    value: summary.totalPayable.amountDisplay,
                  },
                  summary.estimatedMaturityValue?.amountDisplay && {
                    label: "Est. at maturity",
                    value: summary.estimatedMaturityValue.amountDisplay,
                  },
                  summary.maturityDate && {
                    label: "Maturity date",
                    value: summary.maturityDate,
                  },
                ]
                  .filter(Boolean)
                  .map((item) => (
                    <div
                      key={item!.label}
                      className="rounded-xl bg-[#faf7f5] px-4 py-3 ring-1 ring-[#e4d7d2]"
                    >
                      <p className="text-xs text-muted-foreground">{item!.label}</p>
                      <p className="mt-0.5 font-bold text-[#28161a]">{item!.value}</p>
                    </div>
                  ))}
              </div>
            ) : null}
            {isFlexible ? (
              <PlanSchedulePreviewPanel
                data={preview}
                emptyHint="Schedule preview will appear when plan rules are loaded."
              />
            ) : null}
            {!isFlexible && schedule.length > 0 ? (
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
                  {
                    key: "due",
                    header: "Due date",
                    render: (r) => r.dueDate,
                  },
                  {
                    key: "amt",
                    header: "Amount",
                    render: (r) => (
                      <strong>{r.amount.amountDisplay}</strong>
                    ),
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
            ) : !isFlexible ? (
              <PlanSchedulePreviewPanel
                data={preview}
                emptyHint="Schedule preview will appear when plan rules are loaded."
              />
            ) : null}
          </>
        )}
      </div>
    </Surface>
  );
}

export function PlanPerformanceSidebar({
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
      <Surface title="Enrolment health">
        <div className="space-y-3 p-6">
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
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

  return (
    <Surface title="Enrolment health">
      <div className="space-y-5 p-6">
        <div>
          <p className="text-4xl font-extrabold tracking-tight text-[#28161a]">
            {active.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            active of {total.toLocaleString("en-IN")} total enrolments
          </p>
        </div>
        <Progress value={pct} className="h-2.5" />
        <dl className="grid grid-cols-2 gap-3">
          {[
            ["Matured", enrolments.matured],
            ["Redeemed", enrolments.redeemed],
            ["Closed early", enrolments.closedPremature],
            ["Defaulted", enrolments.defaulted],
          ].map(([label, val]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-[#e4d7d2] bg-[#faf7f5] px-3 py-2.5"
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-lg font-bold">{val ?? 0}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-2 border-t border-[#eaded9] pt-4 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Total collected</span>
            <span className="font-bold text-[#730321]">{collected}</span>
          </div>
          {collectedThisMonth ? (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">This month</span>
              <span className="font-semibold">{collectedThisMonth}</span>
            </div>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

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

function displayMoneyOrWeight(
  value: unknown,
  kind: "money" | "weight",
): string {
  if (!value || typeof value !== "object") return "—";
  if (kind === "weight" && "weightDisplay" in value) {
    return String((value as { weightDisplay: string }).weightDisplay);
  }
  if ("amountDisplay" in value) {
    return String((value as { amountDisplay: string }).amountDisplay);
  }
  return "—";
}

export function PlanPerformanceTab({
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
    { id: "statusDistribution", fallbackTitle: "Enrolment status" },
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
        description="Collected cash and estimated liabilities for this template"
      >
        <dl className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {FINANCIAL_STAT_KEYS.map(({ key, label, kind }) => (
            <div
              key={key}
              className="rounded-xl border border-[#e4d7d2] bg-gradient-to-br from-[#faf7f5] to-white px-4 py-4"
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
                {displayMoneyOrWeight(financials?.[key], kind)}
              </dd>
            </div>
          ))}
        </dl>
      </Surface>

      <div className="grid gap-6 lg:grid-cols-2">
        {chartOrder.map(({ id, fallbackTitle }) => {
          const chart = charts?.[id];
          const title =
            (chart && "title" in chart && chart.title
              ? String(chart.title)
              : null) ?? fallbackTitle;
          if (!chart) {
            return (
              <Surface key={id} title={title}>
                <div className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
                  Performance charts load from{" "}
                  <code className="mx-1 rounded bg-muted px-1">/stats</code>.
                  Refresh the page if this persists.
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
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#e4d7d2] bg-[#faf7f5]/80 px-6 py-10 text-center">
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

export function PlanAvailabilitySidebar({
  allBranches,
  visibleInApp,
  selfEnrol,
  windowLabel,
  redemptionModes,
  action,
}: {
  allBranches: boolean;
  visibleInApp: boolean;
  selfEnrol: boolean;
  windowLabel: string;
  redemptionModes: string[];
  action?: React.ReactNode;
}) {
  const rows = [
    { icon: MapPin, label: "Branches", value: allBranches ? "All branches" : "Selected" },
    {
      icon: Smartphone,
      label: "Customer app",
      value: visibleInApp ? "Listed" : "Hidden",
    },
    {
      icon: Store,
      label: "Self-enrol",
      value: selfEnrol ? "Allowed" : "Staff only",
    },
    { icon: CalendarClock, label: "Enrolment window", value: windowLabel },
  ];

  return (
    <Surface title="Availability & redemption" action={action}>
      <ul className="divide-y divide-[#eaded9] px-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <li
            key={label}
            className="flex items-center justify-between gap-3 px-3 py-3.5"
          >
            <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Icon className="size-4 shrink-0 text-[#9a6f2a]" />
              {label}
            </span>
            <span className="text-right text-sm font-semibold text-[#2d191d]">
              {value}
            </span>
          </li>
        ))}
      </ul>
      {redemptionModes.length ? (
        <div className="border-t border-[#eaded9] px-5 py-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Redemption modes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {redemptionModes.map((m) => (
              <Badge
                key={m}
                variant="secondary"
                className="bg-[#f3eef0] font-normal"
              >
                {m.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </Surface>
  );
}

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
      description="Shown to customers at enrolment and in the app"
    >
      <div className="max-h-80 overflow-y-auto p-6">
        {body ? (
          <p className="whitespace-pre-wrap text-sm leading-[1.65] text-[#4f3d41]">
            {body}
          </p>
        ) : (
          <div className="rounded-xl border border-dashed border-[#e4d7d2] bg-[#faf7f5] px-4 py-8 text-center">
            <p className="text-sm font-medium text-[#5c4a4e]">
              No terms text saved on this plan yet.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Add legal copy in the plan builder so staff and customers see the
              same wording everywhere.
            </p>
            {planId ? (
              <p className="mt-4 text-sm">
                <Link
                  href={`/schemes/${planId}/edit`}
                  className="font-semibold text-[#730321] hover:underline"
                >
                  {canEdit ? "Edit plan → add terms" : "View plan settings"}
                </Link>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Surface>
  );
}

export function PlanStaffMetaGrid({
  rows,
}: {
  rows: { label: string; value: React.ReactNode }[];
}) {
  return (
    <Surface title="Internal metadata">
      <dl className="grid gap-x-8 gap-y-6 p-6 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 font-semibold text-[#2d191d]">{value}</dd>
          </div>
        ))}
      </dl>
    </Surface>
  );
}
