export const COLLECTION_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type CollectionFrequency = (typeof COLLECTION_FREQUENCIES)[number];

export interface MaturityGoldRules {
  bonusBasis: "NET_GOLD_WEIGHT" | "NET_PAID_AT_MATURITY_RATE";
  bonusPercent: number;
  requireAllCollections: boolean;
}

export interface CollectionRules extends Partial<MaturityGoldRules> {
  frequencies: CollectionFrequency[];
  amountBasis: "PER_COLLECTION" | "TOTAL_TARGET";
  maturityRule: "ENROLMENT_ANNIVERSARY" | "FIRST_PAYMENT_ANNIVERSARY" | "CALENDAR_MONTH_END";
}

export function resolveMaturityGoldRules(benefit: Record<string, unknown>, collection?: CollectionRules): MaturityGoldRules | undefined {
  if (benefit.type === "MATURITY_GOLD_CREDIT") return benefit.goldBonus as MaturityGoldRules | undefined;
  if (!collection?.bonusBasis || !collection.bonusPercent) return undefined;
  return { bonusBasis: collection.bonusBasis, bonusPercent: collection.bonusPercent, requireAllCollections: collection.requireAllCollections ?? true };
}

export const MATURITY_GOLD_BASIS_LABELS: Record<MaturityGoldRules["bonusBasis"], string> = {
  NET_GOLD_WEIGHT: "Net gold accumulated",
  NET_PAID_AT_MATURITY_RATE: "Net payments converted at the maturity gold rate",
};

export interface CollectionBonus {
  status: "PENDING" | "PENDING_RATE" | "CREDITED" | "INELIGIBLE";
  weightMg: number;
  estimatedWeightMg?: number;
  postedAt?: string;
}

export const COLLECTION_FREQUENCY_LABELS: Record<CollectionFrequency, string> = {
  DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly",
};
