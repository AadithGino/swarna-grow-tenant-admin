"use client";

import { money } from "@/src/lib/format";
import type { SettlementPreview } from "@/src/types/domain";
import { cn } from "@/lib/utils";

export function SettlementLinesPanel({
  preview,
  compact,
}: {
  preview: SettlementPreview;
  compact?: boolean;
}) {
  const hasContext = preview.scheme || preview.customer;

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {hasContext ? (
        <div className="rounded-xl border border-[#e8dde2] bg-[#faf6f7] px-4 py-3 text-sm">
          {preview.scheme ? (
            <p className="font-semibold text-[#730321]">
              {preview.scheme.schemeNumber}
              {preview.scheme.planName ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {preview.scheme.planName}
                </span>
              ) : null}
            </p>
          ) : null}
          {preview.customer ? (
            <p className="mt-1 text-muted-foreground">
              {preview.customer.name}
              {preview.customer.passbookNumber
                ? ` · ${preview.customer.passbookNumber}`
                : ""}
              {preview.customer.mobile ? ` · ${preview.customer.mobile}` : ""}
            </p>
          ) : null}
          {preview.scheme?.maturityDate ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Maturity {preview.scheme.maturityDate}
              {preview.scheme.lockInMonths != null ? (
                <>
                  {" "}
                  · {preview.scheme.monthsCompleted ?? 0}/
                  {preview.scheme.lockInMonths} months lock-in
                  {preview.scheme.lockInMet ? " (met)" : ""}
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}

      {!preview.eligible && preview.blockers.length ? (
        <div className="space-y-3">
          {preview.blockers.map((blocker) => (
            <div
              key={blocker.code}
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <strong>{blocker.message}</strong>
              {blocker.eligibleFrom ? (
                <p className="mt-1 text-amber-900/80">
                  Eligible from {blocker.eligibleFrom}
                </p>
              ) : null}
            </div>
          ))}
          {preview.lines.length ? (
            <p className="text-xs text-muted-foreground">
              Settlement breakdown below is for reference — closure is blocked
              until the conditions above are met.
            </p>
          ) : null}
        </div>
      ) : null}
      {preview.warningText ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {preview.warningText}
        </div>
      ) : null}

      {preview.textBenefits.map((benefit) => (
        <div
          key={benefit.displayLabel}
          className="rounded-xl border-2 border-[#eadbb5] bg-[#fff8e8] p-4 text-sm"
        >
          <strong className="text-[#805817]">{benefit.displayLabel}</strong>
          <p className="mt-2 leading-6 text-[#5c4a2a]">{benefit.text}</p>
          <p className="mt-2 font-medium text-[#805817]">{benefit.note}</p>
        </div>
      ))}

      {preview.lines.length ? (
        <>
          <div className="overflow-hidden rounded-xl border border-[#e8dde2] bg-white">
            <div className="border-b bg-[#faf6f7] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Settlement computation
            </div>
            <ul className="divide-y divide-[#efe6ea]">
              {preview.lines.map((line) => (
                <li
                  key={line.key}
                  className={cn(
                    "flex items-start justify-between gap-4 px-4 py-3 text-sm",
                    line.forfeited && "opacity-70",
                  )}
                >
                  <div className="min-w-0">
                    <span
                      className={cn(
                        "font-medium",
                        line.forfeited && "line-through",
                      )}
                    >
                      {line.label}
                    </span>
                    {line.forfeitReason ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {line.forfeitReason}
                      </p>
                    ) : null}
                    {line.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {line.note}
                      </p>
                    ) : null}
                    {line.weightDisplay ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {line.weightDisplay}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      line.sign === "-" ? "text-red-700" : "text-emerald-800",
                    )}
                  >
                    {line.sign}
                    {line.weightDisplay && !line.amount
                      ? line.weightDisplay
                      : money(line.amount)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-[#e8dde2] bg-[#fdfafb] px-4 py-3">
              <span className="font-bold">Final settlement</span>
              <span className="text-lg font-bold tabular-nums text-[#730321]">
                {money(preview.finalValue)}
                {preview.finalWeightDisplay ? (
                  <span className="ml-2 text-sm font-semibold text-muted-foreground">
                    · {preview.finalWeightDisplay}
                  </span>
                ) : null}
              </span>
            </div>
          </div>

          {preview.valuationNote ? (
            <p className="text-xs text-muted-foreground">
              {preview.valuationNote}
            </p>
          ) : null}

          {preview.approvalRequired ? (
            <p className="text-xs text-muted-foreground">
              {preview.approvalReason ??
                "Admin approval is required before the scheme can be closed."}
            </p>
          ) : null}
        </>
      ) : !preview.eligible && preview.blockers.length ? null : (
        <p className="text-sm text-muted-foreground">
          No settlement lines available for this scheme.
        </p>
      )}
    </div>
  );
}
