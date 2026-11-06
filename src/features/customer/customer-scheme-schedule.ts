import type {
  CustomerInstallmentScheduleRow,
  CustomerSchemeDetail,
  PaymentListItem,
} from "@/src/types/customer";

export type ScheduleStatus = "PAID" | "DUE" | "UPCOMING" | "BENEFIT";

export type ScheduleRow = {
  key: string;
  label: string;
  amountDisplay: string;
  status: ScheduleStatus;
  stepLabel: string;
  isBenefit: boolean;
  payment?: PaymentListItem;
  detailLine?: string;
};

export function formatScheduleDateLabel(raw: string) {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return trimmed;
}

function schemeHasBenefitInstalment(scheme: CustomerSchemeDetail, total: number) {
  if (total <= 1) return false;
  const text = `${scheme.planName ?? ""} ${scheme.benefitLabel ?? ""} ${scheme.maturityBenefit?.title ?? ""}`;
  return /\+\s*1\b/i.test(text) || /one free instalment/i.test(text) || /11\s*\+\s*1/i.test(text);
}

function mapInstallmentStatus(apiStatus: string): ScheduleStatus {
  const status = String(apiStatus ?? "").toUpperCase();
  if (["PAID", "WAIVED"].includes(status)) return "PAID";
  if (["DUE", "OVERDUE", "PARTIALLY_PAID", "GRACE"].includes(status)) return "DUE";
  return "UPCOMING";
}

function defaultAmountDisplay(scheme: CustomerSchemeDetail): string {
  return (
    scheme.nextActionAmount?.amountDisplay ??
    scheme.payableRange?.suggested?.amountDisplay ??
    scheme.payableRange?.maxPayable?.amountDisplay ??
    "—"
  );
}

function successPaymentsSorted(scheme: CustomerSchemeDetail) {
  return [...(scheme.payments ?? [])]
    .filter((p): p is PaymentListItem & { paidAt: string } => p.status === "SUCCESS" && Boolean(p.paidAt))
    .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
}

