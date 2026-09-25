/** Payment months: free + capped phases must match this (not maturity duration). */
export function flexiblePhaseTargetMonths(input: {
  durationMonths: number;
  installmentCount: number;
}): number {
  return input.installmentCount;
}
