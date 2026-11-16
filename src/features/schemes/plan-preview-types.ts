import type { CollectionFrequency } from "@/src/types/collection";
import type { OneTimeGoldRules } from "@/src/types/one-time-gold";

/** Response shape from POST /admin/scheme-plans/preview-schedule (05 §9). */

export type MoneyDisplay = {
  amountPaise: number;
  amountDisplay: string;
};

export type PlanSchedulePreviewSummary = {
  installmentCount?: number;
  collectionFrequency?: CollectionFrequency;
  installmentAmount?: MoneyDisplay;
  totalPayable?: MoneyDisplay;
  firstDueDate?: string;
  maturityDate?: string;
  oneTimeRules?: OneTimeGoldRules;
  oneTimeSchedule?: Array<{ period: number; dueDate: string }>;
  benefit?: {
    type?: string;
    displayLabel?: string;
    estimatedValue?: MoneyDisplay;
  };
  estimatedMaturityValue?: MoneyDisplay | null;
  estimatedGoldAtCurrentRate?: MoneyDisplay | null;
  freeWindow?: {
    months?: number;
    from?: string;
    to?: string;
    minPerPayment?: MoneyDisplay;
    maxPerPayment?: MoneyDisplay;
  };
  cappedPhase?: {
    cycles?: number;
    from?: string;
    to?: string;
    note?: string;
  };
};

export type PlanSchedulePreviewRow = {
  installmentNumber: number;
  dueDate: string;
  amount: MoneyDisplay;
  note?: string | null;
};

export type PlanSchedulePreviewData = {
  summary: PlanSchedulePreviewSummary;
  schedule: PlanSchedulePreviewRow[];
};
