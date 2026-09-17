"use client";

import { cn } from "@/lib/utils";
import type { CustomerDisplayMode, PayableRange } from "@/src/types/customer";
import {
  customerPayableAmountIsEditable,
  customerPayableDetailLines,
  customerPayableHeadline,
  customerPayablePhaseLabel,
} from "@/src/lib/customer-payable-display";

export function CustomerPayableSummary({
  range,
  displayMode,
  compact,
  className,
}: {
  range: PayableRange;
  displayMode?: CustomerDisplayMode;
  compact?: boolean;
  className?: string;
}) {
  const amountEditable = customerPayableAmountIsEditable(range, displayMode);
  const phase = customerPayablePhaseLabel(range, displayMode);
  const headline = customerPayableHeadline(range, displayMode);
  const details = customerPayableDetailLines(range, displayMode);

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#ead49a] bg-[#fff9e9]",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <p className="text-[0.68rem] font-extrabold uppercase tracking-[.12em] text-[#9a7218]">
        {phase}
      </p>
      <p className={cn("mt-1 font-black text-[#4a3820]", compact ? "text-base" : "text-lg")}>
        {headline}
      </p>
      {!compact && amountEditable && range.helperText ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{range.helperText}</p>
      ) : null}
      {!amountEditable && (range.model === "FIXED" || displayMode === "FIXED") ? (
        <p className="mt-1 text-xs text-muted-foreground">This instalment amount is fixed for your plan.</p>
      ) : null}
      {details.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[0.68rem] leading-relaxed text-[#706b55]">
          {details.map((line) => (
            <li key={line} className="flex gap-1.5">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#c9a227]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
