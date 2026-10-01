import type { PaymentGoldAccrual, PaymentListItem } from "@/src/types/customer";
import type { Payment } from "@/src/types/domain";

function formatRatePerGram(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatWeight(mg: number): string {
  return `${(mg / 1000).toFixed(3)} g`;
}

/** Normalize gold accrual from API DTO or raw payment fields. */
export function readGoldAccrual(raw: Record<string, unknown> | undefined): PaymentGoldAccrual | undefined {
  if (!raw) return undefined;
  const nested = raw.goldAccrual as Record<string, unknown> | undefined;
  const accrualSource =
    nested && typeof nested === "object"
      ? nested
      : raw.weight || raw.ratePerGram
        ? raw
        : null;
  if (accrualSource) {
    const nested = accrualSource;
    const weight = nested.weight as { weightMg?: number; weightDisplay?: string } | undefined;
    const rate = nested.ratePerGram as { ratePerGramPaise?: number; ratePerGramDisplay?: string } | undefined;
    const weightMg = Number(weight?.weightMg ?? nested.weightMg ?? 0);
    const ratePerGramPaise = Number(rate?.ratePerGramPaise ?? nested.ratePerGramPaise ?? 0);
    if (weightMg <= 0 && ratePerGramPaise <= 0) return undefined;
    return {
      weightMg,
      weightDisplay:
        weight?.weightDisplay ??
        (typeof nested.weightDisplay === "string" ? nested.weightDisplay : formatWeight(weightMg)),
      ratePerGramPaise,
      ratePerGramDisplay:
        rate?.ratePerGramDisplay ??
        (typeof nested.ratePerGramDisplay === "string"
          ? nested.ratePerGramDisplay
          : formatRatePerGram(ratePerGramPaise)),
      purchasedAt:
        typeof nested.purchasedAt === "string"
          ? nested.purchasedAt
          : raw.paidAt
            ? String(raw.paidAt)
            : undefined,
    };
  }
  const weightMg = Number(raw.weightMg ?? 0);
  const ratePerGramPaise = Number(raw.ratePerGramPaise ?? 0);
  if (weightMg <= 0 && ratePerGramPaise <= 0) return undefined;
  return {
    weightMg,
    weightDisplay: formatWeight(weightMg),
    ratePerGramPaise,
    ratePerGramDisplay: formatRatePerGram(ratePerGramPaise),
    purchasedAt: raw.paidAt ? String(raw.paidAt) : undefined,
  };
}

export function goldAccrualFromAdminPayment(payment: Payment): PaymentGoldAccrual | undefined {
  if (payment.goldAccrual) return payment.goldAccrual;
  return readGoldAccrual(payment as unknown as Record<string, unknown>);
}

export function goldAccrualFromCustomerPayment(payment: PaymentListItem): PaymentGoldAccrual | undefined {
  return payment.goldAccrual ?? undefined;
}

export function formatGoldPurchaseDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function paymentHasGoldAccrual(
  payment: { goldAccrual?: PaymentGoldAccrual | null },
): boolean {
  return Boolean(payment.goldAccrual && payment.goldAccrual.weightMg > 0);
}
