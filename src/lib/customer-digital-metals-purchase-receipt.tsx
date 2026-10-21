"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import {
  formatInrFromPaise,
  formatInrPerGramFromPaise,
  ugToGramsDisplay,
} from "@/src/lib/digital-metals-display";
import { formatPassbookWhen } from "@/src/lib/customer-digital-metals-passbook-ui";

export type DigitalMetalsPurchaseSummary = {
  orderId?: string;
  metal?: string;
  finenessPpm?: number;
  quantityUg?: string;
  totalPayablePaise?: number;
  buyRatePerGramPaise?: number | null;
  bookedAt?: string | null;
  creditedAt?: string | null;
  payment?: {
    amountPaise?: number;
    provider?: string;
    merchantOrderId?: string;
    providerPaymentId?: string | null;
    paidAt?: string | null;
  } | null;
};

export function purchaseSummaryFromOrder(order: Record<string, unknown> | null | undefined) {
  if (!order) return null;
  const embedded = order.purchaseSummary as DigitalMetalsPurchaseSummary | undefined;
  if (embedded?.orderId || embedded?.quantityUg) return embedded;
  const snapshot = (order.snapshot ?? {}) as Record<string, unknown>;
  const rateSnapshot = (snapshot.rateSnapshot ?? {}) as Record<string, unknown>;
  const attempts = (order.paymentAttempts ?? []) as Record<string, unknown>[];
  const paid =
    attempts.find((a) => a.status === "SUCCEEDED")
    ?? attempts[0];
  return {
    orderId: String(order.id ?? ""),
    metal: String(order.metal ?? "GOLD"),
    finenessPpm: Number(order.finenessPpm ?? 0),
    quantityUg: String(order.quantityUg ?? snapshot.quantityUg ?? ""),
    totalPayablePaise: Number(order.totalPayablePaise ?? snapshot.totalPayablePaise ?? 0),
    buyRatePerGramPaise: rateSnapshot.buyRatePerGramPaise != null
      ? Number(rateSnapshot.buyRatePerGramPaise)
      : null,
    bookedAt: (order.bookedAt ?? order.createdAt) as string | null | undefined,
    creditedAt: order.creditedAt as string | null | undefined,
    payment: paid
      ? {
          amountPaise: Number(paid.amountPaise ?? order.totalPayablePaise ?? 0),
          provider: "PHONEPE",
          merchantOrderId: String(paid.merchantOrderId ?? paid.id ?? ""),
          providerPaymentId: paid.providerPaymentId ? String(paid.providerPaymentId) : null,
          paidAt: (paid.paidAt ?? order.creditedAt) as string | null | undefined,
        }
      : null,
  } satisfies DigitalMetalsPurchaseSummary;
}

function receiptDetail(label: string, value: string) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-[#8a6a70]">{label}</dt>
      <dd className="max-w-[58%] text-right font-medium text-[#28161a]">{value}</dd>
    </div>
  );
}

export function CustomerDigitalMetalsPurchaseReceiptBody({
  summary,
  compact = false,
}: {
  summary: DigitalMetalsPurchaseSummary;
  compact?: boolean;
}) {
  const asset = formatAssetLabel(String(summary.metal ?? "GOLD"), Number(summary.finenessPpm ?? 0));
  const paidAt = summary.payment?.paidAt ?? summary.creditedAt ?? summary.bookedAt;
  return (
    <dl className={compact ? "space-y-0" : "divide-y divide-[#f0e8e5]"}>
      {receiptDetail("Asset", asset)}
      {receiptDetail("Weight booked", ugToGramsDisplay(String(summary.quantityUg ?? 0)))}
      {summary.buyRatePerGramPaise != null
        ? receiptDetail("Rate locked", formatInrPerGramFromPaise(summary.buyRatePerGramPaise))
        : null}
      {receiptDetail("Amount paid", formatInrFromPaise(summary.totalPayablePaise))}
      {receiptDetail("Booking time", formatPassbookWhen(summary.bookedAt))}
      {summary.creditedAt
        ? receiptDetail("Credited at", formatPassbookWhen(summary.creditedAt))
        : null}
      {paidAt ? receiptDetail("Payment time", formatPassbookWhen(paidAt)) : null}
      {summary.payment?.provider
        ? receiptDetail("Payment via", summary.payment.provider === "PHONEPE" ? "PhonePe" : summary.payment.provider)
        : null}
      {summary.payment?.merchantOrderId
        ? receiptDetail("Payment ref.", summary.payment.merchantOrderId)
        : null}
    </dl>
  );
}

export function CustomerDigitalMetalsPurchaseSuccessDialog({
  open,
  onOpenChange,
  summary,
  portfolioHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: DigitalMetalsPurchaseSummary | null;
  portfolioHref: string;
}) {
  if (!summary) return null;
  const asset = formatAssetLabel(String(summary.metal ?? "GOLD"), Number(summary.finenessPpm ?? 0));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader className="text-left">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="size-7" aria-hidden />
          </div>
          <DialogTitle className="font-serif text-xl text-[#28161a]">Payment successful</DialogTitle>
          <DialogDescription className="text-sm text-[#5c3d42]">
            {ugToGramsDisplay(String(summary.quantityUg ?? 0))} {asset} is now in your wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-[#eaded9] bg-[#faf8f7] px-4 py-3">
          <CustomerDigitalMetalsPurchaseReceiptBody summary={summary} />
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button type="button" className="min-h-11 w-full" asChild>
            <Link href={portfolioHref}>View portfolio</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
