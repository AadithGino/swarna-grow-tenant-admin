/** Read contract plan objects (05-scheme-plans.md) for detail UI. */

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function moneyField(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "—";
  if ("amountDisplay" in obj) return String((obj as { amountDisplay: string }).amountDisplay);
  if ("weightDisplay" in obj) return String((obj as { weightDisplay: string }).weightDisplay);
  return "—";
}

export type FieldEntry = { label: string; value: string };

export function amountRulesFields(rules: Record<string, unknown>): FieldEntry[] {
  const slabs = rules.slabsPaise as number[] | null | undefined;
  return [
    { label: "Amount mode", value: humanize(String(rules.amountMode ?? "—")) },
    {
      label: "Fixed amount",
      value: rules.fixedAmountPaise
        ? moneyField({ amountDisplay: `₹${Number(rules.fixedAmountPaise) / 100}` })
        : "—",
    },
    {
      label: "Slabs",
      value: slabs?.length
        ? slabs.map((p) => `₹${(p / 100).toLocaleString("en-IN")}`).join(" · ")
        : "—",
    },
    {
      label: "Min installment",
      value: rules.minInstallmentPaise
        ? moneyField({
            amountDisplay: `₹${(Number(rules.minInstallmentPaise) / 100).toLocaleString("en-IN")}`,
          })
        : "—",
    },
    {
      label: "Max installment",
      value: rules.maxInstallmentPaise
        ? moneyField({
            amountDisplay: `₹${(Number(rules.maxInstallmentPaise) / 100).toLocaleString("en-IN")}`,
          })
        : "—",
    },
    {
      label: "Multiple of",
      value: rules.multipleOfPaise
        ? moneyField({
            amountDisplay: `₹${(Number(rules.multipleOfPaise) / 100).toLocaleString("en-IN")}`,
          })
        : "—",
    },
  ];
}

export function scheduleRulesFields(
  schedule: Record<string, unknown> | null | undefined,
): FieldEntry[] {
  if (!schedule) return [{ label: "Schedule", value: "Not used (flexible plan)" }];
  return [
    { label: "Due date rule", value: humanize(String(schedule.dueDateRule ?? "—")) },
    { label: "Due day of month", value: String(schedule.dueDayOfMonth ?? "—") },
    { label: "Grace days", value: String(schedule.graceDays ?? "—") },
    {
      label: "First installment default",
      value: humanize(String(schedule.firstInstallmentModeDefault ?? "—")),
    },
    {
      label: "First installment editable",
      value: schedule.firstInstallmentModeEditable ? "Yes" : "No",
    },
  ];
}

export function paymentRulesFields(payment: Record<string, unknown>): FieldEntry[] {
  return [
    {
      label: "Partial payments",
      value: payment.partialPaymentAllowed ? "Allowed" : "Not allowed",
    },
    {
      label: "Advance payments",
      value: payment.advancePaymentAllowed ? "Allowed" : "Not allowed",
    },
    { label: "Max advance installments", value: String(payment.maxAdvanceInstallments ?? "—") },
    {
      label: "Min per transaction",
      value: payment.minPaymentPaise
        ? moneyField({
            amountDisplay: `₹${(Number(payment.minPaymentPaise) / 100).toLocaleString("en-IN")}`,
          })
        : "—",
    },
    {
      label: "Max per transaction",
      value: payment.maxPaymentPerTransactionPaise
        ? moneyField({
            amountDisplay: `₹${(Number(payment.maxPaymentPerTransactionPaise) / 100).toLocaleString("en-IN")}`,
          })
        : "—",
    },
  ];
}

