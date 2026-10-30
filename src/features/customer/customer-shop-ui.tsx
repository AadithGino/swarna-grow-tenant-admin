"use client";

import Link from "next/link";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import type { EcommercePricingBlock } from "@/src/features/ecommerce/ecommerce-shared";

/** Shared building blocks for the customer online store (tenant-branded via CSS variables). */

export const SHOP_INK = "text-[#221a1d]";
export const SHOP_MUTED = "text-[#7a6f72]";
export const SHOP_HAIRLINE = "border-[#ecdfd8]";

export function formatShopInr(paise: number | null | undefined, digits = 0) {
  const n = Number(paise ?? 0) / 100;
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function formatGramsFromMg(mg: number | null | undefined) {
  const n = Number(mg ?? 0);
  if (!n) return null;
  const g = n / 1000;
  return `${Number(g.toFixed(3)).toLocaleString("en-IN", { maximumFractionDigits: 3 })} g`;
}

type ProductLike = Record<string, unknown>;

export type StockState = {
  tone: "in" | "low" | "out" | "mto" | "unknown";
  label: string;
};

export function productStock(product: ProductLike): StockState {
  const a = product.availability as
    | { purchasable?: boolean; stockPolicy?: string; availableQuantity?: number | null; label?: string }
    | undefined;
  if (!a) return { tone: "unknown", label: "" };
  if (a.purchasable === false) return { tone: "out", label: "Sold out" };
  if (a.stockPolicy === "MADE_TO_ORDER") return { tone: "mto", label: "Made to order" };
  const q = Number(a.availableQuantity ?? 0);
  if (q > 0 && q <= 3) return { tone: "low", label: q === 1 ? "Only 1 left" : `Only ${q} left` };
  return { tone: "in", label: a.label ?? "In stock" };
}

export function productMeta(product: ProductLike): string {
  const parts: string[] = [];
  if (product.purity) parts.push(String(product.purity));
  const g = formatGramsFromMg(product.goldWeightMg as number | undefined);
  if (g) parts.push(g);
  return parts.join(" · ");
}

/** e.g. "25% off making" when the product carries a live making-charge offer. */
export function productOfferLabel(product: ProductLike): string | null {
  const offer = product.offer as { type?: string; percentBps?: number } | null | undefined;
  if (offer?.percentBps) return `${Math.round(offer.percentBps / 100)}% off making`;
  const pricing = product.pricing as EcommercePricingBlock & {
    making?: { offerDiscount?: { amountPaise?: number } };
  };
  if (Number(pricing?.making?.offerDiscount?.amountPaise ?? 0) > 0) return "Making offer";
  return null;
}

export function productPricePaise(product: ProductLike | null | undefined): number | null {
  const pricing = product?.pricing as { computable?: boolean; displayTotal?: { amountPaise?: number } } | undefined;
  if (!pricing?.computable) return null;
  const v = Number(pricing.displayTotal?.amountPaise);
  return Number.isFinite(v) ? v : null;
}

export function StockDot({ stock, className }: { stock: StockState; className?: string }) {
  if (!stock.label) return null;
  const dot =
    stock.tone === "out"
      ? "bg-[#b42318]"
      : stock.tone === "low"
        ? "bg-amber-500"
        : stock.tone === "mto"
          ? "bg-[var(--customer-accent,#c9a227)]"
          : "bg-emerald-600";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", SHOP_MUTED, className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden />
      {stock.label}
    </span>
  );
}

