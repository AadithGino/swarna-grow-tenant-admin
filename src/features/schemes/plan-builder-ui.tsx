"use client";

import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Check,
  Eye,
  Gift,
  Layers,
  MapPin,
  Scale,
  Settings2,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FieldLabel, Surface } from "@/src/components/common/page-parts";
import {
  amountSummaryLabel,
  isPlanPreviewReady,
  type PlanBuilderFormState,
} from "@/src/features/schemes/plan-builder-form";
import { PlanSchedulePreviewPanel } from "@/src/features/schemes/plan-preview-panel";
import type {
  PlanSchedulePreviewData,
  PlanSchedulePreviewRow,
} from "@/src/features/schemes/plan-preview-types";
import type { StepId } from "@/src/features/schemes/plan-builder-wizard-types";

export type PlanBuilderStep = { id: StepId; label: string };

type StepCopy = {
  title: string;
  description: string;
  intro: string;
  icon: LucideIcon;
};

export const STEP_COPY: Record<StepId, StepCopy> = {
  basics: {
    title: "Basics",
    description: "Name and copy customers will see in the app",
    intro:
      "Choose an internal name, a short code for reports, and the display text shown on enrolment screens.",
    icon: Settings2,
  },
  type: {
    title: "Scheme type",
    description: "Cash or gold · fixed installments or flexible phases",
    intro:
      "This drives how payments, caps, and maturity value are calculated for every enrolment on this plan.",
    icon: Layers,
  },
  duration: {
    title: "Duration",
    description: "How long the scheme runs",
    intro:
      "Total months should match how many collection periods you expect (installments for fixed plans, cycles for flexible).",
    icon: Calendar,
  },
  amount: {
    title: "Contribution rules",
    description: "Who picks the amount and within what bounds",
    intro:
      "Set a fixed installment, slabs, or a min/max range (with optional multiples) for fixed-date schemes.",
    icon: Wallet,
  },
  schedule: {
    title: "Schedule & payments",
    description: "Due dates, grace, and payment behaviour",
    intro:
      "Controls when installments fall due, whether the first payment is taken at enrolment, and partial or advance payments.",
    icon: Calendar,
  },
  flexible: {
    title: "Flexible rules",
    description: "Free window, cap formula, and capped-phase collection",
    intro:
      "Configure the free months and payment bounds, how the monthly cap is calculated from savings, and how collections work after the cap locks.",
    icon: Sparkles,
  },
  benefit: {
    title: "Maturity benefit",
    description: "What the customer earns when they complete the plan",
    intro:
      "Pick a computed bonus, a free installment (fixed plans only), or a text benefit your team honours at redemption.",
    icon: Gift,
  },
  redemption: {
    title: "Redemption & exit",
    description: "Premature closure, penalties, and settlement modes",
    intro:
      "Define whether customers can exit early, what they forfeit, and how they receive value at maturity or closure.",
    icon: Shield,
  },
  availability: {
    title: "Availability",
    description: "Branches, enrolment window, and app visibility",
    intro:
      "Control where the plan can be sold, whether it appears in the customer app, and optional enrolment limits.",
    icon: MapPin,
  },
  review: {
    title: "Review & save",
    description: "Confirm rules and preview the customer experience",
    intro:
      "Check the summary and schedule preview, then save as draft. Activate the plan from the scheme list when ready.",
    icon: Scale,
  },
};

