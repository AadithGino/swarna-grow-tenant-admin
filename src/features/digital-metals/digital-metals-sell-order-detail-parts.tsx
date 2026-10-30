"use client";

import Link from "next/link";
import { Landmark, Scale, UserRound } from "lucide-react";
import { Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { InitialsAvatar } from "@/src/components/admin-ui/admin-table";
import { InfoList, InfoRow } from "@/src/components/admin-ui/detail-parts";
import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import { formatInrFromPaise, formatInrPerGramFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";

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
    <Surface icon={UserRound} title="Customer">
      <div className="flex items-center gap-3 border-b border-[#f3eae7] px-5 py-4">
        <InitialsAvatar name={customer.name} className="size-11 text-sm" />
        <div className="min-w-0">
          <Link
            href={`/customers/${customer.id}`}
            className="block truncate font-bold text-[#28161a] underline-offset-2 hover:text-[#7b0a2b] hover:underline"
          >
            {customer.name}
          </Link>
          <p className="truncate text-sm text-[#857a7d]">{customer.customerNumber ?? customer.id}</p>
        </div>
      </div>
      <InfoList>
        {customer.mobile ? <InfoRow label="Mobile">{customer.mobile}</InfoRow> : null}
        {customer.email ? <InfoRow label="Email">{customer.email}</InfoRow> : null}
        {!customer.mobile && !customer.email ? <InfoRow label="Contact">Not shared</InfoRow> : null}
      </InfoList>
    </Surface>
  );
}

export function DigitalMetalsSellBankPanel({ bank }: { bank: BankBrief | null | undefined }) {
  if (!bank?.accountHolderName) {
    return (
      <Surface icon={Landmark} title="Payout bank">
        <p className="px-5 py-4 text-sm text-[#7a6d70]">No bank account linked to this sale yet.</p>
      </Surface>
    );
  }
  return (
    <Surface icon={Landmark} title="Payout bank" description="Full account numbers are never shown here">
      <div className="mx-5 my-4 rounded-2xl bg-gradient-to-br from-[#3d0c15] to-[#6d1730] px-4 py-4 text-white shadow-[0_10px_24px_-16px_rgb(61_12_21/80%)]">
        <p className="text-xs text-[#e2c88f]">{bank.bankName ?? "Bank account"}</p>
        <p className="mt-2 text-lg font-bold tracking-[0.18em] tabular-nums">•••• •••• {bank.accountLast4 ?? "????"}</p>
        <div className="mt-2 flex items-end justify-between gap-2 text-xs text-white/75">
          <span className="truncate">{bank.accountHolderName}</span>
          <span className="tabular-nums">{bank.ifsc}</span>
        </div>
      </div>
      {bank.status ? (
        <InfoList className="border-t border-[#f3eae7]">
          <InfoRow label="Verification">
            <StatusBadge status={String(bank.status)} />
          </InfoRow>
        </InfoList>
      ) : null}
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
  const assetLabel = metal && finenessPpm != null ? formatAssetLabel(metal, finenessPpm) : metal ?? "—";
  return (
    <Surface icon={Scale} title="Sale quote" description="Locked when the customer confirmed">
      <InfoList>
        <InfoRow label="Asset">{assetLabel}</InfoRow>
        <InfoRow label="Quantity">{quantityUg ? ugToGramsDisplay(String(quantityUg)) : "—"}</InfoRow>
        {sellRatePerGramPaise != null ? (
          <InfoRow label="Sell rate">{formatInrPerGramFromPaise(sellRatePerGramPaise)}</InfoRow>
        ) : null}
        <InfoRow label="Net settlement">
          <span className="text-base font-extrabold text-[#28161a]">
            {settlementPaise != null ? formatInrFromPaise(settlementPaise) : "—"}
          </span>
        </InfoRow>
      </InfoList>
    </Surface>
  );
}
