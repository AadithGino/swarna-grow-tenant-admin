/** Plan defaults aligned with contract examples (05 / 06 / 07). */
export const CAPPED_CYCLE_NORMAL_MIN = 1000;
export const CAPPED_CYCLE_INCREMENT = 100;

export function cappedCyclePayableBounds(
  remaining: number,
  normalMin = CAPPED_CYCLE_NORMAL_MIN,
  increment = CAPPED_CYCLE_INCREMENT,
) {
  const max = Math.max(0, remaining);
  const finalRemainderException = max > 0 && max < normalMin;
  let min = normalMin;
  if (max === 0) {
    min = 0;
  } else if (finalRemainderException) {
    min = Math.min(increment, max);
  } else {
    min = Math.min(normalMin, max);
  }
  return {
    min,
    max,
    finalRemainderException,
    multipleOf: increment,
    suggested: max > 0 ? Math.min(max, max) : null,
  };
}

export function amountMatchesIncrement(
  amount: number,
  multipleOf: number | undefined,
  max: number,
) {
  if (!multipleOf || multipleOf <= 0) return true;
  if (amount === max) return true;
  return amount % multipleOf === 0;
}

export function amountWithinPayableQuote(
  amount: number,
  quote: {
    min: number;
    max: number;
    multipleOf?: number;
    eligible?: boolean;
  },
) {
  if (!quote.eligible) return false;
  if (amount < quote.min || amount > quote.max) return false;
  return amountMatchesIncrement(amount, quote.multipleOf, quote.max);
}
