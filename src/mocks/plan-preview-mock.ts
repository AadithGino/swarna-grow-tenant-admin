import type { CollectionRules } from "@/src/types/collection";
import type { OneTimeGoldRules } from "@/src/types/one-time-gold";
import type { PlanSchedulePreviewData } from "@/src/features/schemes/plan-preview-types";
import type { SchemePlan } from "@/src/types/domain";
import { synthesizePlanDetail } from "./plan-detail-mock";

function money(paise: number) {
  return {
    amountPaise: paise,
    amountDisplay: `₹${(paise / 100).toLocaleString("en-IN")}`,
  };
}

function addMonths(iso: string, months: number, day = Number(iso.slice(8))) {
  const date = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Build contract-shaped preview from POST body (saved planId or unsaved draft fields). */
export function buildPlanSchedulePreview(
  body: Record<string, unknown>,
  planRow?: SchemePlan,
): PlanSchedulePreviewData {
  const merged: Record<string, unknown> = planRow
    ? synthesizePlanDetail(planRow)
    : body;

  const pattern = String(
    merged.paymentPattern ?? body.paymentPattern ?? "FIXED",
  );
  const startDate = String(body.startDate ?? new Date().toISOString().slice(0, 10));
  const installmentPaise = Number(
    body.installmentAmountPaise ??
      (merged.amountRules as Record<string, unknown>)?.minInstallmentPaise ??
      500000,
  );
  const count = Number(
    merged.installmentCount ?? merged.durationMonths ?? body.installmentCount ?? 11,
  );
  const scheduleRules = (merged.scheduleRules ?? {}) as Record<string, unknown>;
  const dueDay = Number(scheduleRules.dueDayOfMonth ?? startDate.slice(8));
  const firstMode = String(body.firstInstallmentMode ?? scheduleRules.firstInstallmentModeDefault ?? "START_NEXT_CYCLE");
  const collectNow = firstMode === "COLLECT_NOW";
  const duration = Number(merged.durationMonths ?? count);
  const oneTimeRules = merged.oneTimeRules as OneTimeGoldRules | undefined;
  const collection = merged.collectionRules as CollectionRules | undefined;
  const benefit = (merged.benefit ?? {}) as Record<string, unknown>;
  const flex = (merged.flexibleRules ?? {}) as Record<string, unknown>;
  const flexPhase = (flex.flexiblePhase ?? {}) as Record<string, unknown>;

  if (pattern === "FLEXIBLE") {
    const freeMonths = Number(flex.flexiblePhaseCycles ?? 6);
    const cappedCycles = Number(flex.cappedPhaseCycles ?? 5);
    const shift = collectNow ? 0 : 1;
    const capComputation = (flex.capComputation ?? {}) as Record<string, unknown>;
    const capDivisor = capComputation.formula === "FLEXIBLE_PHASE_TOTAL_DIV_PAYMENT_COUNT"
      ? "number of payments in the free phase"
      : String(flex.averagingDivisor ?? freeMonths);
    const cappedStart = addMonths(startDate, freeMonths + shift, 1);
    return {
      summary: {
        freeWindow: {
          months: freeMonths,
          from: collectNow ? startDate : addMonths(startDate, shift, 1),
          to: addDays(cappedStart, -1),
          minPerPayment: money(
            Number(flexPhase.minimumPaymentPaise ?? 50000),
          ),
          maxPerPayment: money(
            Number(flexPhase.maximumPaymentPaise ?? 10000000),
          ),
        },
        cappedPhase: {
          cycles: cappedCycles,
          from: cappedStart,
          to: addDays(addMonths(startDate, freeMonths + cappedCycles + shift, 1), -1),
          note: `Monthly cap is based on free-phase contributions divided by ${capDivisor}, then adjusted by the plan’s rounding and limits.`,
        },
        maturityDate: addDays(addMonths(startDate, duration + shift, 1), -1),
        benefit: {
          type: String(benefit.type ?? ""),
          displayLabel: String(benefit.displayLabel ?? ""),
        },
      },
      schedule: [],
    };
  }

  const fixedMaturity = addDays(addMonths(startDate, duration + (collectNow ? 0 : 1), 1), -1);
  const anniversaryMaturity = addMonths(startDate, duration);
  const anniversaryCollection = collection && collection.maturityRule !== "CALENDAR_MONTH_END";
  const maturityDate = oneTimeRules || anniversaryCollection
    ? anniversaryMaturity
    : fixedMaturity;
  const oneTimeSchedule = oneTimeRules && (oneTimeRules.timing === "MONTHLY"
    ? Array.from({ length: duration }, (_, index) => ({ period: index + 1, dueDate: addMonths(startDate, index + 1) }))
    : [{ period: 1, dueDate: maturityDate }]);
  const collectionFrequency = body.collectionFrequency as CollectionRules["frequencies"][number] | undefined ?? collection?.frequencies[0];
  const dueDates: string[] = [];

  if (oneTimeRules) {
    dueDates.push(startDate);
  } else if (collection) {
    for (let index = collectNow ? 0 : 1; ; index += 1) {
      const date = collectionFrequency === "MONTHLY"
        ? addMonths(startDate, index)
        : addDays(startDate, index * (collectionFrequency === "WEEKLY" ? 7 : 1));
      if (anniversaryCollection ? date >= maturityDate : date > maturityDate) break;
      dueDates.push(date);
    }
  } else {
    const anniversary = scheduleRules.dueDateRule === "JOIN_ANNIVERSARY";
    const thisMonth = addMonths(startDate, 0, dueDay);
    const firstDue = collectNow ? startDate : anniversary
      ? addMonths(startDate, 1)
      : thisMonth > startDate ? thisMonth : addMonths(startDate, 1, dueDay);
    for (let index = 0; index < count; index += 1) {
      dueDates.push(index === 0 ? firstDue : addMonths(firstDue, index, anniversary ? undefined : dueDay));
    }
  }

  const splitTarget = collection?.amountBasis === "TOTAL_TARGET";
  const totalPaise = splitTarget ? installmentPaise : installmentPaise * dueDates.length;
  const splitAmount = splitTarget ? Math.floor(totalPaise / dueDates.length) : installmentPaise;
  const schedule = dueDates.map((dueDate, index) => ({
    installmentNumber: index + 1,
    dueDate,
    amount: money(splitAmount + (splitTarget && index === dueDates.length - 1 ? totalPaise % dueDates.length : 0)),
    note: index === 0 && dueDate === startDate ? "Collected at enrolment" : null,
  }));
  let benefitPaise = benefit.type === "ONE_FREE_INSTALLMENT" ? installmentPaise : 0;
  if (benefit.type === "FIXED_BONUS_AMOUNT") {
    const value = Number(benefit.bonusValue ?? 0);
    benefitPaise = benefit.bonusBasis === "PERCENT_OF_PAID" ? Math.floor(totalPaise * value / 100) : value;
    if (benefit.maxBonusPaise) benefitPaise = Math.min(benefitPaise, Number(benefit.maxBonusPaise));
  }

  return {
    summary: {
      installmentCount: schedule.length,
      collectionFrequency,
      installmentAmount: schedule[0]?.amount,
      totalPayable: money(totalPaise),
      firstDueDate: schedule[0]?.dueDate,
      maturityDate,
      ...(oneTimeSchedule ? { oneTimeRules, oneTimeSchedule } : {}),
      benefit: {
        type: String(benefit.type ?? ""),
        displayLabel: String(benefit.displayLabel ?? ""),
        estimatedValue: benefitPaise ? money(benefitPaise) : undefined,
      },
      estimatedMaturityValue: merged.valueBasis === "GOLD_WEIGHT" ? null : money(totalPaise + benefitPaise),
      estimatedGoldAtCurrentRate: null,
    },
    schedule,
  };
}
