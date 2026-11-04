"use client";

import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import { formatDeliveryAddressSnapshot, ugToGramsDisplay } from "@/src/lib/digital-metals-display";
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
  const visibleActions = (actions ?? []).filter(
    (a) => a !== "ACCEPT_FULFILMENT" && a !== "RECORD_PACKING",
  );
  if (!visibleActions.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {visibleActions.map((a) => (
        <span
          key={a}
          className="rounded-full border border-[#eaded9] bg-[#faf8f7] px-2 py-0.5 text-[0.7rem] font-semibold text-[#5c3d42]"
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