function scheduleRowFromInstallment(
  inst: CustomerInstallmentScheduleRow,
  scheme: CustomerSchemeDetail,
  payment: PaymentListItem | undefined,
  amountDisplay: string,
): Pick<ScheduleRow, "label" | "amountDisplay" | "status" | "payment"> {
  const uiStatus = mapInstallmentStatus(inst.status);
  let label = inst.dueDate
    ? formatScheduleDateLabel(String(inst.dueDate).slice(0, 10))
    : `Instalment ${inst.number}`;

  if (uiStatus === "PAID" && payment?.paidAt) {
    label = new Date(payment.paidAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return {
    label,
    amountDisplay:
      inst.remaining?.amountDisplay ??
      inst.amount?.amountDisplay ??
      amountDisplay,
    status: uiStatus,
    payment,
  };
}

function buildFixedScheduleFromApi(scheme: CustomerSchemeDetail): ScheduleRow[] {
  const schedule = [...(scheme.installmentSchedule ?? [])].sort(
    (a, b) => a.number - b.number,
  );
  const paid = scheme.progressCard.installmentsPaid ?? 0;
  const total = scheme.progressCard.installmentsTotal ?? schedule.length;
  const amountDisplay = defaultAmountDisplay(scheme);
  const successPayments = successPaymentsSorted(scheme);
  const benefitIndex = schemeHasBenefitInstalment(scheme, total) ? total - 1 : null;
  let paymentPointer = 0;

  const byNumber = new Map(schedule.map((row) => [row.number, row]));
  const rows: ScheduleRow[] = [];
  let payableCounter = 0;

  for (let index = 0; index < total; index += 1) {
    const isBenefit = benefitIndex === index;
    if (!isBenefit) payableCounter += 1;

    if (isBenefit) {
      const benefitSummary =
        scheme.maturityBenefit?.summary?.trim() ||
        scheme.benefitLabel?.trim() ||
        scheme.maturityBenefit?.title?.trim() ||
        "Included with your plan at maturity";
      const maturityLine = scheme.maturityDate
        ? `On ${formatScheduleDateLabel(scheme.maturityDate.slice(0, 10))}`
        : undefined;
      rows.push({
        key: `inst-${index}`,
        label: "Maturity benefit",
        amountDisplay: benefitSummary,
        status: index < paid ? "PAID" : "BENEFIT",
        stepLabel: "Benefit",
        isBenefit: true,
        detailLine: maturityLine,
      });
      continue;
    }

    const inst = byNumber.get(payableCounter);
    if (!inst) break;

    let payment: PaymentListItem | undefined;
    const uiStatus = mapInstallmentStatus(inst.status);
    if (uiStatus === "PAID" && paymentPointer < successPayments.length) {
      payment = successPayments[paymentPointer];
      paymentPointer += 1;
    }

    const mapped = scheduleRowFromInstallment(inst, scheme, payment, amountDisplay);
    rows.push({
      key: `inst-${inst.number}`,
      stepLabel: String(inst.number),
      isBenefit: false,
      detailLine: undefined,
      ...mapped,
    });
  }

  return rows;
}

/** Legacy fallback when API omits installmentSchedule (older backend / mocks). */
function buildFixedScheduleLegacy(scheme: CustomerSchemeDetail): ScheduleRow[] {
  const paid = scheme.progressCard.installmentsPaid ?? 0;
  const total = scheme.progressCard.installmentsTotal ?? 0;
  const amountDisplay = defaultAmountDisplay(scheme);
  const successPayments = successPaymentsSorted(scheme);
  const benefitIndex = schemeHasBenefitInstalment(scheme, total) ? total - 1 : null;
  let paymentPointer = 0;
  let payableCounter = 0;

  const anchorYmd =
    successPayments[0]?.paidAt?.slice(0, 10) ??
    scheme.maturityDate?.slice(0, 10) ??
    null;

  const rows: ScheduleRow[] = [];
  for (let index = 0; index < total; index += 1) {
    const isBenefit = benefitIndex === index;
    if (!isBenefit) payableCounter += 1;

    let status: ScheduleStatus;
    if (isBenefit) {
      status = index < paid ? "PAID" : "BENEFIT";
    } else {
      status = index < paid ? "PAID" : index === paid ? "DUE" : "UPCOMING";
    }

    let label = isBenefit ? "Maturity benefit" : `Instalment ${payableCounter}`;
    let payment: PaymentListItem | undefined;

    if (status === "PAID" && !isBenefit && paymentPointer < successPayments.length) {
      payment = successPayments[paymentPointer];
      paymentPointer += 1;
      if (payment.paidAt) {
        label = new Date(payment.paidAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    } else if (!isBenefit && anchorYmd && /^\d{4}-\d{2}-\d{2}$/.test(anchorYmd)) {
      const due = new Date(`${anchorYmd}T00:00:00`);
      due.setMonth(due.getMonth() + (payableCounter - 1));
      label = formatScheduleDateLabel(
        `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`,
      );
    } else if (status === "DUE" && !isBenefit && scheme.nextActionLabel) {
      const part = scheme.nextActionLabel.split("·").pop()?.trim();
      if (part && /\d/.test(part)) label = formatScheduleDateLabel(part);
    }

    const benefitSummary =
      scheme.maturityBenefit?.summary?.trim() ||
      scheme.benefitLabel?.trim() ||
      scheme.maturityBenefit?.title?.trim() ||
      "Included with your plan at maturity";
    const maturityLine =
      isBenefit && scheme.maturityDate
        ? `On ${formatScheduleDateLabel(scheme.maturityDate.slice(0, 10))}`
        : undefined;

    rows.push({
      key: `inst-${index}`,
      label: isBenefit ? "Maturity benefit" : label,
      amountDisplay: isBenefit ? benefitSummary : amountDisplay,
      status,
      stepLabel: isBenefit ? "Benefit" : String(payableCounter),
      isBenefit,
      payment,
      detailLine: maturityLine,
    });
  }
  return rows;
}

export function buildFixedSchedule(scheme: CustomerSchemeDetail): ScheduleRow[] {
  if (scheme.installmentSchedule?.length) {
    return buildFixedScheduleFromApi(scheme);
  }
  return buildFixedScheduleLegacy(scheme);
}
