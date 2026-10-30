"use client";

import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import { ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import { formatAdminDateTime as formatAdminDateTimeIst } from "@/src/features/digital-metals/digital-metals-redemption-admin-shared";

export const formatAdminDateTime = formatAdminDateTimeIst;

export type SellAdminCustomer = {
  id: string;
  name: string;
  mobile?: string;
  email?: string | null;
  customerNumber?: string;
};

export type SellAdminBankBrief = {
  accountHolderName?: string;
  accountLast4?: string;
  ifsc?: string;
  bankName?: string;
  status?: string | null;
};

export type SellAdminRow = {
  id: string;
  status: string;
  metal?: string;
  finenessPpm?: number;
  quantityUg?: string;
  settlementPaise?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  confirmedAt?: string | null;
  executedAt?: string | null;
  approvalExpiresAt?: string | null;
  customer?: SellAdminCustomer | null;
  bankDestination?: SellAdminBankBrief | null;
};

export function sellMetalLabel(row: Pick<SellAdminRow, "metal" | "finenessPpm" | "quantityUg">): string {
  const asset =
    row.metal && row.finenessPpm
      ? formatAssetLabel(String(row.metal), Number(row.finenessPpm))
      : String(row.metal ?? "Metal");
  return `${ugToGramsDisplay(String(row.quantityUg ?? "0"))} · ${asset}`;
}

export function sellBankPreview(bank: SellAdminBankBrief | null | undefined): string {
  if (!bank?.accountHolderName) return "Bank payout — not linked";
  const bankLabel = bank.bankName?.trim() ? bank.bankName : "Bank account";
  return `${bankLabel} · ****${bank.accountLast4 ?? "????"} · ${bank.ifsc ?? "—"}`;
}

export function filterSellRowsBySearch(rows: SellAdminRow[], q: string): SellAdminRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => {
    const hay = [
      r.id,
      r.customer?.name,
      r.customer?.mobile,
      r.customer?.customerNumber,
      r.customer?.id,
      r.bankDestination?.accountHolderName,
      r.bankDestination?.ifsc,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}
