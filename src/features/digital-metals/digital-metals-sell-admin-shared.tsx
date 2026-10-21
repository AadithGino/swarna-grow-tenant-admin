"use client";

import Link from "next/link";
import { StatusBadge } from "@/src/components/common/status-badge";
import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import { ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import { money } from "@/src/lib/format";
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

export function SellOrderListRow({ row, href }: { row: SellAdminRow; href: string }) {
  const pending = row.status === "PENDING_APPROVAL";
  return (
    <Link
      href={href}
      className="grid gap-3 px-4 py-3 hover:bg-muted/40 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] md:items-center"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-[#28161a]">{row.customer?.name ?? "Customer"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {row.customer?.mobile ? `${row.customer.mobile} · ` : ""}
          {row.customer?.customerNumber ? `#${row.customer.customerNumber} · ` : ""}
          <span className="font-mono text-[10px]">{row.id}</span>
        </p>
      </div>
      <div className="text-xs text-[#5c3d42]">
        <p>{sellMetalLabel(row)}</p>
        <p className="mt-0.5 text-muted-foreground">{sellBankPreview(row.bankDestination)}</p>
      </div>
      <div className="text-xs text-muted-foreground">
        <p>Requested {formatAdminDateTime(row.createdAt)}</p>
        {row.executedAt ? <p>Executed {formatAdminDateTime(row.executedAt)}</p> : null}
        {!row.executedAt && row.confirmedAt ? <p>Confirmed {formatAdminDateTime(row.confirmedAt)}</p> : null}
        {pending && row.approvalExpiresAt ? (
          <p className="text-amber-800/80">Expires {formatAdminDateTime(row.approvalExpiresAt)}</p>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-1 md:items-end">
        <StatusBadge status={row.status} />
        {row.settlementPaise != null ? (
          <span className="text-sm font-semibold">{money(row.settlementPaise)}</span>
        ) : null}
        {pending ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-[#5c3d42]">Review & execute</span>
        ) : null}
      </div>
    </Link>
  );
}