/** Product artwork on a soft tinted "display tray". */
export function ShopProductArt({
  uploadId,
  viewUrl,
  alt,
  className,
  rounded = "rounded-2xl",
}: {
  uploadId?: string | null;
  viewUrl?: string | null;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden customer-primary-tint-surface", rounded, className)}>
      {uploadId || viewUrl ? (
        <EcommerceCatalogImage uploadId={uploadId} viewUrl={viewUrl} channel="customer" alt={alt} fill className="object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <ShoppingBag className="size-1/3 max-h-10 max-w-10 text-[var(--customer-primary,#730321)] opacity-30" aria-hidden />
        </div>
      )}
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  disabled,
  max = 99,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  max?: number;
  label: string;
}) {
  return (
    <div
      className={cn("inline-flex h-9 items-center rounded-full border bg-white", SHOP_HAIRLINE)}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="grid size-9 place-items-center rounded-full text-[#4d4245] transition hover:bg-[#f6efeb] disabled:opacity-40"
        aria-label="Decrease quantity"
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="grid size-9 place-items-center rounded-full text-[#4d4245] transition hover:bg-[#f6efeb] disabled:opacity-40"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

const CHECKOUT_STEPS = ["Cart", "Review price", "Order & pay"] as const;

/** Three-step checkout progress: cart → price preview → order. */
export function ShopCheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm" aria-label="Checkout progress">
      {CHECKOUT_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="flex min-w-0 items-center gap-2" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  done && "bg-emerald-600 text-white",
                  active && "text-white",
                  !done && !active && "border border-[#ddd0c8] bg-white text-[#9a8d90]",
                )}
                style={active ? { background: "var(--customer-primary, #730321)" } : undefined}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("truncate", active ? SHOP_INK : SHOP_MUTED)}>{label}</span>
            </span>
            {i < CHECKOUT_STEPS.length - 1 ? <span className="h-px w-5 shrink-0 bg-[#ddd0c8] sm:w-10" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function ShopPanel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-[1.25rem] border bg-white", SHOP_HAIRLINE, className)}>
      {title ? (
        <header className={cn("flex items-start justify-between gap-3 border-b px-5 py-4", SHOP_HAIRLINE)}>
          <div className="min-w-0">
            <h2 className={cn("text-[15px] font-semibold", SHOP_INK)}>{title}</h2>
            {description ? <p className={cn("mt-0.5 text-xs leading-5", SHOP_MUTED)}>{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Radio-style choice card used for fulfilment, payment and address pickers. */
export function ChoiceCard({
  selected,
  disabled,
  onSelect,
  icon,
  title,
  detail,
  aside,
  name,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
  title: React.ReactNode;
  detail?: React.ReactNode;
  aside?: React.ReactNode;
  name: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 transition",
        selected ? "border-[var(--customer-primary,#730321)] shadow-[0_0_0_1px_var(--customer-primary,#730321)]" : "border-[#e6d9d1] hover:border-[#cdb9b0]",
        disabled && "cursor-not-allowed opacity-50 hover:border-[#e6d9d1]",
      )}
    >
      <input type="radio" name={name} className="sr-only" checked={selected} disabled={disabled} onChange={onSelect} />
      {icon ? (
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--customer-primary,#730321)]"
          style={{ background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.07)" }}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-semibold", SHOP_INK)}>{title}</span>
        {detail ? <span className={cn("mt-0.5 block text-xs leading-5", SHOP_MUTED)}>{detail}</span> : null}
      </span>
      {aside ? <span className="shrink-0 text-sm font-semibold">{aside}</span> : null}
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
          selected ? "border-[var(--customer-primary,#730321)]" : "border-[#d6c8c0]",
        )}
        aria-hidden
      >
        {selected ? <span className="size-2.5 rounded-full bg-[var(--customer-primary,#730321)]" /> : null}
      </span>
    </label>
  );
}

/** Customer-facing price breakdown (no admin links, plain-language rows). */
export function CustomerPriceBreakdown({ pricing }: { pricing?: EcommercePricingBlock | null }) {
  if (!pricing) return null;
  if (!pricing.computable) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Price is being updated</p>
        <p className="mt-1 leading-6">
          The jeweller is refreshing today&apos;s rate or tax for this piece. Check back shortly — nothing is charged
          until you place an order.
        </p>
      </div>
    );
  }
  const offer = pricing.making?.offerDiscount?.amountDisplay;
  const hasOffer = offer && offer !== "₹0";
  const rows: { label: string; detail?: string; value: string; tone?: "offer" }[] = [];
  if (pricing.gold?.goldValue?.amountDisplay) {
    const w = formatGramsFromMg(pricing.gold.weightMg);
    rows.push({
      label: "Gold value",
      detail: [pricing.gold.purity, w, pricing.gold.ratePerGram?.amountDisplay ? `${pricing.gold.ratePerGram.amountDisplay}/g` : null]
        .filter(Boolean)
        .join(" · "),
      value: pricing.gold.goldValue.amountDisplay,
    });
  }
  if (pricing.making?.beforeOffer?.amountDisplay && hasOffer) {
    rows.push({ label: "Making charge", value: pricing.making.beforeOffer.amountDisplay });
    rows.push({ label: "Making offer", value: `− ${offer}`, tone: "offer" });
  } else if (pricing.making?.afterOffer?.amountDisplay) {
    rows.push({ label: "Making charge", value: pricing.making.afterOffer.amountDisplay });
  }
  if (pricing.stones?.amountDisplay && pricing.stones.amountDisplay !== "₹0") rows.push({ label: "Stones", value: pricing.stones.amountDisplay });
  if (pricing.otherCharges?.amountDisplay && pricing.otherCharges.amountDisplay !== "₹0") rows.push({ label: "Other charges", value: pricing.otherCharges.amountDisplay });
  if (pricing.preTaxSubtotal?.amountDisplay && rows.length) rows.push({ label: "Before tax", value: pricing.preTaxSubtotal.amountDisplay });
  const taxLines = pricing.tax?.lines ?? [];
  if (taxLines.length) {
    for (const t of taxLines) {
      rows.push({
        label: t.label ?? "Tax",
        detail: t.rateBps ? `${t.rateBps / 100}%` : undefined,
        value: t.tax?.amountDisplay ?? "—",
      });
    }
  } else if (pricing.tax?.total?.amountDisplay) {
    rows.push({ label: "Tax", value: pricing.tax.total.amountDisplay });
  }

  return (
    <div className="text-sm">
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <dt className={SHOP_MUTED}>
              {row.label}
              {row.detail ? <span className="ml-1.5 text-xs text-[#a39699]">{row.detail}</span> : null}
            </dt>
            <dd className={cn("text-right font-medium tabular-nums", row.tone === "offer" ? "text-emerald-700" : SHOP_INK)}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className={cn("mt-4 flex items-baseline justify-between gap-4 border-t pt-4", SHOP_HAIRLINE)}>
        <span className={cn("font-semibold", SHOP_INK)}>Estimated total</span>
        <span className="text-lg font-bold tabular-nums text-[var(--customer-primary,#730321)]">{pricing.displayTotal?.amountDisplay ?? "—"}</span>
      </div>
      {pricing.contract?.offerPolicyNote ? <p className="mt-3 text-xs text-emerald-800">{pricing.contract.offerPolicyNote}</p> : null}
      {pricing.contract?.fixedPriceAllInclusive && pricing.contract.fixedPriceNote ? (
        <p className={cn("mt-3 text-xs", SHOP_MUTED)}>{pricing.contract.fixedPriceNote}</p>
      ) : null}
      {pricing.contract?.taxEstimateDisclaimer ? <p className={cn("mt-2 text-xs", SHOP_MUTED)}>{pricing.contract.taxEstimateDisclaimer}</p> : null}
    </div>
  );
}

export function ShopTextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("font-semibold text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline", className)}
    >
      {children}
    </Link>
  );
}
