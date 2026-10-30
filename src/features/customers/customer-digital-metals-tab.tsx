"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Building2, Coins, Package, ShieldAlert, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryError } from "@/src/components/common/query-state";
import { Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { formatDeliveryAddressSnapshot } from "@/src/lib/digital-metals-display";
import {
  useGetDigitalMetalsBuyOrdersQuery,
  useGetDigitalMetalsCustomerPassbookQuery,
  useGetDigitalMetalsCustomerRiskHoldsQuery,
  useGetDigitalMetalsCustomerWalletsQuery,
  useGetDigitalMetalsRedemptionOrdersQuery,
  useGetDigitalMetalsSellOrdersQuery,
  useResolveDigitalMetalsRiskHoldMutation,
} from "@/src/store/api/admin-api";
import { DigitalMetalsCustomerBankPanel } from "@/src/features/digital-metals/digital-metals-customer-bank-panel";
import { MetalPill, dmInr, dmWeight, shortDateTime } from "@/src/features/digital-metals/digital-metals-admin-ui";

function formatUg(ug: string) {
  const grams = Number(ug) / 1_000_000;
  return `${grams.toFixed(4)} g`;
}

type Row = Record<string, unknown>;

function ChannelChip({ counter }: { counter: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
        counter ? "bg-[#f7ecee] text-[#7b0a2b]" : "bg-slate-100 text-slate-600",
      )}
    >
      {counter ? <Store className="size-3" aria-hidden /> : null}
      {counter ? "Counter" : "App"}
    </span>
  );
}