export function PlanBuilderStepper({
  steps,
  currentIndex,
  onSelect,
}: {
  steps: PlanBuilderStep[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const progress =
    steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 100;

  return (
    <div className="mb-6 rounded-2xl border border-[#e4d7d2] bg-white p-4 shadow-[0_2px_5px_rgb(67_15_25/3%)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[#28161a]">
          Step {currentIndex + 1} of {steps.length}
        </span>
        <span className="text-muted-foreground">{steps[currentIndex]?.label}</span>
      </div>
      <div className="relative mb-5 h-1.5 overflow-hidden rounded-full bg-[#f0e6e2]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#730321] to-[#9a1a3a] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="flex flex-wrap gap-2">
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition-colors",
                  active &&
                    "border-[#730321] bg-[#730321] text-white shadow-sm",
                  done &&
                    !active &&
                    "border-emerald-200 bg-emerald-50 text-emerald-900",
                  !active &&
                    !done &&
                    "border-[#e4d7d2] bg-[#faf7f5] text-[#5c4a4e] hover:border-[#d4c4bf]",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full text-[10px]",
                    active && "bg-white/20",
                    done && !active && "bg-emerald-600 text-white",
                    !active && !done && "bg-[#eaded9] text-[#5c4a4e]",
                  )}
                >
                  {done && !active ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StepIntro({ stepId }: { stepId: StepId }) {
  const copy = STEP_COPY[stepId];
  const Icon = copy.icon;
  return (
    <div className="flex gap-4 rounded-xl border border-[#eaded9] bg-gradient-to-br from-[#faf7f5] to-white p-4">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f7ecee] text-[#7b0a2b]">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm leading-relaxed text-[#5c4a4e]">{copy.intro}</p>
      </div>
    </div>
  );
}

export function FormSection({
  title,
  hint,
  tone = "neutral",
  children,
}: {
  title: string;
  hint?: string;
  tone?: "neutral" | "free" | "capped" | "wine";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-[#e4d7d2] bg-white",
    free: "border-emerald-200/90 bg-emerald-50/30",
    capped: "border-amber-200/90 bg-[#fff8e8]/40",
    wine: "border-[#eaded9] bg-[#faf7f5]",
  };
  return (
    <section
      className={cn("space-y-4 rounded-xl border p-4 sm:p-5", tones[tone])}
    >
      <div>
        <h3 className="text-sm font-bold text-[#28161a]">{title}</h3>
        {hint ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="-mt-1 mb-2 text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export function FreeWindowPaymentLimits({
  form,
  onChange,
  embedded,
}: {
  form: PlanBuilderFormState;
  onChange: (patch: Partial<PlanBuilderFormState>) => void;
  /** Fields only — parent supplies the section chrome */
  embedded?: boolean;
}) {
  const fields = (
    <div className="grid gap-3 sm:grid-cols-2">
      {embedded ? (
        <p className="sm:col-span-2 text-sm font-semibold text-emerald-950">
          Per-payment limits
        </p>
      ) : null}
      <div>
        <FieldLabel>Min payment in free window (₹)</FieldLabel>
        <FieldHint>Smallest single payment allowed during the free phase.</FieldHint>
        <Input
          type="number"
          min={0}
          value={form.flexMinPayment}
          onChange={(e) =>
            onChange({ flexMinPayment: Number(e.target.value) })
          }
        />
      </div>
      <div>
        <FieldLabel>Max payment in free window (₹)</FieldLabel>
        <FieldHint>Largest single payment allowed during the free phase.</FieldHint>
        <Input
          type="number"
          min={0}
          value={form.flexMaxPayment}
          onChange={(e) =>
            onChange({ flexMaxPayment: Number(e.target.value) })
          }
        />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel>Minimum total in free window (₹)</FieldLabel>
        <FieldHint>
          Expected cumulative contributions before the cap lock (policy floor).
        </FieldHint>
        <Input
          type="number"
          min={0}
          value={form.flexMinTotal}
          onChange={(e) =>
            onChange({ flexMinTotal: Number(e.target.value) })
          }
        />
      </div>
    </div>
  );

  if (embedded) return fields;

  return (
    <FormSection
      title="Free window — payment limits"
      tone="free"
      hint="Each optional payment in the free phase must stay within these bounds."
    >
      {fields}
    </FormSection>
  );
}

export function ChoiceCard({
  selected,
  title,
  description,
  onClick,
  disabled,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-[#730321] bg-[#fdf5f7] ring-2 ring-[#730321]/20"
          : "border-[#e4d7d2] bg-white hover:border-[#c9b8b3]",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <p className="font-semibold text-[#28161a]">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </button>
  );
}

export function FlexiblePhaseTimeline({
  flexibleCycles,
  cappedCycles,
  capFormula = "FLEXIBLE_PHASE_TOTAL_DIV_AVERAGING_DIVISOR",
  averagingDivisor,
}: {
  flexibleCycles: number;
  cappedCycles: number;
  capFormula?:
    | "FLEXIBLE_PHASE_TOTAL_DIV_AVERAGING_DIVISOR"
    | "FLEXIBLE_PHASE_TOTAL_DIV_PAYMENT_COUNT";
  averagingDivisor: number;
}) {
  const capUsesPaymentCount =
    capFormula === "FLEXIBLE_PHASE_TOTAL_DIV_PAYMENT_COUNT";
  const total = flexibleCycles + cappedCycles;
  const freePct = total > 0 ? (flexibleCycles / total) * 100 : 50;
  return (
    <div className="space-y-4">
      <div className="flex h-14 overflow-hidden rounded-xl border border-[#e4d7d2] shadow-inner">
        <div
          className="flex flex-col items-center justify-center bg-emerald-500/15 px-2 text-center"
          style={{ width: `${freePct}%`, minWidth: "5rem" }}
        >
          <span className="text-lg font-extrabold text-emerald-900">
            {flexibleCycles}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            Free months
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center bg-amber-500/15 px-2 text-center">
          <span className="text-lg font-extrabold text-[#805817]">
            {cappedCycles}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#805817]">
            Capped months
          </span>
        </div>
      </div>
      <p className="rounded-lg bg-white/80 px-3 py-2 text-center text-sm text-[#5c4a4e] ring-1 ring-[#e4d7d2]">
        After month {flexibleCycles}, monthly cap ≈{" "}
        <strong className="text-[#28161a]">
          total free-phase payments ÷{" "}
          {capUsesPaymentCount
            ? "number of payments made"
            : averagingDivisor}
        </strong>
        , then rounded and clamped to your min/max cap.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-3 text-sm text-emerald-950">
          <strong>Free window</strong> — customer chooses how much to pay each
          month (within your min and max per payment).
        </div>
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-3 text-sm text-[#5c4a2a]">
          <strong>Capped window</strong> — each month has its own allowance;
          unused cap expires at month end.
        </div>
      </div>
    </div>
  );
}

export function AmountSummaryStrip({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-[#bb6200]/30 bg-gradient-to-r from-[#fff8e8] to-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">
        Customer sees
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug text-[#28161a]">
        {label}
      </p>
    </div>
  );
}

export function ReviewSummaryCard({
  rows,
}: {
  rows: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="divide-y divide-[#eaded9] overflow-hidden rounded-xl border border-[#e4d7d2] bg-[#faf7f5]">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4"
        >
          <dt className="text-sm font-medium text-muted-foreground">
            {row.label}
          </dt>
          <dd className="text-sm font-semibold text-[#28161a]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function previewGateStepIndex(
  steps: PlanBuilderStep[],
  form: PlanBuilderFormState,
): number {
  if (form.paymentPattern === "FLEXIBLE_AVERAGE") {
    const flex = steps.findIndex((s) => s.id === "flexible");
    if (flex >= 0) return flex;
  }
  const amount = steps.findIndex((s) => s.id === "amount");
  return amount >= 0 ? amount : 0;
}

function CompactScheduleList({ rows }: { rows: PlanSchedulePreviewRow[] }) {
  return (
    <div className="max-h-52 overflow-y-auto rounded-xl border border-[#e4d7d2] bg-white">
      {rows.map((row) => (
        <div
          key={row.installmentNumber}
          className="flex items-start justify-between gap-2 border-b border-[#f0e6e2] px-3 py-2.5 text-sm last:border-0"
        >
          <span className="shrink-0 font-semibold text-[#5c4a4e]">
            #{row.installmentNumber}
          </span>
          <span className="min-w-0 flex-1 text-muted-foreground">
            {row.dueDate}
          </span>
          <span className="shrink-0 font-bold text-[#28161a]">
            {row.amount.amountDisplay}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PlanBuilderCustomerPreview({
  form,
  steps,
  stepIndex,
  isEdit,
  preview,
  loading,
}: {
  form: PlanBuilderFormState;
  steps: PlanBuilderStep[];
  stepIndex: number;
  isEdit: boolean;
  preview?: PlanSchedulePreviewData;
  loading?: boolean;
}) {
  const isFlexible = form.paymentPattern === "FLEXIBLE_AVERAGE";
  const gateIndex = previewGateStepIndex(steps, form);
  const rulesConfigured = isPlanPreviewReady(form);
  const showSchedule =
    (isEdit || stepIndex >= gateIndex) && rulesConfigured;

  if (!showSchedule) {
    const nextLabel = steps[gateIndex]?.label ?? "contribution rules";
    return (
      <Surface
        title="Customer preview"
        description="Sample enrolment view for staff and app"
      >
        <div className="space-y-4 p-6 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#f7ecee] text-[#7b0a2b]">
            <Eye className="size-5" />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Finish <strong className="text-[#28161a]">{nextLabel}</strong>{" "}
            to generate instalment dates, totals, and maturity.
          </p>
          {stepIndex < gateIndex ? (
            <p className="text-xs text-muted-foreground">
              You&apos;re on step {stepIndex + 1} of {steps.length}.
            </p>
          ) : null}
        </div>
      </Surface>
    );
  }

  const summary = preview?.summary;
  const schedule = preview?.schedule ?? [];
  const hasSummary = Boolean(summary?.freeWindow || summary?.installmentAmount);

  return (
    <div className="space-y-4">
      <AmountSummaryStrip label={amountSummaryLabel(form)} />
      <Surface
        title={isFlexible ? "Enrolment timeline" : "Sample schedule"}
        description={
          isFlexible
            ? "Starting today · free then capped phases"
            : "Sample dates if enrolment starts today"
        }
      >
        <div className="space-y-4 p-4">
          {loading ? (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded-lg bg-muted" />
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : !hasSummary && !schedule.length ? (
            <p className="text-sm text-muted-foreground">
              Preview is loading or could not be calculated. Check duration and
              amounts, then continue to the next step.
            </p>
          ) : (
            <>
              {summary && !summary.freeWindow ? (
                <div className="grid grid-cols-2 gap-2">
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
                      label: "At maturity",
                      value: summary.estimatedMaturityValue.amountDisplay,
                    },
                    summary.maturityDate && {
                      label: "Maturity",
                      value: summary.maturityDate,
                    },
                  ]
                    .filter(Boolean)
                    .map((item) => (
                      <div
                        key={item!.label}
                        className="rounded-lg bg-[#faf7f5] px-3 py-2 ring-1 ring-[#e4d7d2]"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {item!.label}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-[#28161a]">
                          {item!.value}
                        </p>
                      </div>
                    ))}
                </div>
              ) : null}
              {isFlexible ? (
                <PlanSchedulePreviewPanel
                  data={preview}
                  emptyHint="Adjust flexible rules to refresh the timeline."
                />
              ) : schedule.length > 0 ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Due dates
                  </p>
                  <CompactScheduleList rows={schedule} />
                  {schedule[0]?.note ? (
                    <p className="text-xs text-muted-foreground">
                      {schedule[0].note}
                    </p>
                  ) : null}
                </>
              ) : (
                <PlanSchedulePreviewPanel data={preview} />
              )}
            </>
          )}
        </div>
      </Surface>
    </div>
  );
}
