export type OneTimeGoldRules = {
  timing: "AT_MATURITY" | "MONTHLY";
  basis: "PRINCIPAL_PERCENT" | "FIXED_WEIGHT_MG" | "RUPEE_PAISE";
  value: number;
  amountPeriod: "TERM_TOTAL" | "PER_PERIOD";
};

export type OneTimeGoldProgress = {
  rules: OneTimeGoldRules;
  fundedOn?: string;
  maturityDate?: string;
  principalWeightMg: number;
  originalPaidPaise: number;
  fundingRatePerGramPaise?: number;
  creditedWeightMg: number;
  redeemableBonusWeightMg: number;
  nextCreditDate?: string;
  periods: Array<{ period: number; dueDate: string; status: string; weightMg: number; ratePerGramPaise?: number }>;
};

export function oneTimeBonusLabel(rules: OneTimeGoldRules) {
  const value = rules.basis === "PRINCIPAL_PERCENT" ? `${rules.value}% of principal gold`
    : rules.basis === "FIXED_WEIGHT_MG" ? `${rules.value / 1000} g` : `₹${rules.value / 100}`;
  return `${value} ${rules.amountPeriod === "TERM_TOTAL" ? "for the term" : "per credit"} · ${rules.timing === "MONTHLY" ? "Credited monthly" : "Credited at maturity"}`;
}
