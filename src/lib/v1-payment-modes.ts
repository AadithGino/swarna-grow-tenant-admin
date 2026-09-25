/** Manual payment modes supported by backend V1 (7582ac6+). CHEQUE is not accepted. */
export const V1_MANUAL_PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card / POS" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
] as const;

export type V1ManualPaymentMode = (typeof V1_MANUAL_PAYMENT_MODES)[number]["value"];

export const V1_REDEMPTION_MODES = [
  "CASH",
  "GOLD_HANDOVER",
  "PURCHASE_ADJUSTMENT",
] as const;

export type V1RedemptionMode = (typeof V1_REDEMPTION_MODES)[number];

export const V1_BENEFIT_TREATMENTS = ["FORFEIT", "FULL"] as const;
export type V1BenefitTreatment = (typeof V1_BENEFIT_TREATMENTS)[number];
