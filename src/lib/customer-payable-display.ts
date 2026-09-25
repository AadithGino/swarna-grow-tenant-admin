import type { CustomerDisplayMode, PayableRange } from "@/src/types/customer";
import type { PayableQuoteBounds } from "@/src/lib/payment-form-validation";

/** True when the customer may type a custom amount (flexible, or fixed with partial/advance). */
export function customerPayableAmountIsEditable(
  range: PayableRange,
  displayMode?: CustomerDisplayMode,
): boolean {
  if (range.model !== "FIXED" && displayMode !== "FIXED") {
    return true;
  }
  return range.minPayable.amountPaise !== range.maxPayable.amountPaise;
}

export function payableQuoteBounds(range?: PayableRange | null): PayableQuoteBounds | undefined {
  if (!range) return undefined;
  const min = range.minPayable.amountPaise / 100;
  const max = range.maxPayable.amountPaise / 100;
  const stepPaise = range.multipleOfPaise ?? 1;
  const multipleOf = stepPaise > 1 ? stepPaise / 100 : undefined;
  const eligible = range.payable !== false && max > 0;
  return { min, max, multipleOf, eligible };
}

export function customerPayablePhaseLabel(
  range: PayableRange,
  displayMode?: CustomerDisplayMode,
): string {
  if (range.model === "FIXED" || displayMode === "FIXED") {
    return "Fixed instalment";
  }
  if (range.phase === "CAPPED" || displayMode === "FLEXIBLE_LOCK_WINDOW") {
    return "Capped phase · this month";
  }
  if (range.phase === "FREE" || displayMode === "FLEXIBLE_FREE_WINDOW") {
    return "Free window · this month";
  }
  return "Flexible · this month";
}

/** Short headline for how much the customer can pay now. */
export function customerPayableHeadline(
  range: PayableRange,
  displayMode?: CustomerDisplayMode,
): string {
  if (range.model === "FIXED" || displayMode === "FIXED") {
    if (!customerPayableAmountIsEditable(range, displayMode)) {
      return range.suggested.amountDisplay;
    }
    return `${range.minPayable.amountDisplay} – ${range.maxPayable.amountDisplay}`;
  }
  if (range.phase === "CAPPED" || displayMode === "FLEXIBLE_LOCK_WINDOW") {
    const room = range.remainingThisCycle ?? range.maxPayable;
    return `${room.amountDisplay} left this month`;
  }
  return `${range.minPayable.amountDisplay} – ${range.maxPayable.amountDisplay} per payment`;
}

export function customerPayableDetailLines(
  range: PayableRange,
  displayMode?: CustomerDisplayMode,
): string[] {
  const lines: string[] = [];
  const isCapped =
    range.phase === "CAPPED" || displayMode === "FLEXIBLE_LOCK_WINDOW";
  const isFree =
    range.model === "FLEXIBLE" &&
    !isCapped &&
    (displayMode === "FLEXIBLE_FREE_WINDOW" ||
      range.phase === "FLEXIBLE" ||
      range.phase === "FREE");

  if (isCapped) {
    if (range.cycleCap) {
      lines.push(`Monthly cap ${range.cycleCap.amountDisplay}`);
    }
    if (range.remainingThisCycle) {
      lines.push(`Remaining this cycle ${range.remainingThisCycle.amountDisplay}`);
    }
    lines.push("Unused allowance does not carry forward.");
  } else if (isFree) {
    lines.push("Contributions are optional in the free window.");
    lines.push(`Each payment: ${range.minPayable.amountDisplay} – ${range.maxPayable.amountDisplay}`);
  } else if (
    range.model === "FIXED" &&
    customerPayableAmountIsEditable(range, displayMode)
  ) {
    if (range.advancePaymentAllowed && (range.maxAdvanceInstallments ?? 0) > 1) {
      lines.push(`You may pay up to ${range.maxPayable.amountDisplay} in one payment.`);
    }
    if (range.partialPaymentAllowed) {
      lines.push(`Partial payments from ${range.minPayable.amountDisplay} are allowed.`);
    }
  }

  if (range.contributionIsOptional && !isFree) {
    lines.push("Payment is optional for this phase.");
  }

  return lines;
}
