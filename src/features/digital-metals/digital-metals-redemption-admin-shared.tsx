"use client";

import Link from "next/link";
import { StatusBadge } from "@/src/components/common/status-badge";
import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import { formatDeliveryAddressSnapshot, ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import { money } from "@/src/lib/format";
import { DigitalMetalsSellCustomerPanel } from "@/src/features/digital-metals/digital-metals-sell-order-detail-parts";

export type RedemptionAdminCustomer = {
  id: string;
  name: string;
  mobile?: string;
  email?: string | null;
  customerNumber?: string;
};

export type RedemptionAdminRow = {
  id: string;
  status: string;
  metal?: string;
  finenessPpm?: number;
  quantityUg?: string;
  chargeTotalPaise?: number;
  fulfilmentMode?: string;
  pickupBranchLabel?: string | null;
  deliveryAddressSnapshot?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  chargePaidAt?: string | null;
  customer?: RedemptionAdminCustomer | null;
  permittedActions?: string[];
};

export function formatAdminDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function redemptionMetalLabel(row: Pick<RedemptionAdminRow, "metal" | "finenessPpm" | "quantityUg">): string {
  const asset =
    row.metal && row.finenessPpm
      ? formatAssetLabel(String(row.metal), Number(row.finenessPpm))
      : String(row.metal ?? "Metal");
  return `${ugToGramsDisplay(String(row.quantityUg ?? "0"))} · ${asset}`;
}

export function redemptionFulfilmentPreview(row: RedemptionAdminRow): string {
  if (String(row.fulfilmentMode) === "DELIVERY") {
    const addr = formatDeliveryAddressSnapshot(row.deliveryAddressSnapshot ?? null);
    return addr ? `Delivery · ${addr}` : "Home delivery";
  }
  if (row.pickupBranchLabel) return `Pickup · ${row.pickupBranchLabel}`;
  return "Branch pickup";
}

const ACTION_LABELS: Record<string, string> = {
  ACCEPT_FULFILMENT: "Accept",
  RECORD_PACKING: "Packing",
  RECORD_DELAY: "Delay",
  DISPATCH: "Dispatch",
  MARK_PICKUP_READY: "Pickup ready",
  ISSUE_PICKUP_CODE: "Pickup code",
  COMPLETE_PICKUP: "Complete pickup",
  COMPLETE_DELIVERY: "Complete delivery",
  CANCEL_PRE_DISPATCH: "Cancel",
  OPEN_INVESTIGATION: "Investigate",
  RESOLVE_RETURN: "Resolve return",
  DISPATCH_REPLACEMENT: "Replacement dispatch",
};

export function RedemptionPermittedActionChips({ actions }: { actions: string[] | undefined }) {
  if (!actions?.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {actions.map((a) => (
        <span
          key={a}
          className="rounded-full border border-[#eaded9] bg-[#faf8f7] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#5c3d42]"
        >
          {ACTION_LABELS[a] ?? a.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

export function RedemptionAdminCustomerPanel({ customer }: { customer: RedemptionAdminCustomer | null | undefined }) {
  return <DigitalMetalsSellCustomerPanel customer={customer} />;
}

export function RedemptionOrderListRow({
  row,
  href,
  showActions,
}: {
  row: RedemptionAdminRow;
  href: string;
  showActions?: boolean;
}) {
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
        <p>{redemptionMetalLabel(row)}</p>
        <p className="mt-0.5 text-muted-foreground">{redemptionFulfilmentPreview(row)}</p>
      </div>
      <div className="text-xs text-muted-foreground">
        <p>Ordered {formatAdminDateTime(row.createdAt)}</p>
        {row.chargePaidAt ? <p>Paid {formatAdminDateTime(row.chargePaidAt)}</p> : null}
      </div>
      <div className="flex flex-col items-start gap-1 md:items-end">
        <StatusBadge status={row.status} />
        {row.chargeTotalPaise != null ? (
          <span className="text-sm font-semibold">{money(row.chargeTotalPaise)}</span>
        ) : null}
        {showActions ? <RedemptionPermittedActionChips actions={row.permittedActions} /> : null}
      </div>
    </Link>
  );
}
