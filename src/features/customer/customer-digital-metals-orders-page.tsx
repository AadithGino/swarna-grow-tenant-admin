"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import { customerPath } from "@/src/lib/customer-tenant";
import { ChevronRight } from "lucide-react";
import {
  customerDigitalMetalsOrderActionLabel,
  customerDigitalMetalsOrderHref,
  type CustomerDmOrderKind,
} from "@/src/lib/customer-digital-metals-order-links";
import {
  useGetCustomerDigitalMetalsBuyOrdersQuery,
  useGetCustomerDigitalMetalsCapabilityQuery,
  useGetCustomerDigitalMetalsRedemptionOrdersQuery,
  useGetCustomerDigitalMetalsSellOrdersQuery,
} from "@/src/store/api/customer-api";
import { CustomerDmPageShell, DmCoinArt } from "@/src/features/customer/customer-digital-metals-shared";

const TABS: { id: CustomerDmOrderKind; label: string }[] = [
  { id: "buy", label: "Purchases" },
  { id: "sell", label: "Sales" },
  { id: "redemption", label: "Physical delivery" },
];

function formatWhen(iso: unknown) {
  if (!iso) return "—";
  try {
    return new Date(String(iso)).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function CustomerDigitalMetalsOrdersPage() {
  const { tenantSlug } = useCustomerTenant();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const [tab, setTab] = useState<CustomerDmOrderKind>(
    tabParam === "sell" || tabParam === "redemption" ? tabParam : "buy",
  );
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [stack, setStack] = useState<Record<string, unknown>[]>([]);

  const capability = useGetCustomerDigitalMetalsCapabilityQuery(undefined, { skip: !tenantSlug });
  const buy = useGetCustomerDigitalMetalsBuyOrdersQuery(
    tab === "buy" ? { limit: 20, cursor } : undefined,
    { skip: !tenantSlug || tab !== "buy" },
  );
  const sell = useGetCustomerDigitalMetalsSellOrdersQuery(
    tab === "sell" ? { limit: 20, cursor } : undefined,
    { skip: !tenantSlug || tab !== "sell" },
  );
  const redemption = useGetCustomerDigitalMetalsRedemptionOrdersQuery(
    tab === "redemption" ? { limit: 20, cursor } : undefined,
    { skip: !tenantSlug || tab !== "redemption" },
  );

  const active = tab === "buy" ? buy : tab === "sell" ? sell : redemption;

  const mergedItems = useMemo(() => {
    const batch = active.data?.items ?? [];
    if (!cursor) return batch;
    const ids = new Set(stack.map((r) => String(r.id)));
    return [...stack, ...batch.filter((r) => !ids.has(String(r.id)))];
  }, [active.data?.items, cursor, stack]);

  if (capability.isLoading || active.isLoading) return <PageSkeleton cards={2} />;
  if (active.isError) return <QueryError error={active.error} onRetry={active.refetch} />;

  const canView = capability.data?.canViewHoldings || mergedItems.length > 0;
  if (!canView && !capability.data?.hasLegacyActivity) {
    return (
      <CustomerDmPageShell title="Orders & tracking" subtitle="Digital gold & silver">
        <p className="text-sm text-muted-foreground">Order history is not available for this account.</p>
      </CustomerDmPageShell>
    );
  }

  return (
    <CustomerDmPageShell
      narrow
      title="Orders & tracking"
      subtitle="Purchases, sales and coin or bar redemptions — including anything still waiting for payment."
      backHref={customerPath(tenantSlug, "digital-metals")}
      backLabel="Wallet"
      testId="customer-dm-orders-page"
    >
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Order type">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setCursor(undefined);
              setStack([]);
            }}
            className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition ${tab === t.id ? "border-transparent text-white" : "border-[#e3d6ce] bg-white text-[#4d4245] hover:bg-[#faf5f2]"}`}
            style={tab === t.id ? { background: "var(--customer-primary, #730321)" } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {mergedItems.length === 0 ? (
          <p className="rounded-[1.25rem] border border-dashed border-[#e3d6ce] px-4 py-10 text-center text-sm text-[#7a6f72]">No orders of this type yet.</p>
        ) : (
          <ul className="divide-y divide-[#f0e6e0] overflow-hidden rounded-[1.25rem] border border-[#ecdfd8] bg-white">
            {mergedItems.map((row) => {
              const id = String(row.id);
              const status = String(row.status ?? "");
              const href = customerDigitalMetalsOrderHref(tenantSlug, tab, id);
              const metal = String(row.metal ?? "GOLD");
              const amountPaise =
                tab === "buy"
                  ? Number(row.totalPayablePaise ?? 0)
                  : tab === "sell"
                    ? Number(row.settlementPaise ?? 0)
                    : Number(row.chargeTotalPaise ?? 0);
              const title =
                tab === "redemption" && row.itemLabel
                  ? String(row.itemLabel)
                  : `${tab === "sell" ? "Sold" : "Bought"} ${ugToGramsDisplay(String(row.quantityUg ?? "0"))} ${metal === "SILVER" ? "silver" : "gold"}`;
              return (
                <li key={id}>
                  <Link href={href} className="group flex items-center gap-4 px-4 py-4 transition hover:bg-[#fcfaf8] sm:px-5">
                    <DmCoinArt metal={metal} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-medium text-[#221a1d]">{title}</p>
                        <StatusBadge status={status} />
                      </div>
                      <p className="mt-0.5 text-xs text-[#7a6f72]">
                        {formatWhen(row.createdAt ?? row.updatedAt)}
                        {tab === "redemption" ? ` · ${ugToGramsDisplay(String(row.quantityUg ?? "0"))}` : ""}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[var(--customer-primary,#730321)]">{customerDigitalMetalsOrderActionLabel(status, tab)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums text-[#221a1d]">{formatInrFromPaise(amountPaise)}</p>
                      <p className="text-[11px] text-[#9a8d90]">{tab === "buy" ? (status === "CREDITED" ? "paid" : "amount") : tab === "sell" ? "payout" : "charges"}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-[#b3a5a8] transition group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {active.data?.meta?.hasMore ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-11 w-full rounded-full"
            onClick={() => {
              setStack(mergedItems);
              setCursor(active.data?.meta?.nextCursor ?? undefined);
            }}
          >
            Load more
          </Button>
        ) : null}
      </div>
    </CustomerDmPageShell>
  );
}