function OrderRow({
  href,
  icon,
  metal,
  title,
  meta,
  amount,
  status,
  extra,
}: {
  href: string;
  icon: ReactNode;
  metal?: string;
  title: ReactNode;
  meta: ReactNode;
  amount: ReactNode;
  status: string;
  extra?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#faf5f2] text-[#7b0a2b]">{icon}</span>
      <Link href={href} className="min-w-0 flex-1 hover:underline">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-[#28161a]">
          {metal ? <MetalPill metal={metal} /> : null}
          {title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[#8a7c80]">{meta}</span>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-bold tabular-nums text-[#28161a]">{amount}</span>
        <StatusBadge status={status} />
      </div>
      {extra ? <div className="w-full sm:w-auto">{extra}</div> : null}
    </li>
  );
}

/**
 * Customer → Digital metals. `actions` (Buy / Sell buttons) and `sellAction` (e.g. Pay cash) are passed in by
 * the customer page so this tab only reads data.
 */
export function CustomerDigitalMetalsTab({
  customerId,
  actions,
  sellAction,
}: {
  customerId: string;
  actions?: ReactNode;
  sellAction?: (row: Row) => ReactNode;
}) {
  const wallets = useGetDigitalMetalsCustomerWalletsQuery(customerId);
  const passbook = useGetDigitalMetalsCustomerPassbookQuery({ customerId, limit: 25 });
  const riskHolds = useGetDigitalMetalsCustomerRiskHoldsQuery(customerId);
  const buyOrders = useGetDigitalMetalsBuyOrdersQuery({ customerId, limit: 10 });
  const sellOrders = useGetDigitalMetalsSellOrdersQuery({ customerId, limit: 10 });
  const redemptionOrders = useGetDigitalMetalsRedemptionOrdersQuery({ customerId, limit: 10 });
  const [resolveHold, resolveState] = useResolveDigitalMetalsRiskHoldMutation();
  const [resolutionNote, setResolutionNote] = useState("");

  if (wallets.isError) {
    return (
      <QueryError
        title="Could not load digital metal wallets"
        error={wallets.error}
        onRetry={wallets.refetch}
      />
    );
  }

  const walletItems = wallets.data?.items ?? [];
  const buys = (buyOrders.data?.items ?? []) as Row[];
  const sells = (sellOrders.data?.items ?? []) as Row[];
  const redemptions = (redemptionOrders.data?.items ?? []) as Row[];
  const holds = (riskHolds.data?.items ?? []) as Row[];
  const ledger = (passbook.data?.items ?? []) as Row[];

  return (
    <div className="space-y-5" data-testid="admin-customer-digital-metals-tab">
      <Surface
        icon={Coins}
        title="Vault balance"
        description="What the customer holds right now. Branch staff only see customers in their branch."
        action={actions}
      >
        {wallets.isLoading ? (
          <p className="px-5 py-6 text-sm text-[#8a7c80]">Loading…</p>
        ) : walletItems.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#8a7c80]">No wallets yet. The first purchase opens one.</p>
        ) : (
          <ul className={cn("grid gap-px bg-[#f1e8e5]", walletItems.length > 1 && "sm:grid-cols-2")}>
            {walletItems.map((w) => (
              <li key={w.id} className="bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <MetalPill metal={w.metal} />
                  <span className="text-xs text-[#8a7c80]">{(w.finenessPpm / 10_000).toFixed(1)}% pure</span>
                </div>
                <p className="mt-2 text-[1.6rem] font-extrabold tabular-nums tracking-tight text-[#28161a]">{dmWeight(w.heldUg)}</p>
                <p className="text-sm font-medium text-[#3a2a2f]">Available {formatUg(w.availableUg)}</p>
                <p className="text-xs text-[#8a7c80]">
                  {Number(w.reservedUg) > 0 ? `${formatUg(w.reservedUg)} reserved for pending sells` : "Nothing reserved"}
                  {Number(w.pendingBuyUg) > 0 ? ` · ${formatUg(w.pendingBuyUg)} awaiting payment` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <div className="grid gap-5 xl:grid-cols-2">
        <Surface
          title="Purchases"
          description="Latest buys, from the app or the counter"
          data-testid="admin-customer-digital-metals-purchases"
          action={
            <Link href="/digital-metals/purchases" className="text-sm font-semibold text-[#7b0a2b] hover:underline">
              All purchases
            </Link>
          }
        >
          {buyOrders.isLoading ? (
            <p className="px-5 py-6 text-sm text-[#8a7c80]">Loading…</p>
          ) : buys.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[#8a7c80]">No buy orders.</p>
          ) : (
            <ul className="divide-y divide-[#f3eae7]">
              {buys.map((row) => (
                <OrderRow
                  key={String(row.id)}
                  href={`/digital-metals/purchases/${encodeURIComponent(String(row.id))}`}
                  icon={<ArrowDownLeft className="size-4" aria-hidden />}
                  metal={String(row.metal ?? "")}
                  title={
                    <>
                      {dmWeight(String(row.quantityUg ?? "0"))}
                      <ChannelChip counter={row.channel === "COUNTER"} />
                    </>
                  }
                  meta={shortDateTime(String(row.createdAt ?? "") || null)}
                  amount={dmInr(Number(row.totalPayablePaise ?? 0))}
                  status={String(row.status ?? "")}
                />
              ))}
            </ul>
          )}
        </Surface>

        <Surface
          title="Sells"
          description="Grams sold back to the shop and how they were paid"
          data-testid="admin-customer-digital-metals-sells"
          action={
            <Link href="/digital-metals/sells" className="text-sm font-semibold text-[#7b0a2b] hover:underline">
              All sells
            </Link>
          }
        >
          {sellOrders.isLoading ? (
            <p className="px-5 py-6 text-sm text-[#8a7c80]">Loading…</p>
          ) : sells.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[#8a7c80]">No sell orders.</p>
          ) : (
            <ul className="divide-y divide-[#f3eae7]">
              {sells.map((row) => {
                const cash = row.payoutMethod === "CASH";
                return (
                  <OrderRow
                    key={String(row.id)}
                    href={`/digital-metals/sells/${encodeURIComponent(String(row.id))}`}
                    icon={<ArrowUpRight className="size-4" aria-hidden />}
                    metal={String(row.metal ?? "")}
                    title={
                      <>
                        {dmWeight(String(row.quantityUg ?? "0"))}
                        <ChannelChip counter={Boolean(row.assisted)} />
                      </>
                    }
                    meta={
                      <span className="inline-flex items-center gap-1">
                        {cash ? <Banknote className="size-3" aria-hidden /> : <Building2 className="size-3" aria-hidden />}
                        {cash ? "Cash payout" : "Bank payout"} · {shortDateTime(String(row.createdAt ?? "") || null)}
                      </span>
                    }
                    amount={`Settlement ${dmInr(Number(row.settlementPaise ?? 0))}`}
                    status={String(row.status ?? "")}
                    extra={sellAction ? sellAction(row) : null}
                  />
                );
              })}
            </ul>
          )}
        </Surface>
      </div>

      <Surface bodyClassName="p-5">
        <DigitalMetalsCustomerBankPanel customerId={customerId} />
      </Surface>

      <div className="grid gap-5 xl:grid-cols-2">
        <Surface
          icon={Package}
          title="Coin & bar redemptions"
          description="Open and recent requests to take metal home"
          data-testid="admin-customer-digital-metals-redemptions"
        >
          {redemptionOrders.isLoading ? (
            <p className="px-5 py-6 text-sm text-[#8a7c80]">Loading…</p>
          ) : redemptionOrders.isError ? (
            <p className="px-5 py-6 text-sm text-destructive">Could not load redemption orders.</p>
          ) : redemptions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[#8a7c80]">No redemption orders yet.</p>
          ) : (
            <ul className="divide-y divide-[#f3eae7]">
              {redemptions.map((row) => {
                const id = String(row.id);
                const snapshot = row.deliveryAddressSnapshot as Record<string, unknown> | undefined;
                const snap = row.snapshot as Record<string, unknown> | undefined;
                const fulfilment =
                  String(row.fulfilmentMode) === "DELIVERY"
                    ? formatDeliveryAddressSnapshot(snapshot) || "Delivery"
                    : snap?.pickupBranchLabel
                      ? `Pickup · ${String(snap.pickupBranchLabel)}`
                      : row.pickupBranchId
                        ? `Pickup · ${String(row.pickupBranchId)}`
                        : "Pickup";
                return (
                  <OrderRow
                    key={id}
                    href={`/digital-metals/redemption/orders/${encodeURIComponent(id)}`}
                    icon={<Package className="size-4" aria-hidden />}
                    metal={String(row.metal ?? "")}
                    title={dmWeight(String(row.quantityUg ?? "0"))}
                    meta={fulfilment}
                    amount=""
                    status={String(row.status ?? "")}
                  />
                );
              })}
            </ul>
          )}
        </Surface>

        <Surface
          icon={ShieldAlert}
          title="Risk holds"
          description="Holds block new sells until resolved"
          data-testid="admin-customer-digital-metals-risk-holds"
        >
          {riskHolds.isLoading ? (
            <p className="px-5 py-6 text-sm text-[#8a7c80]">Loading…</p>
          ) : holds.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[#8a7c80]">No active or past holds.</p>
          ) : (
            <ul className="divide-y divide-[#f3eae7]">
              {holds.map((hold) => (
                <li key={String(hold.id)} className="space-y-2 px-5 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#28161a]">{String(hold.reasonCode).replace(/_/g, " ").toLowerCase()}</p>
                    <StatusBadge status={String(hold.status)} />
                  </div>
                  <p className="text-xs text-[#8a7c80]">Exposure {dmInr(Number(hold.exposurePaise ?? 0))}</p>
                  {hold.status === "ACTIVE" ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        className="h-9 flex-1"
                        placeholder="Resolution note (audited)"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={resolveState.isLoading || resolutionNote.trim().length < 3}
                        onClick={() =>
                          void resolveHold({
                            holdId: String(hold.id),
                            resolutionNote: resolutionNote.trim(),
                            idempotencyKey: newIdempotencyKey(),
                          }).then(() => riskHolds.refetch())
                        }
                      >
                        Resolve
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>

      <Surface title="Passbook" description="Every gram in and out of the vault">
        {passbook.isLoading ? (
          <p className="px-5 py-6 text-sm text-[#8a7c80]">Loading…</p>
        ) : ledger.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#8a7c80]">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-[#f3eae7]">
            {ledger.map((row) => {
              const delta = Number(row.quantityUgDelta ?? 0);
              return (
                <li key={String(row.id)} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium capitalize text-[#28161a]">{String(row.entryType ?? "").replace(/_/g, " ").toLowerCase()}</span>
                    <span className="block text-xs text-[#8a7c80]">{shortDateTime(String(row.createdAt ?? row.occurredAt ?? "") || null)}</span>
                  </span>
                  <span className={cn("font-bold tabular-nums", delta < 0 ? "text-red-700" : delta > 0 ? "text-emerald-700" : "text-[#5d4f53]")}>
                    {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                    {dmWeight(Math.abs(delta))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Surface>
    </div>
  );
}
