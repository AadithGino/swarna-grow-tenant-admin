"use client";

import Link from "next/link";

const PRICING_BLOCKER_LINKS: Record<string, { href: string; label: string }> = {
  TAX_CLASSIFICATION_UNKNOWN: { href: "/ecommerce/tax", label: "Open tax settings" },
  GOLD_RATE_MISSING: { href: "/ecommerce/gold-rates", label: "Open gold rates" },
  GOLD_RATE_STALE: { href: "/ecommerce/gold-rates", label: "Publish a fresh gold rate" },
  GOLD_RATE_NOT_EFFECTIVE: { href: "/ecommerce/gold-rates", label: "Open gold rates" },
};

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
      <p className="rounded-xl bg-[#f8f4ef] p-4 text-sm text-muted-foreground">Pricing preview will appear after the product is saved.</p>
    );
  }
  if (!pricing.computable) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Price unavailable</p>
        <p className="mt-1">The store cannot show a total until these inputs are ready.</p>
        <ul className="mt-2 space-y-2 pl-0 list-none">
          {(pricing.blockers ?? []).map((b) => {
            const link = b.code ? PRICING_BLOCKER_LINKS[b.code] : undefined;
            return (
              <li key={b.code ?? b.message} className="rounded-lg bg-white/70 px-3 py-2">
                <span>{b.message ?? b.code}</span>
                {link ? (
                  <Link href={link.href} className="mt-1 block text-sm font-semibold text-primary underline-offset-2 hover:underline">
                    {link.label}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  const rows = [
    pricing.gold?.goldValue?.amountDisplay ? { label: "Gold value", value: pricing.gold.goldValue.amountDisplay } : null,
    pricing.making?.afterOffer?.amountDisplay ? { label: "Making charge", value: pricing.making.afterOffer.amountDisplay } : null,
    pricing.making?.offerDiscount?.amountDisplay && pricing.making.offerDiscount.amountDisplay !== "₹0" ? { label: "Making offer applied", value: `− ${pricing.making.offerDiscount.amountDisplay}` } : null,
    pricing.stones?.amountDisplay && pricing.stones.amountDisplay !== "₹0" ? { label: "Stones", value: pricing.stones.amountDisplay } : null,
    pricing.otherCharges?.amountDisplay && pricing.otherCharges.amountDisplay !== "₹0" ? { label: "Other charges", value: pricing.otherCharges.amountDisplay } : null,
    { label: "Price before tax", value: pricing.preTaxSubtotal?.amountDisplay ?? "—" },
    { label: "Estimated tax", value: pricing.tax?.total?.amountDisplay ?? "—" },
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  return (
    <div className="space-y-4 text-sm">
      {pricing.gold?.weightMg ? (
        <p className="rounded-xl bg-[#f8f4ee] px-4 py-3 text-[#5d4c43]">
          {pricing.gold.purity} gold · {(pricing.gold.weightMg / 1000).toFixed(3)} g
          {pricing.gold.ratePerGram?.amountDisplay ? ` · ${pricing.gold.ratePerGram.amountDisplay}/g` : ""}
        </p>
      ) : null}
      <dl className="divide-y divide-[#f0e9e4] rounded-xl border border-[#efe7e1] px-4">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 py-3"><dt className="text-[#73696c]">{row.label}</dt><dd className="text-right font-semibold text-[#362a2e]">{row.value}</dd></div>
        ))}
        <div className="flex items-center justify-between gap-4 py-4 text-base font-bold text-primary"><dt>Estimated total</dt><dd>{pricing.displayTotal?.amountDisplay ?? "—"}</dd></div>
      </dl>
      {pricing.contract?.fixedPriceAllInclusive && pricing.contract.fixedPriceNote ? (
        <p className="text-xs text-muted-foreground">{pricing.contract.fixedPriceNote}</p>
      ) : null}
      {pricing.contract?.offerPolicyNote ? (
        <p className="text-muted-foreground">{pricing.contract.offerPolicyNote}</p>
      ) : null}
      {pricing.contract?.taxEstimateDisclaimer ? (
        <p className="text-xs text-muted-foreground">{pricing.contract.taxEstimateDisclaimer}</p>
      ) : null}
    </div>
  );
}
