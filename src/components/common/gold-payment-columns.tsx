"use client";

import type { PaymentGoldAccrual } from "@/src/types/customer";
import { formatGoldPurchaseDate } from "@/src/lib/gold-payment-display";

export function GoldWeightCell({ accrual }: { accrual?: PaymentGoldAccrual | null }) {
  if (!accrual?.weightMg) return <span className="text-muted-foreground">—</span>;
  return <span className="font-medium text-[#8b5f08]">{accrual.weightDisplay}</span>;
}

export function GoldRateCell({ accrual }: { accrual?: PaymentGoldAccrual | null }) {
  if (!accrual?.ratePerGramPaise) return <span className="text-muted-foreground">—</span>;
  return (
    <span>
      {accrual.ratePerGramDisplay}
      <span className="text-muted-foreground"> / g</span>
    </span>
  );
}

export function GoldBookedDateCell({ accrual }: { accrual?: PaymentGoldAccrual | null }) {
  return <span>{formatGoldPurchaseDate(accrual?.purchasedAt)}</span>;
}

export function goldLedgerColumns<T extends { goldAccrual?: PaymentGoldAccrual | null }>() {
  return [
    {
      key: "goldWeight",
      header: "Gold booked",
      render: (r: T) => <GoldWeightCell accrual={r.goldAccrual} />,
    },
    {
      key: "goldRate",
      header: "Rate / g",
      render: (r: T) => <GoldRateCell accrual={r.goldAccrual} />,
    },
    {
      key: "goldDate",
      header: "Booking date",
      render: (r: T) => <GoldBookedDateCell accrual={r.goldAccrual} />,
    },
  ];
}
