"use client";

import Link from "next/link";
import { QueryError } from "@/src/components/common/query-state";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/src/components/common/status-badge";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { formatDeliveryAddressSnapshot, ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import { money } from "@/src/lib/format";
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

function formatUg(ug: string) {
  const grams = Number(ug) / 1_000_000;
  return `${grams.toFixed(4)} g`;
}

export function CustomerDigitalMetalsTab({ customerId }: { customerId: string }) {
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

  return (
    <div className="space-y-6" data-testid="admin-customer-digital-metals-tab">
      <div className="rounded-2xl border border-[#e8d9d0] bg-[#faf7f4] px-5 py-4">
        <h2 className="font-serif text-xl font-semibold text-[#31242a]">Digital metal wallets</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Branch-scoped staff only see customers in their branch.
        </p>
      </div>
      <ul className="space-y-2 text-sm">
        {(wallets.data?.items ?? []).length === 0 ? (
          <li className="text-muted-foreground">No wallets yet.</li>
        ) : (
          wallets.data?.items.map((w) => (
            <li key={w.id} className="rounded-xl border bg-card px-4 py-3">
              <p className="font-medium">
                {w.metal} ({w.finenessPpm / 1000}‰)
              </p>
              <p>Available {formatUg(w.availableUg)}</p>
              <p className="text-xs text-muted-foreground">
                Held {formatUg(w.heldUg)} · Reserved {formatUg(w.reservedUg)}
              </p>
            </li>
          ))
        )}
      </ul>

      <DigitalMetalsCustomerBankPanel customerId={customerId} />

      <div data-testid="admin-customer-digital-metals-purchases">
        <h3 className="text-sm font-semibold">Purchases</h3>
        {buyOrders.isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
        ) : (buyOrders.data?.items ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No buy orders.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {buyOrders.data?.items.map((row) => (
              <li key={String(row.id)} className="rounded-xl border bg-card px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {String(row.metal ?? "")} · {ugToGramsDisplay(String(row.quantityUg ?? "0"))}
                  </p>
                  <StatusBadge status={String(row.status ?? "")} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{money(Number(row.totalPayablePaise ?? 0))}</p>
                <Link
                  href={`/digital-metals/purchases/${encodeURIComponent(String(row.id))}`}
                  className="mt-2 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  View purchase
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(buyOrders.data?.meta?.hasMore ?? false) ? (
          <Link href="/digital-metals/purchases" className="mt-2 inline-block text-xs underline">
            All purchases
          </Link>
        ) : null}
      </div>

      <div data-testid="admin-customer-digital-metals-sells">
        <h3 className="text-sm font-semibold">Sell orders</h3>
        {sellOrders.isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
        ) : (sellOrders.data?.items ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No sell orders.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {sellOrders.data?.items.map((row) => (
              <li key={String(row.id)} className="rounded-xl border bg-card px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {String(row.metal ?? "")} · {ugToGramsDisplay(String(row.quantityUg ?? "0"))}
                  </p>
                  <StatusBadge status={String(row.status ?? "")} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Settlement {money(Number(row.settlementPaise ?? 0))}
                </p>
                <Link
                  href={`/digital-metals/sells/${encodeURIComponent(String(row.id))}`}
                  className="mt-2 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  View sell
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div data-testid="admin-customer-digital-metals-redemptions">
        <h3 className="text-sm font-semibold">Physical redemption</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Open and recent redemption orders for this customer.
        </p>
        {redemptionOrders.isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
        ) : redemptionOrders.isError ? (
          <p className="mt-2 text-xs text-destructive">Could not load redemption orders.</p>
        ) : (redemptionOrders.data?.items ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No redemption orders yet.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {redemptionOrders.data?.items.map((row) => {
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
                <li key={id} className="rounded-xl border bg-card px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {ugToGramsDisplay(String(row.quantityUg ?? "0"))} {String(row.metal ?? "")}
                    </p>
                    <StatusBadge status={String(row.status ?? "")} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{fulfilment}</p>
                  <Link
                    href={`/digital-metals/redemption/orders/${encodeURIComponent(id)}`}
                    className="mt-2 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    View order
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div data-testid="admin-customer-digital-metals-risk-holds">
        <h3 className="text-sm font-semibold">Risk holds</h3>
        {riskHolds.isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
        ) : (riskHolds.data?.items ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No active or historical holds.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-xs">
            {riskHolds.data?.items.map((hold) => (
              <li key={String(hold.id)} className="rounded-xl border bg-card px-3 py-2">
                <p className="font-medium">
                  {String(hold.reasonCode)} · {String(hold.status)}
                </p>
                <p className="text-muted-foreground">Exposure ₹{Number(hold.exposurePaise ?? 0) / 100}</p>
                {hold.status === "ACTIVE" ? (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      className="flex-1 rounded-md border px-2 py-1 text-xs"
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
      </div>
      <div>
        <h3 className="text-sm font-semibold">Passbook</h3>
        {passbook.isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {(passbook.data?.items ?? []).map((row) => (
              <li key={String(row.id)}>
                {String(row.entryType)} · Δ {String(row.quantityUgDelta)} µg
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
