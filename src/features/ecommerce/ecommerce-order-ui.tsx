"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import {
  orderFulfilmentPresentation,
  orderPaymentPresentation,
} from "@/src/lib/ecommerce-order-presenters";
import type { EcommerceOrderDetail, EcommerceOrderListItem } from "@/src/types/ecommerce-order";
import { StatusBadge } from "@/src/components/common/status-badge";
import { cn } from "@/lib/utils";

export function formatOrderInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export function formatAddressSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const a = snapshot as Record<string, unknown>;
  const parts = [
    a.recipientName ? String(a.recipientName) : "",
    a.line1 ? String(a.line1) : "",
    a.line2 ? String(a.line2) : "",
    [a.city, a.state, a.pincode].filter(Boolean).join(", "),
  ].filter(Boolean);
  if (!parts.length) return null;
  const mobile = a.mobile ? String(a.mobile) : "";
  return { lines: parts, mobile, recipient: a.recipientName ? String(a.recipientName) : "" };
}

export function orderLineCount(order: { lines?: unknown[] }) {
  return order.lines?.length ?? 0;
}

export function orderLinePreview(order: { lines?: { name?: string }[] }, max = 2) {
  const lines = (order.lines ?? []).slice(0, max);
  return lines.map((l) => String(l.name ?? "Item")).join(", ");
}

export function customerListLabel(order: EcommerceOrderListItem) {
  const d = order.customerDisplay;
  if (d?.name) return d.name;
  if (d?.maskedMobile) return d.maskedMobile;
  if (d?.customerNumber) return `#${d.customerNumber}`;
  return order.customerId ? order.customerId.slice(-8) : "—";
}

export function customerListSub(order: EcommerceOrderListItem) {
  const d = order.customerDisplay;
  const parts: string[] = [];
  if (d?.name && d.maskedMobile) parts.push(d.maskedMobile);
  if (d?.customerNumber) parts.push(`Cust #${d.customerNumber}`);
  return parts.join(" · ") || undefined;
}

