import type { CustomerSchemeDetail, PaymentListItem } from "@/src/types/customer";

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

export function buildFixedSchedule(scheme: CustomerSchemeDetail): ScheduleRow[] {
  const paid = scheme.progressCard.installmentsPaid ?? 0;
  const total = scheme.progressCard.installmentsTotal ?? 0;
  const amountDisplay =
    scheme.nextActionAmount?.amountDisplay ??
    scheme.payableRange?.suggested?.amountDisplay ??
    scheme.payableRange?.maxPayable?.amountDisplay ??
    "—";

  const successPayments = [...(scheme.payments ?? [])]
    .filter((p): p is PaymentListItem & { paidAt: string } => p.status === "SUCCESS" && Boolean(p.paidAt))
    .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());

  const benefitIndex = schemeHasBenefitInstalment(scheme, total) ? total - 1 : null;
  let paymentPointer = 0;
  let payableCounter = 0;

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
    } else if (status === "DUE" && !isBenefit && scheme.nextActionLabel) {
      const part = scheme.nextActionLabel.split("·").pop()?.trim();
      if (part && /\d/.test(part)) label = formatScheduleDateLabel(part);
      else label = new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    } else if (status === "UPCOMING" && !isBenefit) {
      const base = new Date();
      base.setMonth(base.getMonth() + (index - paid));
      label = base.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
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