export function flexibleRulesFields(flex: Record<string, unknown>): FieldEntry[] {
  const flexPhase = (flex.flexiblePhase ?? {}) as Record<string, unknown>;
  const cap = (flex.capComputation ?? {}) as Record<string, unknown>;
  const capped = (flex.cappedPhase ?? {}) as Record<string, unknown>;
  return [
    { label: "Phase mode", value: humanize(String(flex.phaseMode ?? "—")) },
    { label: "Cap mode", value: humanize(String(flex.capMode ?? "—")) },
    { label: "Carry forward", value: humanize(String(flex.carryForwardMode ?? "—")) },
    { label: "Flexible phase cycles", value: String(flex.flexiblePhaseCycles ?? "—") },
    { label: "Capped phase cycles", value: String(flex.cappedPhaseCycles ?? "—") },
    { label: "Averaging divisor", value: String(flex.averagingDivisor ?? "—") },
    { label: "Frequency mode", value: humanize(String(flex.frequencyMode ?? "—")) },
    {
      label: "Free phase min payment",
      value: moneyField({
        amountDisplay: flexPhase.minimumPaymentPaise
          ? `₹${(Number(flexPhase.minimumPaymentPaise) / 100).toLocaleString("en-IN")}`
          : "—",
      }),
    },
    {
      label: "Free phase max payment",
      value: moneyField({
        amountDisplay: flexPhase.maximumPaymentPaise
          ? `₹${(Number(flexPhase.maximumPaymentPaise) / 100).toLocaleString("en-IN")}`
          : "—",
      }),
    },
    {
      label: "Min total (free phase)",
      value: moneyField({
        amountDisplay: flexPhase.minTotalPaise
          ? `₹${(Number(flexPhase.minTotalPaise) / 100).toLocaleString("en-IN")}`
          : "—",
      }),
    },
    { label: "Cap formula", value: humanize(String(cap.formula ?? "—")) },
    { label: "Cap rounding", value: humanize(String(cap.roundingMode ?? "—")) },
    {
      label: "Round to nearest",
      value: moneyField({
        amountDisplay: cap.roundToNearestPaise
          ? `₹${(Number(cap.roundToNearestPaise) / 100).toLocaleString("en-IN")}`
          : "—",
      }),
    },
    {
      label: "Min / max cycle cap",
      value: `${cap.minCycleCapPaise ? `₹${Number(cap.minCycleCapPaise) / 100}` : "—"} – ${cap.maxCycleCapPaise ? `₹${Number(cap.maxCycleCapPaise) / 100}` : "—"}`,
    },
    {
      label: "On zero flexible total",
      value: humanize(String(cap.onZeroFlexiblePhaseTotal ?? "—")),
    },
    {
      label: "On below minimum total",
      value: humanize(String(cap.onBelowMinimumTotal ?? "—")),
    },
    {
      label: "Capped min payment",
      value: moneyField({
        amountDisplay: capped.minimumPaymentPaise
          ? `₹${(Number(capped.minimumPaymentPaise) / 100).toLocaleString("en-IN")}`
          : "—",
      }),
    },
    {
      label: "Final remainder below min",
      value: capped.allowFinalRemainderBelowMinimum ? "Allowed" : "Not allowed",
    },
    {
      label: "Future cycle payment",
      value: capped.allowFutureCyclePayment ? "Allowed" : "Not allowed",
    },
    { label: "Max advance cycles", value: String(capped.maxAdvanceCycles ?? "—") },
  ];
}

export function benefitFields(benefit: Record<string, unknown>): FieldEntry[] {
  const elig = (benefit.eligibility ?? {}) as Record<string, unknown>;
  const rows: FieldEntry[] = [
    { label: "Type", value: humanize(String(benefit.type ?? "—")) },
    { label: "Display label", value: String(benefit.displayLabel ?? "—") },
  ];
  if (benefit.type === "FIXED_BONUS_AMOUNT") {
    rows.push(
      { label: "Bonus basis", value: humanize(String(benefit.bonusBasis ?? "—")) },
      { label: "Bonus value", value: String(benefit.bonusValue ?? "—") },
      {
        label: "Max bonus",
        value: benefit.maxBonusPaise
          ? moneyField({
              amountDisplay: `₹${(Number(benefit.maxBonusPaise) / 100).toLocaleString("en-IN")}`,
            })
          : "—",
      },
    );
  }
  if (benefit.type === "TEXT_ONLY") {
    rows.push({ label: "Text benefit", value: String(benefit.textBenefit ?? "—") });
  }
  if (benefit.type === "ONE_FREE_INSTALLMENT") {
    rows.push(
      {
        label: "Require all installments paid",
        value: elig.requireAllInstallmentsPaid ? "Yes" : "No",
      },
      { label: "Max allowed defaults", value: String(elig.maxAllowedDefaults ?? "—") },
      { label: "Min months completed", value: String(elig.minMonthsCompleted ?? "—") },
    );
  }
  return rows;
}

export function goldRulesFields(gold: Record<string, unknown>): FieldEntry[] {
  return [
    { label: "Rate source", value: humanize(String(gold.rateSource ?? "—")) },
    {
      label: "Weight rounding",
      value: humanize(String(gold.weightRoundingMode ?? "—")),
    },
    { label: "Weight precision (mg)", value: String(gold.weightPrecisionMg ?? "—") },
    {
      label: "Block if rate not set",
      value: gold.blockPaymentIfRateNotSet ? "Yes" : "No",
    },
  ];
}

export function penaltyDisplay(penalty: Record<string, unknown>): string {
  const mode = String(penalty.mode ?? "NONE");
  if (mode === "NONE") return "None";
  if (mode === "FLAT") {
    const flat =
      penalty.flatPaise ?? penalty.value;
    return `Flat ${flat ? `₹${Number(flat) / 100}` : "—"} · benefit ${humanize(String(penalty.benefitTreatment ?? ""))}`;
  }
  return `${penalty.value ?? "—"}% of paid · benefit ${humanize(String(penalty.benefitTreatment ?? ""))}`;
}