export function fulfilmentLabel(mode: string) {
  return mode.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatOrderWhen(iso: unknown) {
  if (!iso) return "—";
  return new Date(String(iso)).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const PROGRESS_STEPS_DELIVERY = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;
const PROGRESS_STEPS_PICKUP = ["PLACED", "CONFIRMED", "READY_FOR_PICKUP", "COLLECTED"] as const;
const PROGRESS_LABELS: Record<string, string> = {
  PLACED: "Placed",
  CONFIRMED: "Paid / accepted",
  SHIPPED: "Shipped",
  READY_FOR_PICKUP: "Ready for pickup",
  DELIVERED: "Delivered",
  COLLECTED: "Collected",
};

function progressIndex(status: string) {
  switch (status) {
    case "PENDING_PAYMENT":
    case "COD_PENDING_ACCEPTANCE":
      return 0;
    case "PAID":
    case "PROCESSING":
      return 1;
    case "SHIPPED":
    case "READY_FOR_PICKUP":
      return 2;
    case "DELIVERED":
      return 3;
    default:
      return -1;
  }
}

/** Horizontal lifecycle stepper for a store order. */
export function OrderProgress({ order }: { order: EcommerceOrderDetail }) {
  const status = String(order.status ?? "");
  const mode = String(order.fulfilmentMode ?? "");
  const steps = mode === "DELIVERY" ? PROGRESS_STEPS_DELIVERY : PROGRESS_STEPS_PICKUP;
  const at = progressIndex(status);
  const ended = at < 0;
  return (
    <div className="overflow-hidden rounded-[1.15rem] border border-[#e8dcd7] bg-white px-5 py-5">
      {ended ? (
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <p className="text-sm text-[#6f6265]">{order.statusLabel ?? "This order is closed."}</p>
        </div>
      ) : (
        <ol className="grid grid-cols-4 gap-1" aria-label="Order progress">
          {steps.map((step, i) => {
            const done = i < at || (i === at && step === "DELIVERED");
            const current = i === at && step !== "DELIVERED";
            return (
              <li key={step} className="relative flex flex-col items-center text-center">
                {i > 0 ? (
                  <span
                    aria-hidden
                    className={cn("absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2", i <= at ? "bg-gradient-to-r from-[#c99a3c] to-[#d6b46e]" : "bg-[#eee4e1]")}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-[1] grid size-6 place-items-center rounded-full text-[0.7rem] font-bold ring-4 ring-white",
                    done && "bg-gradient-to-br from-[#e2c88f] to-[#b98a35] text-white",
                    current && "bg-[#7b0a2b] text-white",
                    !done && !current && "border border-[#e2d6d2] bg-white text-[#b9a9ad]",
                  )}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className={cn("mt-2 text-[0.78rem] font-semibold leading-tight", current ? "text-[#5e0a20]" : done ? "text-[#3c2a2e]" : "text-[#a2969a]")}>
                  {PROGRESS_LABELS[step]}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {!ended && order.statusLabel ? <p className="mt-4 border-t border-[#f3eae7] pt-3 text-sm text-[#6f6265]">{String(order.statusLabel)}</p> : null}
    </div>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[1.15rem] border border-[#e8dcd7] bg-white">
      <h3 className="border-b border-[#f3eae7] px-5 py-3.5 text-[0.95rem] font-bold text-[#2d191d]">{title}</h3>
      {children}
    </section>
  );
}

function SideRow({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-2.5 text-sm">
      <span className="shrink-0 text-[#857a7d]">{label}</span>
      <span className={cn("min-w-0 text-right font-medium text-[#28161a] [overflow-wrap:anywhere]", mono && "text-xs tabular-nums")}>{children}</span>
    </div>
  );
}

/** Customer, handover, payment and reference cards for the order detail aside. */
export function OrderSideCards({ order }: { order: EcommerceOrderDetail }) {
  const pay = orderPaymentPresentation(order);
  const fulfil = orderFulfilmentPresentation(order);
  const address = formatAddressSnapshot(order.addressSnapshot);
  const fulfilmentMode = String(order.fulfilmentMode ?? "");
  const delivery = order.deliveryTracking && typeof order.deliveryTracking === "object" ? (order.deliveryTracking as Record<string, unknown>) : null;
  const customer = order.customerDisplay;
  const lines = orderLineCount(order);
  return (
    <>
      <SideCard title="Customer">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#fbf0dc] to-[#f1dcb4] text-sm font-bold text-[#6b4413] ring-1 ring-[#ead5ad]">
            {(customer?.name ?? "?").split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase()}
          </span>
          <div className="min-w-0">
            {order.customerId ? (
              <Link href={`/customers/${order.customerId}`} className="block truncate font-bold text-[#28161a] hover:text-[#7b0a2b] hover:underline">
                {customer?.name ?? "Customer"}
              </Link>
            ) : (
              <p className="truncate font-bold text-[#28161a]">{customer?.name ?? "Customer"}</p>
            )}
            <p className="truncate text-sm text-[#857a7d]">{[customer?.customerNumber, customer?.maskedMobile].filter(Boolean).join(" · ") || "—"}</p>
          </div>
        </div>
      </SideCard>
      <SideCard title={fulfilmentMode === "DELIVERY" ? "Delivery" : "Branch pickup"}>
        <div className="space-y-1 px-5 py-4 text-sm text-[#3c2a2e]">
          {fulfilmentMode === "DELIVERY" ? (
            address ? (
              <>
                {address.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {address.mobile ? <p className="pt-1 text-[#857a7d]">Mobile {address.mobile}</p> : null}
              </>
            ) : (
              <p className="text-[#857a7d]">No address on file.</p>
            )
          ) : (
            <p>
              Pickup at{" "}
              <span className="font-semibold">{String((order as Record<string, unknown>).pickupBranchName ?? order.pickupBranchId ?? "branch")}</span>
            </p>
          )}
          {delivery?.trackingNumber || delivery?.carrierName || delivery?.trackingReference ? (
            <div className="mt-3 rounded-xl bg-[#fbf8f6] px-3 py-2">
              <p className="text-xs text-[#857a7d]">Courier</p>
              <p className="font-semibold">
                {String(delivery.carrierName ?? delivery.carrier ?? "")}
                {delivery.trackingNumber || delivery.trackingReference ? ` · ${String(delivery.trackingNumber ?? delivery.trackingReference)}` : ""}
              </p>
              {delivery.trackingUrl ? (
                <a href={String(delivery.trackingUrl)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#7b0a2b] hover:underline">
                  Track shipment
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </SideCard>
      <SideCard title="Payment">
        <div className="px-5 pt-4">
          <p className="font-semibold text-[#28161a]">{pay.methodLabel}</p>
          <p className={cn("text-sm", pay.tone === "danger" ? "text-red-700" : pay.tone === "success" ? "text-emerald-700" : pay.tone === "warning" ? "text-amber-700" : "text-[#857a7d]")}>
            {pay.stateLabel}
          </p>
          {pay.helper ? <p className="mt-1 text-xs text-[#9a8d90]">{pay.helper}</p> : null}
        </div>
        <div className="mt-2 divide-y divide-[#f3eae7] border-t border-[#f3eae7]">
          {order.paidAt ? <SideRow label="Paid">{formatOrderWhen(order.paidAt)}</SideRow> : null}
          {order.expiresAt ? (
            <SideRow label={order.status === "COD_PENDING_ACCEPTANCE" ? "Accept by" : "Pay by"}>{formatOrderWhen(order.expiresAt)}</SideRow>
          ) : null}
          {order.paymentMethod === "COD" ? (
            <SideRow label="Courier COD">{String(order.courierCodCollectionStatus ?? "PENDING").replaceAll("_", " ").toLowerCase()}</SideRow>
          ) : null}
        </div>
      </SideCard>
      <SideCard title="References">
        <div className="divide-y divide-[#f3eae7]">
          <SideRow label="Order ID" mono>{String(order.id ?? "")}</SideRow>
          <SideRow label="Placed">{formatOrderWhen(order.createdAt)}</SideRow>
          <SideRow label="Handover">{fulfil.modeLabel}</SideRow>
          <SideRow label="Pieces">{`${lines} item${lines === 1 ? "" : "s"}`}</SideRow>
          {order.quoteId ? <SideRow label="Quote" mono>{String(order.quoteId)}</SideRow> : null}
          {order.stockReleaseReason ? <SideRow label="Stock release">{String(order.stockReleaseReason)}</SideRow> : null}
          <SideRow label="Version" mono>{String(order.version ?? 1)}</SideRow>
        </div>
      </SideCard>
    </>
  );
}

export function OrderPaymentAttemptsList({ items }: { items: Record<string, unknown>[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No payment attempts recorded.</p>;
  }
  return (
    <ul className="divide-y divide-[#f3eae7] rounded-2xl border border-[#eaded9]">
      {items.map((row) => (
        <li key={String(row._id ?? row.id)} className="space-y-1 px-4 py-3 text-sm">
          <div className="text-xs font-semibold tabular-nums text-[#5c4a4e]">{String(row.id ?? row._id)}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <StatusBadge status={String(row.status ?? "")} />
            <span className="font-semibold tabular-nums">
              {formatOrderInr(Number(row.amountPaise ?? 0))}
            </span>
          </div>
          {row.operationalStatus ? (
            <div className="text-xs font-medium text-amber-900">{String(row.operationalStatus)}</div>
          ) : null}
          {row.providerOrderId ? (
            <div className="text-xs text-muted-foreground">Provider order: {String(row.providerOrderId)}</div>
          ) : null}
          {row.failureReason ? (
            <div className="text-xs text-amber-900">{String(row.failureReason)}</div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function OrderEventTimeline({ items }: { items: Record<string, unknown>[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No events yet.</p>;
  }
  return (
    <ol className="relative ml-1.5 space-y-0 border-l-2 border-[#efe2d8] pl-5">
      {items.map((ev) => (
        <li key={String(ev.id ?? ev._id)} className="relative pb-5 last:pb-0">
          <span className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-white bg-gradient-to-br from-[#e2c88f] to-[#b98a35] shadow" />
          <p className="text-sm font-semibold text-[#28161a]">{String(ev.type ?? ev.outcome ?? "Event").replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</p>
          {ev.reason ? <p className="text-xs text-muted-foreground">{String(ev.reason)}</p> : null}
          <p className="text-xs text-muted-foreground">{formatOrderWhen(ev.at)}</p>
        </li>
      ))}
    </ol>
  );
}

export function OrderLineItemsTable({ lines }: { lines: Record<string, unknown>[] }) {
  if (lines.length === 0) {
    return <p className="px-5 py-4 text-sm text-muted-foreground">No line items on this order.</p>;
  }
  return (
    <ul className="divide-y divide-[#f3eae7]">
      {lines.map((line) => (
        <li key={`${String(line.productId)}-${String(line.quantity)}`} className="flex items-center gap-4 px-5 py-3.5">
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#fbf3e3] to-[#f3e2c0] text-[#94661b]">
            <Package className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[#28161a]">{String(line.name ?? "Product")}</p>
            <p className="truncate text-xs text-[#857a7d]">
              {[line.sku ? `SKU ${String(line.sku)}` : null, line.unitPricePaise != null ? `${formatOrderInr(Number(line.unitPricePaise))} each` : null]
                .filter(Boolean)
                .join(" · ") || String(line.productId ?? "")}
            </p>
          </div>
          <span className="shrink-0 text-sm text-[#6f6265] tabular-nums">× {String(line.quantity ?? 1)}</span>
          <span className="w-28 shrink-0 text-right font-bold tabular-nums text-[#28161a]">{formatOrderInr(Number(line.lineTotalPaise ?? 0))}</span>
        </li>
      ))}
    </ul>
  );
}

export function OrderAmountsGrid({ order }: { order: Record<string, unknown> }) {
  const financialSnapshot =
    order.financialSnapshot && typeof order.financialSnapshot === "object"
      ? (order.financialSnapshot as Record<string, unknown>)
      : null;
  const taxComponentLines = (financialSnapshot?.taxComponentLines as Record<string, unknown>[]) ?? [];
  const amountRows: Array<[string, unknown]> = [
    ["Subtotal (before tax)", order.subtotalPaise],
    ["Tax", order.taxPaise],
    ["Delivery / handling", order.fulfilmentChargePaise],
  ];

  return (
    <div className="space-y-3 px-5 py-4 text-sm">
      <dl className="space-y-2">
        {amountRows.map(([label, paise]) => (
          <div key={String(label)} className="flex items-center justify-between">
            <dt className="text-[#6f6265]">{label}</dt>
            <dd className="font-semibold tabular-nums text-[#28161a]">{formatOrderInr(Number(paise ?? 0))}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-dashed border-[#e6dad6] pt-3">
          <dt className="font-bold text-[#28161a]">Total charged</dt>
          <dd className="text-lg font-extrabold tabular-nums text-[#5e0a20]">{formatOrderInr(Number(order.totalPaise ?? 0))}</dd>
        </div>
      </dl>
      {taxComponentLines.length > 0 ? (
        <div className="rounded-xl bg-[#fbf8f6] p-3 text-xs text-[#6f6265]">
          <p className="mb-1 font-semibold text-[#3c2a2e]">Tax components (from the quote)</p>
          <ul className="space-y-0.5">
            {taxComponentLines.map((row) => (
              <li key={String(row.componentKey ?? row.label)}>
                {String(row.label ?? row.componentKey)} — {(Number(row.rateBps ?? 0) / 100).toFixed(2)}%
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {financialSnapshot?.destinationState ? (
        <p className="text-xs text-[#857a7d]">Place of supply: {String(financialSnapshot.destinationState)}</p>
      ) : null}
    </div>
  );
}
