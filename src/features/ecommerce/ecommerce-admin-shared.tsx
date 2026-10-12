"use client";

import {
  useGetSettingsOperationsQuery,
  useGetSubscriptionQuery,
} from "@/src/store/api/admin-api";
import { useAppSelector } from "@/src/store/hooks";
import { hasPermission } from "@/src/lib/permissions";
import {
  canViewEcommerceHistoricalWorkspace,
  isEcommercePlanEntitled,
  isEcommerceStorefrontActive,
  resolveEcommerceServerAccess,
  type EcommerceServerAccessState,
} from "@/src/lib/ecommerce-entitlement";

export function useEcommerceServerEntitlement() {
  const operations = useGetSettingsOperationsQuery();
  const subscription = useGetSubscriptionQuery();
  const access = resolveEcommerceServerAccess(subscription.data, operations.data);
  const loading =
    (subscription.isLoading || operations.isLoading)
    && access == null;
  const error =
    subscription.isError && operations.isError && access == null;
  const planEntitled = isEcommercePlanEntitled(access);
  const storefrontActive = isEcommerceStorefrontActive(access);
  const historicalWorkspace = canViewEcommerceHistoricalWorkspace(access);
  return {
    loading,
    error,
    access: access as EcommerceServerAccessState | null,
    planEntitled,
    storefrontActive,
    historicalWorkspace,
    disabledMessage: planEntitled
      ? null
      : "Your plan does not include ecommerce catalog management. Upgrade to edit the online store.",
  };
}

function useEcommerceEntitlement() {
  const base = useEcommerceServerEntitlement();
  return {
    loading: base.loading,
    entitled: base.planEntitled,
    disabledMessage: base.disabledMessage,
  };
}

export function useEcommerceCatalogWrite() {
  return useEcommerceEntitlement();
}

/** Nav, dashboard widgets, and report picker — plan + permission. */
export function useEcommerceWorkspaceNavVisible() {
  const base = useEcommerceServerEntitlement();
  const user = useAppSelector((s) => s.session.session?.user);
  const canRead = hasPermission(user, "ecommerce.read");
  const canReport = hasPermission(user, "report.read");
  return {
    ...base,
    showEcommerceNav:
      !base.loading && !base.error && base.historicalWorkspace && canRead,
    showEcommerceDashboard:
      !base.loading && !base.error && base.planEntitled && canRead && canReport,
    showEcommerceReports:
      !base.loading && !base.error && base.historicalWorkspace && canRead && canReport,
  };
}

export function useEcommerceAdminAccess() {
  const base = useEcommerceEntitlement();
  const user = useAppSelector((s) => s.session.session?.user);
  const canRead = hasPermission(user, "ecommerce.read");
  const canWrite = hasPermission(user, "ecommerce.write");
  const canPaymentOperate = hasPermission(user, "ecommerce.payment.operate");
  const canRefundOperate = hasPermission(user, "ecommerce.refund.operate");
  const canFulfilmentOperate = hasPermission(user, "ecommerce.fulfilment.operate");
  return {
    ...base,
    canRead,
    canWrite,
    canPaymentOperate,
    canRefundOperate,
    canFulfilmentOperate,
    readBlockedMessage: canRead
      ? null
      : "You need ecommerce read permission to view this page.",
    writeBlockedMessage: canWrite
      ? null
      : "You need ecommerce write permission to change catalog or inventory settings.",
  };
}

export function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function ShopPriceLabel({
  pricing,
  className,
}: {
  pricing?: {
    computable?: boolean;
    displayTotal?: { amountDisplay?: string } | null;
  } | null;
  className?: string;
}) {
  if (!pricing?.computable) {
    return (
      <span className={className ?? "text-sm font-medium text-amber-800"}>
        Price unavailable
      </span>
    );
  }
  return (
    <span className={className ?? "text-lg font-bold text-primary"}>
      {pricing.displayTotal?.amountDisplay ?? "—"}
    </span>
  );
}
