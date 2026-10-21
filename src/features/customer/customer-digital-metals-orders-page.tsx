"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { money } from "@/src/lib/format";
import { ugToGramsDisplay } from "@/src/lib/digital-metals-display";
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
import { CustomerDmPageShell, CustomerDmSurface } from "@/src/features/customer/customer-digital-metals-shared";

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
      title="Orders & tracking"
      subtitle="Purchases, sales, and physical redemptions — including unpaid checkout steps."
      backHref={`/${tenantSlug}/digital-metals`}
      testId="customer-dm-orders-page"
    >
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => {
              setTab(t.id);
              setCursor(undefined);
              setStack([]);
            }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <CustomerDmSurface className="mt-4">
        {mergedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders in this category yet.</p>
        ) : (
          <ul className="divide-y">
            {mergedItems.map((row) => {
              const id = String(row.id);
              const status = String(row.status ?? "");
              const href = customerDigitalMetalsOrderHref(tenantSlug, tab, id);
              const amountPaise =
                tab === "buy"
                  ? Number(row.totalPayablePaise ?? 0)
                  : tab === "sell"
                    ? Number(row.settlementPaise ?? 0)
                    : Number(row.chargeTotalPaise ?? 0);
              return (
                <li key={id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-[#28161a]">
                        {String(row.metal ?? "Metal")} · {ugToGramsDisplay(String(row.quantityUg ?? "0"))}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatWhen(row.createdAt ?? row.updatedAt)} · {money(amountPaise)}
                      </p>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                  <Link href={href} className="mt-2 inline-flex text-xs font-medium text-primary underline underline-offset-2">
                    {customerDigitalMetalsOrderActionLabel(status, tab)}
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
            className="mt-4 w-full"
            onClick={() => {
              setStack(mergedItems);
              setCursor(active.data?.meta?.nextCursor ?? undefined);
            }}
          >
            Load more
          </Button>
        ) : null}
      </CustomerDmSurface>
    </CustomerDmPageShell>
  );
}
