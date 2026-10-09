"use client";

import { useGetSettingsQuery } from "@/src/store/api/admin-api";

export function useEcommerceCatalogWrite() {
  const settings = useGetSettingsQuery();
  const ecommerce = settings.data?.ecommerce as
    | { planEntitled?: boolean }
    | undefined;
  const entitled =
    ecommerce?.planEntitled === true ||
    settings.data?.features?.ecommerce === true;
  return {
    loading: settings.isLoading,
    entitled,
    disabledMessage: entitled
      ? null
      : "Your plan does not include ecommerce catalog management. Upgrade to edit the online store.",
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
}: {
  pricing?: {
    computable?: boolean;
    displayTotal?: { amountDisplay?: string } | null;
  } | null;
}) {
  if (!pricing?.computable) {
    return (
      <span className="text-sm font-medium text-amber-800">Price unavailable</span>
    );
  }
  return (
    <span className="text-lg font-bold">
      {pricing.displayTotal?.amountDisplay ?? "—"}
    </span>
  );
}
