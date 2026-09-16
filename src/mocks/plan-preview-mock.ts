import type { PlanSchedulePreviewData } from "@/src/features/schemes/plan-preview-types";
import type { SchemePlan } from "@/src/types/domain";
import { synthesizePlanDetail } from "./plan-detail-mock";

function money(paise: number) {
  return {
    amountPaise: paise,
    amountDisplay: `₹${(paise / 100).toLocaleString("en-IN")}`,
  };
}

function addMonths(iso: string, months: number, day: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  d.setDate(day);
  return d.toISOString().slice(0, 10);
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
  const dueDay = Number(scheduleRules.dueDayOfMonth ?? 10);
  const firstMode = String(body.firstInstallmentMode ?? "COLLECT_NOW");
  const benefit = (merged.benefit ?? {}) as Record<string, unknown>;
  const flex = (merged.flexibleRules ?? {}) as Record<string, unknown>;
  const flexPhase = (flex.flexiblePhase ?? {}) as Record<string, unknown>;

  if (pattern === "FLEXIBLE") {
    const freeMonths = Number(flex.flexiblePhaseCycles ?? 6);
    const cappedCycles = Number(flex.cappedPhaseCycles ?? 5);
    return {
      summary: {
        freeWindow: {
          months: freeMonths,
          from: startDate,
          to: addMonths(startDate, freeMonths, dueDay),
          minPerPayment: money(
            Number(flexPhase.minimumPaymentPaise ?? 50000),
          ),
          maxPerPayment: money(
            Number(flexPhase.maximumPaymentPaise ?? 10000000),
          ),
        },
        cappedPhase: {
          cycles: cappedCycles,
          from: addMonths(startDate, freeMonths, dueDay),
          to: addMonths(startDate, freeMonths + cappedCycles, dueDay),
          note: `Each of these ${cappedCycles} cycles is capped at the average of your first ${freeMonths} cycles' payments.`,
        },
        maturityDate: addMonths(startDate, freeMonths + cappedCycles, dueDay),
        benefit: {
          type: String(benefit.type ?? ""),
          displayLabel: String(benefit.displayLabel ?? ""),
        },
      },
      schedule: [],
    };
  }

  const schedule: PlanSchedulePreviewData["schedule"] = [];
  for (let i = 0; i < count; i++) {
    const dueDate =
      i === 0 && firstMode === "COLLECT_NOW"
        ? startDate
        : addMonths(startDate, i + (firstMode === "COLLECT_NOW" ? 0 : 1), dueDay);
    schedule.push({
      installmentNumber: i + 1,
      dueDate,
      amount: money(installmentPaise),
      note:
        i === 0 && firstMode === "COLLECT_NOW"
          ? "Collected at enrolment"
          : null,
    });
  }

  const totalPaise = installmentPaise * count;
  const benefitPaise =
    benefit.type === "ONE_FREE_INSTALLMENT" ? installmentPaise : 0;

  return {
    summary: {
      installmentCount: count,
      installmentAmount: money(installmentPaise),
      totalPayable: money(totalPaise),
      firstDueDate: schedule[0]?.dueDate,
      maturityDate: schedule[schedule.length - 1]?.dueDate,
      benefit: {
        type: String(benefit.type ?? ""),
        displayLabel: String(benefit.displayLabel ?? ""),
        estimatedValue: benefitPaise ? money(benefitPaise) : undefined,
      },
      estimatedMaturityValue: money(totalPaise + benefitPaise),
      estimatedGoldAtCurrentRate: null,
    },
    schedule,
  };
}
