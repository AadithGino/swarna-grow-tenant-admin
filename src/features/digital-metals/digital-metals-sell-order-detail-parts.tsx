"use client";

import Link from "next/link";
import { Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import { ugToGramsDisplay, formatInrPerGramFromPaise } from "@/src/lib/digital-metals-display";

type CustomerBrief = {
  id: string;
  name: string;
  mobile?: string;
  email?: string | null;
  customerNumber?: string;
};

type BankBrief = {
  accountHolderName?: string;
  accountLast4?: string;
  ifsc?: string;
  bankName?: string;
  status?: string | null;
};

export function DigitalMetalsSellCustomerPanel({ customer }: { customer: CustomerBrief | null | undefined }) {
  if (!customer?.id) return null;
  return (
    <Surface title="Customer">
      <dl className="space-y-2 px-4 py-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Name</dt>
          <dd className="font-medium">
            <Link href={`/customers/${customer.id}`} className="underline-offset-2 hover:underline">
              {customer.name}
            </Link>
          </dd>
        </div>
        {customer.customerNumber ? (
          <div className="flex justify-between gap-4">
            <dt>Customer #</dt>
            <dd>{customer.customerNumber}</dd>
          </div>
        ) : null}
        {customer.mobile ? (
          <div className="flex justify-between gap-4">
            <dt>Mobile</dt>
            <dd>{customer.mobile}</dd>
          </div>
        ) : null}
        {customer.email ? (
          <div className="flex justify-between gap-4">
            <dt>Email</dt>
            <dd className="truncate">{customer.email}</dd>
          </div>
        ) : null}
      </dl>
    </Surface>
  );
}

export function DigitalMetalsSellBankPanel({ bank }: { bank: BankBrief | null | undefined }) {
  if (!bank?.accountHolderName) {
    return (
      <Surface title="Payout bank">
        <p className="px-4 py-3 text-sm text-muted-foreground">No bank account linked to this sell yet.</p>
      </Surface>
    );
  }
  return (
    <Surface title="Payout bank">
      <dl className="space-y-2 px-4 py-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Account holder</dt>
          <dd className="font-medium">{bank.accountHolderName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Account</dt>
          <dd>
            ****{bank.accountLast4} · {bank.ifsc}
          </dd>
        </div>
        {bank.bankName ? (
          <div className="flex justify-between gap-4">
            <dt>Bank</dt>
            <dd>{bank.bankName}</dd>
          </div>
        ) : null}
        {bank.status ? (
          <div className="flex justify-between gap-4">
            <dt>Verification</dt>
            <dd>
              <StatusBadge status={String(bank.status)} />
            </dd>
          </div>
        ) : null}
      </dl>
    </Surface>
  );
}

export function DigitalMetalsSellQuotePanel({
  metal,
  finenessPpm,
  quantityUg,
  settlementPaise,
  sellRatePerGramPaise,
}: {
  metal?: string | null;
  finenessPpm?: number | null;
  quantityUg?: string | null;
  settlementPaise?: number | null;
  sellRatePerGramPaise?: number | null;
}) {
  const assetLabel =
    metal && finenessPpm != null
      ? formatAssetLabel(metal, finenessPpm)
      : metal ?? "—";
  return (
    <Surface title="Sale quote (locked)">
      <dl className="space-y-2 px-4 py-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Asset</dt>
          <dd>{assetLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Quantity</dt>
          <dd>{quantityUg ? ugToGramsDisplay(String(quantityUg)) : "—"}</dd>
        </div>
        {sellRatePerGramPaise != null ? (
          <div className="flex justify-between gap-4">
            <dt>Sell rate</dt>
            <dd>{formatInrPerGramFromPaise(sellRatePerGramPaise)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt>Net settlement</dt>
          <dd className="font-semibold">
            {settlementPaise != null ? money(settlementPaise) : "—"}
          </dd>
        </div>
      </dl>
    </Surface>
  );
}
