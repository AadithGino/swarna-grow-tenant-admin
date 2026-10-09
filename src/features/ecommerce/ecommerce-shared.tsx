"use client";

export type EcommercePricingBlock = {
  computable?: boolean;
  blockers?: Array<{ code?: string; message?: string }>;
  priceMode?: string;
  contract?: {
    fixedPriceAllInclusive?: boolean;
    fixedPriceNote?: string;
    offerPolicyNote?: string;
    taxEstimateDisclaimer?: string;
  };
  displayTotal?: { amountDisplay?: string };
  preTaxSubtotal?: { amountDisplay?: string };
  gold?: {
    weightMg?: number;
    purity?: string;
    ratePerGram?: { amountDisplay?: string };
    effectiveAt?: string;
    goldValue?: { amountDisplay?: string };
  };
  making?: {
    beforeOffer?: { amountDisplay?: string };
    offerDiscount?: { amountDisplay?: string };
    afterOffer?: { amountDisplay?: string };
  };
  stones?: { amountDisplay?: string };
  otherCharges?: { amountDisplay?: string };
  tax?: {
    total?: { amountDisplay?: string };
    settingsVersion?: number;
    lines?: Array<{
      label?: string;
      rateBps?: number;
      tax?: { amountDisplay?: string };
    }>;
  };
};

export function PricingPreviewPanel({
  pricing,
}: {
  pricing?: EcommercePricingBlock | null;
}) {
  if (!pricing) {
    return (
      <p className="text-sm text-muted-foreground">No pricing preview yet.</p>
    );
  }
  if (!pricing.computable) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Pricing blocked</p>
        <ul className="mt-2 list-disc pl-5">
          {(pricing.blockers ?? []).map((b) => (
            <li key={b.code ?? b.message}>{b.message ?? b.code}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="space-y-2 text-sm">
      {pricing.contract?.fixedPriceAllInclusive && pricing.contract.fixedPriceNote ? (
        <p className="text-muted-foreground">{pricing.contract.fixedPriceNote}</p>
      ) : null}
      {pricing.contract?.offerPolicyNote ? (
        <p className="text-muted-foreground">{pricing.contract.offerPolicyNote}</p>
      ) : null}
      {pricing.contract?.taxEstimateDisclaimer ? (
        <p className="text-xs text-muted-foreground">{pricing.contract.taxEstimateDisclaimer}</p>
      ) : null}
      <p>
        Mode: <strong>{pricing.priceMode}</strong>
      </p>
      {pricing.gold?.weightMg ? (
        <p>
          Gold: {pricing.gold.weightMg} mg ({pricing.gold.purity}) @{" "}
          {pricing.gold.ratePerGram?.amountDisplay ?? "—"}
          {pricing.gold.effectiveAt
            ? ` · rate ${new Date(pricing.gold.effectiveAt).toLocaleString("en-IN")}`
            : ""}
        </p>
      ) : null}
      {pricing.gold?.goldValue?.amountDisplay ? (
        <p>Gold value: {pricing.gold.goldValue.amountDisplay}</p>
      ) : null}
      {pricing.making?.afterOffer?.amountDisplay ? (
        <p>
          Making: {pricing.making.afterOffer.amountDisplay}
          {pricing.making.offerDiscount?.amountDisplay &&
          pricing.making.offerDiscount.amountDisplay !== "₹0"
            ? ` (discount ${pricing.making.offerDiscount.amountDisplay})`
            : ""}
        </p>
      ) : null}
      {pricing.stones?.amountDisplay &&
      pricing.stones.amountDisplay !== "₹0" ? (
        <p>Stones: {pricing.stones.amountDisplay}</p>
      ) : null}
      {pricing.otherCharges?.amountDisplay &&
      pricing.otherCharges.amountDisplay !== "₹0" ? (
        <p>Other: {pricing.otherCharges.amountDisplay}</p>
      ) : null}
      <p>Pre-tax: {pricing.preTaxSubtotal?.amountDisplay ?? "—"}</p>
      <p>Tax (v{pricing.tax?.settingsVersion ?? "—"}): {pricing.tax?.total?.amountDisplay ?? "—"}</p>
      <p className="text-base font-bold">
        Display total: {pricing.displayTotal?.amountDisplay ?? "—"}
      </p>
    </div>
  );
}
