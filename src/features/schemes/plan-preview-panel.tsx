"use client";

import { COLLECTION_FREQUENCY_LABELS } from "@/src/types/collection";
import { oneTimeBonusLabel } from "@/src/types/one-time-gold";
import type { PlanSchedulePreviewData } from "@/src/features/schemes/plan-preview-types";

function normalizePreviewData(
  data: unknown,
): PlanSchedulePreviewData | undefined {
  if (!data || typeof data !== "object") return undefined;
  const row = data as Record<string, unknown>;
  if (row.summary && Array.isArray(row.schedule)) {
    return data as PlanSchedulePreviewData;
  }
  return undefined;
}

export function PlanSchedulePreviewPanel({
  data,
  emptyHint = "Set duration and amount rules, then continue — the schedule preview updates automatically.",
  loading,
  error,
}: {
  data?: PlanSchedulePreviewData;
  emptyHint?: string;
  loading?: boolean;
  error?: string;
}) {
  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        {error}
      </p>
    );
  }
  const preview = normalizePreviewData(data);
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Updating preview…</p>
    );
  }
  if (!preview?.summary) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>;
  }

  const { summary, schedule } = preview;

  if (summary.oneTimeRules && summary.oneTimeSchedule) {
    return (
      <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2">
          {[
            ["One-time payment", summary.totalPayable?.amountDisplay],
            ["Funded on (sample)", summary.firstDueDate],
            ["Maturity", summary.maturityDate],
          ].map(([label, value]) => value && (
            <div key={label} className="rounded-lg border bg-[#faf7f5] px-3 py-2">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="font-medium">{oneTimeBonusLabel(summary.oneTimeRules)}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bonus credit dates</p>
        <ol className="max-h-48 overflow-y-auto rounded-xl border">
          {summary.oneTimeSchedule.map(({ period, dueDate }) => (
            <li key={period} className="flex justify-between gap-2 border-b px-3 py-2 last:border-0">
              <span>{summary.oneTimeRules?.timing === "MONTHLY" ? `Month ${period}` : "At maturity"}</span>
              <span>{dueDate}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (summary.freeWindow) {
    return (
      <div className="space-y-3 text-sm">
        <div className="rounded-xl border bg-[#faf7f5] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">
            Free window
          </p>
          <p className="mt-1 font-medium">
            {summary.freeWindow.months} months · {summary.freeWindow.from} →{" "}
            {summary.freeWindow.to}
          </p>
          <p className="mt-1 text-muted-foreground">
            {summary.freeWindow.minPerPayment?.amountDisplay} –{" "}
            {summary.freeWindow.maxPerPayment?.amountDisplay} per payment
          </p>
        </div>
        {summary.cappedPhase ? (
          <div className="rounded-xl border bg-[#fff8e8] p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">
              Capped phase
            </p>
            <p className="mt-1 font-medium">
              {summary.cappedPhase.cycles} cycles · {summary.cappedPhase.from} →{" "}
              {summary.cappedPhase.to}
            </p>
            <p className="mt-1 text-muted-foreground">{summary.cappedPhase.note}</p>
          </div>
        ) : null}
        {summary.maturityDate ? (
          <p className="text-muted-foreground">
            Maturity {summary.maturityDate}
          </p>
        ) : null}
        {summary.benefit?.displayLabel ? (
          <p className="font-medium">{summary.benefit.displayLabel}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <dl className="grid gap-2">
        {summary.collectionFrequency && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Collection frequency</dt>
            <dd>{COLLECTION_FREQUENCY_LABELS[summary.collectionFrequency]}</dd>
          </div>
        )}
        {summary.installmentAmount ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Installment</dt>
            <dd className="font-medium">{summary.installmentAmount.amountDisplay}</dd>
          </div>
        ) : null}
        {summary.totalPayable ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Total payable</dt>
            <dd className="font-medium">{summary.totalPayable.amountDisplay}</dd>
          </div>
        ) : null}
        {summary.estimatedMaturityValue ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Est. maturity value</dt>
            <dd className="font-medium">
              {summary.estimatedMaturityValue.amountDisplay}
            </dd>
          </div>
        ) : null}
        {summary.firstDueDate ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">First due</dt>
            <dd>{summary.firstDueDate}</dd>
          </div>
        ) : null}
        {summary.maturityDate ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Maturity</dt>
            <dd>{summary.maturityDate}</dd>
          </div>
        ) : null}
        {summary.benefit?.displayLabel ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Benefit</dt>
            <dd className="text-right font-medium">{summary.benefit.displayLabel}</dd>
          </div>
        ) : null}
      </dl>
      {schedule.length ? (
        <div className="max-h-48 space-y-0 overflow-y-auto rounded-xl border">
          {schedule.map((row) => (
            <div
              key={row.installmentNumber}
              className="flex justify-between gap-2 border-b px-3 py-2 last:border-0"
            >
              <span>#{row.installmentNumber}</span>
              <span className="text-muted-foreground">{row.dueDate}</span>
              <span>{row.amount.amountDisplay}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
