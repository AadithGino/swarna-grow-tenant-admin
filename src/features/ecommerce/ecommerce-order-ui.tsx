"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ChevronRight, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatOrderPaymentState,
  orderFulfilmentPresentation,
  orderListItemNeedsAttention,
  orderPaymentPresentation,
} from "@/src/lib/ecommerce-order-presenters";
import type { EcommerceOrderDetail, EcommerceOrderListItem } from "@/src/types/ecommerce-order";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function OrderListStatusCell({ row }: { row: EcommerceOrderListItem }) {
  const attention = orderListItemNeedsAttention(row);
  return (
    <div className="flex flex-col gap-1.5">
      <StatusBadge status={row.status} />
      {attention ? (
        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
          Needs action
        </Badge>
      ) : null}
      {row.paymentExceptionStatus ? (
        <Badge variant="destructive" className="gap-1 font-normal">
          <AlertTriangle className="size-3" />
          Payment exception
        </Badge>
      ) : null}
    </div>
  );
}

export function EcommerceOrdersListTable({
  items,
  orderHref,
}: {
  items: EcommerceOrderListItem[];
  orderHref: (orderId: string) => string;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-[#e4d7d2] bg-white shadow-[0_2px_5px_rgb(67_15_25/3%)] md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#faf7f5] hover:bg-[#faf7f5]">
              <TableHead className="font-semibold text-[#4f3d41]">Order</TableHead>
              <TableHead className="font-semibold text-[#4f3d41]">Customer</TableHead>
              <TableHead className="font-semibold text-[#4f3d41]">Placed</TableHead>
              <TableHead className="font-semibold text-[#4f3d41]">Status</TableHead>
              <TableHead className="font-semibold text-[#4f3d41]">Payment</TableHead>
              <TableHead className="font-semibold text-[#4f3d41]">Fulfilment</TableHead>
              <TableHead className="font-semibold text-[#4f3d41]">Items</TableHead>
              <TableHead className="text-right font-semibold text-[#4f3d41]">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => {
              const id = row.id;
              const href = orderHref(id);
              const lines = orderLineCount(row);
              const preview = orderLinePreview(row);
              const pay = formatOrderPaymentState(row);
              const sub = customerListSub(row);
              return (
                <TableRow key={id} className="align-top">
                  <TableCell>
                    <Link href={href} className="group block min-w-[8rem]">
                      <span className="font-semibold text-[#28161a] group-hover:text-[#730321]">
                        {row.orderNumber ?? id.slice(-10)}
                      </span>
                      {row.statusLabel ? (
                        <span className="mt-1 block text-xs leading-snug text-[#807478]">{row.statusLabel}</span>
                      ) : null}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[10rem]">
                    <span className="block truncate text-sm font-medium text-[#28161a]">{customerListLabel(row)}</span>
                    {sub ? <span className="block truncate text-xs text-muted-foreground">{sub}</span> : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[#5c4a50]">{formatOrderWhen(row.createdAt)}</TableCell>
                  <TableCell>
                    <OrderListStatusCell row={row} />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-[#2d191d]">{pay.methodLabel}</div>
                    <div className={cn("text-xs", pay.tone === "danger" && "text-destructive")}>{pay.stateLabel}</div>
                  </TableCell>
                  <TableCell className="text-sm text-[#5c4a50]">
                    {row.fulfilmentMode ? fulfilmentLabel(row.fulfilmentMode) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2 text-sm">
                      <Package className="mt-0.5 size-4 shrink-0 text-[#ba8f61]" />
                      <div>
                        <div className="font-medium">{lines || "—"}</div>
                        {preview ? (
                          <div className="max-w-[12rem] truncate text-xs text-muted-foreground">
                            {preview}
                            {lines > 2 ? "…" : ""}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold tabular-nums text-[#28161a]">
                    {formatOrderInr(row.totalPaise ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={href}
                      className="inline-flex size-9 items-center justify-center rounded-lg text-[#730321] hover:bg-[#f7ecee]"
                      aria-label={`Open order ${row.orderNumber ?? id}`}
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ul className="space-y-3 md:hidden">
        {items.map((row) => {
          const id = row.id;
          const href = orderHref(id);
          const pay = formatOrderPaymentState(row);
          const lines = orderLineCount(row);
          return (
            <li key={id}>
              <Link
                href={href}
                className="flex gap-3 rounded-2xl border border-[#e4d7d2] bg-white p-4 shadow-[0_2px_5px_rgb(67_15_25/3%)] active:bg-[#faf7f5]"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#28161a]">{row.orderNumber ?? id.slice(-10)}</p>
                      <p className="text-xs text-muted-foreground">{formatOrderWhen(row.createdAt)}</p>
                    </div>
                    <p className="shrink-0 font-mono text-sm font-semibold tabular-nums">{formatOrderInr(row.totalPaise ?? 0)}</p>
                  </div>
                  <p className="text-sm text-[#5c4a50]">{customerListLabel(row)}</p>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={row.status} />
                    <Badge variant="secondary" className="font-normal">
                      {pay.methodLabel}: {pay.stateLabel}
                    </Badge>
                  </div>
                  {lines ? (
                    <p className="truncate text-xs text-muted-foreground">{orderLinePreview(row)}</p>
                  ) : null}
                </div>
                <ChevronRight className="mt-1 size-5 shrink-0 text-[#ba8f61]" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function DetailFact({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 break-all text-sm font-medium text-[#28161a]", mono && "font-mono text-xs")}>
        {value}
      </p>
    </div>
  );
}

export function OrderDetailHero({
  order,
  actions,
  primaryAction,
}: {
  order: EcommerceOrderDetail;
  actions?: React.ReactNode;
  primaryAction?: React.ReactNode;
}) {
  const pay = orderPaymentPresentation(order);
  const fulfil = orderFulfilmentPresentation(order);
  const lines = orderLineCount(order);
  const address = formatAddressSnapshot(order.addressSnapshot);
  const fulfilmentMode = String(order.fulfilmentMode ?? "");
  const delivery =
    order.deliveryTracking && typeof order.deliveryTracking === "object"
      ? order.deliveryTracking
      : null;
  const orderNumber = String(order.orderNumber ?? order.id ?? "Order");
  const customer = order.customerDisplay;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[#e4d7d2] bg-white shadow-[0_2px_5px_rgb(67_15_25/3%)]">
      <div className="border-b border-[#eaded9] bg-gradient-to-br from-[#faf7f5] to-white px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">Store order</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-[#28161a]">
              {orderNumber}
            </h2>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{String(order.id ?? "")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={String(order.status ?? "")} />
              {order.paymentMethod === "COD" ? (
                <Badge variant="secondary" className="font-normal">
                  Cash on delivery
                </Badge>
              ) : null}
              {order.paymentExceptionStatus ? (
                <Badge variant="destructive" className="gap-1 font-normal">
                  <AlertTriangle className="size-3" />
                  {String(order.paymentExceptionStatus).replaceAll("_", " ")}
                </Badge>
              ) : null}
            </div>
            {order.statusLabel ? (
              <p className="mt-3 max-w-2xl rounded-lg border border-[#eaded9] bg-white/80 px-3 py-2 text-sm leading-relaxed text-[#665557]">
                {String(order.statusLabel)}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {primaryAction}
            {actions}
          </div>
        </div>
        {customer?.name || customer?.maskedMobile ? (
          <p className="mt-2 text-sm text-[#5c4a50]">
            {customer.name ?? "Customer"}
            {customer.maskedMobile ? ` · ${customer.maskedMobile}` : ""}
          </p>
        ) : null}
      </div>
      <div className="grid gap-px bg-[#eaded9] sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: formatOrderInr(Number(order.totalPaise ?? 0)), mono: true },
          { label: "Placed", value: formatOrderWhen(order.createdAt), mono: false },
          {
            label: "Payment",
            value: `${pay.methodLabel} · ${pay.stateLabel}`,
            mono: false,
            tone: pay.tone,
          },
          {
            label: "Fulfilment",
            value: `${fulfil.modeLabel} · ${fulfil.stateLabel}`,
            mono: false,
          },
        ].map((cell) => (
          <div key={cell.label} className="bg-white px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">{cell.label}</p>
            <p
              className={cn(
                "mt-1 text-sm font-semibold text-[#28161a]",
                cell.mono && "font-mono text-lg tabular-nums",
                "tone" in cell && cell.tone === "danger" && "text-destructive",
                "tone" in cell && cell.tone === "warning" && "text-amber-900",
              )}
            >
              {cell.value}
            </p>
            {"tone" in cell && pay.helper && cell.label === "Payment" ? (
              <p className="mt-1 text-xs text-muted-foreground">{pay.helper}</p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="grid gap-6 border-t border-[#eaded9] px-5 py-5 text-sm sm:px-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">
              {fulfilmentMode === "BRANCH_PICKUP" ? "Pickup" : "Delivery address"}
            </p>
            {fulfilmentMode === "BRANCH_PICKUP" ? (
              <p className="mt-2 text-[#5c4a50]">
                Branch pickup ·{" "}
                <span className="font-mono text-xs">{String(order.pickupBranchId ?? "—")}</span>
              </p>
            ) : address ? (
              <div className="mt-2 space-y-0.5 text-[#5c4a50]">
                {address.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {address.mobile ? <p className="pt-1 font-medium">Mobile: {address.mobile}</p> : null}
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground">No address on file.</p>
            )}
          </div>
          {delivery?.trackingNumber || delivery?.carrierName ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">Courier</p>
              <p className="mt-2 text-[#5c4a50]">
                {String(delivery.carrierName ?? "")}
                {delivery.trackingNumber ? ` · ${String(delivery.trackingNumber)}` : ""}
              </p>
              {delivery.trackingUrl ? (
                <a
                  href={String(delivery.trackingUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-[#730321] underline-offset-2 hover:underline"
                >
                  Track shipment
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailFact label="Customer ID" value={String(order.customerId ?? "—")} mono />
          <DetailFact
            label="Line items"
            value={`${lines} piece${lines === 1 ? "" : "s"}`}
          />
          <DetailFact label="Quote ID" value={String(order.quoteId ?? "—")} mono />
          <DetailFact label="Version" value={String(order.version ?? 1)} mono />
          {order.paidAt ? (
            <DetailFact label="Paid at" value={formatOrderWhen(order.paidAt)} />
          ) : null}
          {order.expiresAt ? (
            <DetailFact
              label={
                order.status === "COD_PENDING_ACCEPTANCE" ? "COD acceptance by" : "Payment expires"
              }
              value={formatOrderWhen(order.expiresAt)}
            />
          ) : null}
          {order.paymentMethod === "COD" ? (
            <DetailFact
              label="COD collection"
              value={String(order.codCollectionStatus ?? "PENDING").replaceAll("_", " ").toLowerCase()}
            />
          ) : null}
          {order.stockReleaseReason ? (
            <DetailFact label="Stock release" value={String(order.stockReleaseReason)} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OrderPaymentAttemptsList({ items }: { items: Record<string, unknown>[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No payment attempts recorded.</p>;
  }
  return (
    <ul className="divide-y rounded-xl border border-[#eaded9]">
      {items.map((row) => (
        <li key={String(row._id ?? row.id)} className="space-y-1 px-4 py-3 text-sm">
          <div className="font-mono text-xs text-[#28161a]">{String(row.id ?? row._id)}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <StatusBadge status={String(row.status ?? "")} />
            <span className="font-mono font-semibold tabular-nums">
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
    <ol className="relative space-y-0 border-l border-[#eaded9] pl-4">
      {items.map((ev) => (
        <li key={String(ev.id ?? ev._id)} className="relative pb-4 last:pb-0">
          <span className="absolute -left-[calc(0.5rem+1px)] top-1.5 size-2 rounded-full bg-[#730321]" />
          <p className="text-sm font-medium text-[#28161a]">{String(ev.type ?? ev.outcome ?? "Event")}</p>
          {ev.reason ? <p className="text-xs text-muted-foreground">{String(ev.reason)}</p> : null}
          <p className="text-xs text-muted-foreground">{formatOrderWhen(ev.at)}</p>
        </li>
      ))}
    </ol>
  );
}

export function OrderLineItemsTable({ lines }: { lines: Record<string, unknown>[] }) {
  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">No line items on this order.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#faf7f5] hover:bg-[#faf7f5]">
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit (pre-tax)</TableHead>
          <TableHead className="text-right">Line total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={`${String(line.productId)}-${String(line.quantity)}`}>
            <TableCell>
              <div className="font-medium text-[#28161a]">{String(line.name ?? "Product")}</div>
              {line.productId ? (
                <div className="font-mono text-[10px] text-muted-foreground">{String(line.productId)}</div>
              ) : null}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {line.sku ? String(line.sku) : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">{String(line.quantity ?? 1)}</TableCell>
            <TableCell className="text-right font-mono text-sm tabular-nums">
              {line.unitPricePaise != null ? formatOrderInr(Number(line.unitPricePaise)) : "—"}
            </TableCell>
            <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
              {formatOrderInr(Number(line.lineTotalPaise ?? 0))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function OrderAmountsGrid({ order }: { order: Record<string, unknown> }) {
  const financialSnapshot =
    order.financialSnapshot && typeof order.financialSnapshot === "object"
      ? (order.financialSnapshot as Record<string, unknown>)
      : null;
  const taxComponentLines = (financialSnapshot?.taxComponentLines as Record<string, unknown>[]) ?? [];
  const amountRows: Array<[string, unknown]> = [
    ["Subtotal (pre-tax)", order.subtotalPaise],
    ["Tax", order.taxPaise],
    ["Fulfilment charge", order.fulfilmentChargePaise],
  ];

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid gap-3 sm:grid-cols-2">
        {amountRows.map(([label, paise]) => (
          <div
            key={String(label)}
            className="flex items-center justify-between rounded-xl border border-[#eaded9] bg-[#faf7f5] px-4 py-3"
          >
            <dt className="text-[#5c4a50]">{label}</dt>
            <dd className="font-mono font-semibold tabular-nums text-[#28161a]">
              {formatOrderInr(Number(paise ?? 0))}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-xl border border-[#730321]/20 bg-[#f7ecee] px-4 py-3 sm:col-span-2">
          <dt className="font-semibold text-[#4b2030]">Total charged</dt>
          <dd className="font-mono text-lg font-bold tabular-nums text-[#4b2030]">
            {formatOrderInr(Number(order.totalPaise ?? 0))}
          </dd>
        </div>
      </dl>
      {taxComponentLines.length > 0 ? (
        <div className="rounded-xl border border-dashed border-[#e4d7d2] p-4 text-xs text-muted-foreground">
          <p className="mb-2 font-semibold text-foreground">Tax components (quote snapshot)</p>
          <ul className="space-y-1">
            {taxComponentLines.map((row) => (
              <li key={String(row.componentKey ?? row.label)}>
                {String(row.label ?? row.componentKey)} — {String(row.rateBps ?? 0)} bps
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {financialSnapshot?.destinationState ? (
        <p className="text-xs text-muted-foreground">
          Place of supply: {String(financialSnapshot.destinationState)}
        </p>
      ) : null}
    </div>
  );
}
