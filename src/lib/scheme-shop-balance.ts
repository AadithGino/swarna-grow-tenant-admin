export type SchemeShopBalanceSummary = {
  orderCount?: number;
  basis?: string;
  totalAppliedPaise?: number;
  totalAppliedWeightMg?: number;
  usedLabel?: string | null;
  availableBasis?: string;
  availableUnits?: number;
  availableLabel?: string | null;
  summaryLine?: string | null;
};

export type CustomerShopBalanceOverview = {
  orderCount?: number;
  summaryLine?: string;
  usedPaise?: number;
  usedWeightMg?: number;
  availablePaise?: number;
  availableWeightMg?: number;
};

export function schemeShopBalanceVisible(summary?: SchemeShopBalanceSummary | null) {
  return Boolean(summary?.summaryLine || summary?.usedLabel || (summary?.orderCount ?? 0) > 0);
}