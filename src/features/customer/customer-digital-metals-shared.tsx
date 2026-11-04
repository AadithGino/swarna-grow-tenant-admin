"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Banknote,
  Check,
  Package,
  ShoppingCart,
  TrendingDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { customerPath } from "@/src/lib/customer-tenant";
import { formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";

/** Page width for Digital Gold & Silver screens (the customer shell already pads the sides). */
export const CUSTOMER_DM_PAGE = "mx-auto w-full max-w-5xl pb-10";

export const DM_INK = "text-[#221a1d]";
export const DM_MUTED = "text-[#7a6f72]";

/** Metallic finishes used for wallet cards, coin art and metal pickers. */
export const DM_METAL_FINISH = {
  GOLD: {
    face: "linear-gradient(135deg, #fbefc8 0%, #ecc978 34%, #c99a3d 68%, #f3d995 100%)",
    ink: "#4a3208",
    soft: "#fbf3df",
    ring: "#e3c372",
  },
  SILVER: {
    face: "linear-gradient(135deg, #ffffff 0%, #e3e7ec 36%, #aab1ba 70%, #eef1f4 100%)",
    ink: "#2f353d",
    soft: "#f1f3f6",
    ring: "#c5cbd3",
  },
} as const;

export function dmFinish(metal: string) {
  return metal === "SILVER" ? DM_METAL_FINISH.SILVER : DM_METAL_FINISH.GOLD;
}

/** Customer-friendly asset name, e.g. "24K Gold · 999" or "Silver · 999". */
export function dmAssetName(metal: string, finenessPpm: number) {
  const fine = finenessPpm >= 1000 ? Number((finenessPpm / 1000).toFixed(1)) : finenessPpm;
  if (metal === "SILVER") return `Silver · ${fine}`;
  const karat = finenessPpm >= 995_000 ? "24K" : finenessPpm >= 916_000 ? "22K" : finenessPpm >= 750_000 ? "18K" : null;
  return `${karat ? `${karat} ` : ""}Gold · ${fine}`;
}

export function customerDmMetalAccent(metal: string): {
  chip: string;
  border: string;
  iconBg: string;
} {
  if (metal === "SILVER") {
    return {
      chip: "bg-slate-100 text-slate-800",
      border: "border-slate-200",
      iconBg: "bg-slate-100 text-slate-700",
    };
  }
  return {
    chip: "bg-amber-50 text-amber-950",
    border: "border-amber-100",
    iconBg: "bg-amber-50 text-amber-900",
  };
}

/** Round minted-coin illustration in the metal's finish. */
export function DmCoinArt({
  metal,
  label,
  size = 96,
  className,
}: {
  metal: string;
  label?: string;
  size?: number;
  className?: string;
}) {
  const f = dmFinish(metal);
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: f.face,
        boxShadow: `inset 0 0 0 ${Math.max(2, size / 24)}px rgba(255,255,255,.35), 0 ${size / 10}px ${size / 4}px rgba(60,40,10,.16)`,
      }}
      aria-hidden
    >
      <span
        className="absolute rounded-full"
        style={{ inset: size * 0.11, border: `${Math.max(1, size / 60)}px solid ${f.ink}`, opacity: 0.28 }}
      />
      {label ? (
        <span className="relative font-serif font-semibold leading-none" style={{ color: f.ink, fontSize: size * 0.2 }}>
          {label}
        </span>
      ) : null}
    </span>
  );
}

export function CustomerDmPageShell({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  testId,
  narrow,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  testId?: string;
  /** Single-column forms and receipts. */
  narrow?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(CUSTOMER_DM_PAGE, narrow && "max-w-2xl")} data-testid={testId}>
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--customer-primary,#730321)]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      <div className={cn("flex flex-wrap items-end justify-between gap-3", backHref && "mt-2")}>
        <div className="min-w-0">
          <h1 className={cn("font-serif text-[1.85rem] leading-tight sm:text-[2.1rem]", DM_INK)}>{title}</h1>
          {subtitle ? <p className={cn("mt-1.5 max-w-2xl text-sm leading-6", DM_MUTED)}>{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-7">{children}</div>
    </div>
  );
}

export function CustomerDmSurface({
  children,
  className = "",
  testId,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section className={cn("rounded-[1.25rem] border border-[#ecdfd8] bg-white p-5 sm:p-6", className)} data-testid={testId}>
      {children}
    </section>
  );
}

export function CustomerDmSectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className={cn("text-[15px] font-semibold", DM_INK)}>{children}</h2>;
}

export function CustomerDmQuickActionGrid({
  actions,
  tone = "light",
}: {
  actions: {
    key: string;
    label: string;
    icon: LucideIcon;
    href?: string;
    disabled?: boolean;
    variant?: "primary" | "default";
  }[];
  /** "dark" renders on the wallet hero. */
  tone?: "light" | "dark";
}) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3" data-testid="customer-dm-quick-actions">
      {actions.map((action) => {
        const Icon = action.icon;
        const primary = action.variant === "primary";
        const inner = (
          <>
            <span
              className={cn(
                "grid size-12 place-items-center rounded-2xl transition sm:size-14",
                tone === "dark"
                  ? primary
                    ? "text-[#3d2a08]"
                    : "bg-white/12 text-white ring-1 ring-white/20 group-hover:bg-white/20"
                  : primary
                    ? "text-white"
                    : "bg-[rgba(var(--customer-primary-rgb,115,3,33),0.07)] text-[var(--customer-primary,#730321)] group-hover:bg-[rgba(var(--customer-primary-rgb,115,3,33),0.12)]",
              )}
              style={
                primary
                  ? tone === "dark"
                    ? { background: DM_METAL_FINISH.GOLD.face }
                    : { background: "var(--customer-primary, #730321)" }
                  : undefined
              }
            >
              <Icon className="size-5" strokeWidth={2} aria-hidden />
            </span>
            <span className={cn("text-xs font-semibold", tone === "dark" ? "text-white/90" : "text-[#3a2f33]")}>{action.label}</span>
          </>
        );
        if (action.disabled || !action.href) {
          return (
            <span key={action.key} className="flex flex-col items-center gap-2 text-center opacity-45" aria-disabled>
              {inner}
            </span>
          );
        }
        return (
          <Link
            key={action.key}
            href={action.href}
            className="group flex flex-col items-center gap-2 rounded-2xl text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--customer-accent,#c9a227)]"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}

export type PortfolioWalletRow = {
  id: string;
  metal: string;
  finenessPpm: number;
  heldUg: string | number;
  availableUg: string | number;
  reservedUg: string | number;
  valuationStatus?: string;
  estimatedSaleValue?: { amountPaise?: number; ratePerGramPaise?: number } | null;
};

/** One wallet as a bullion card: metal finish, grams, available vs reserved and today's value. */
export function CustomerDmAssetCard({ wallet }: { wallet: PortfolioWalletRow }) {
  const metal = String(wallet.metal);
  const f = dmFinish(metal);
  const valuationOk = wallet.valuationStatus === "OK" && wallet.estimatedSaleValue?.amountPaise != null;
  const reserved = Number(wallet.reservedUg) > 0;

  return (
    <li
      className="relative overflow-hidden rounded-[1.4rem] border bg-white"
      style={{ borderColor: f.ring }}
      data-testid={`customer-dm-asset-${wallet.metal}-${wallet.finenessPpm}`}
    >
      <div className="relative px-5 pb-5 pt-5" style={{ background: f.face, color: f.ink }}>
        <div className="pointer-events-none absolute inset-0 opacity-[.18]" style={{ backgroundImage: "repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 14px)" }} aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <p className="text-sm font-semibold">{dmAssetName(metal, Number(wallet.finenessPpm))}</p>
          <DmCoinArt metal={metal} size={34} />
        </div>
        <p className="relative mt-5 font-serif text-[2.1rem] leading-none tabular-nums">{ugToGramsDisplay(wallet.heldUg)}</p>
        <p className="relative mt-1.5 text-xs font-medium opacity-75">held in your wallet</p>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-[#efe5df] text-sm">
        <div className="px-5 py-3.5">
          <dt className={cn("text-xs", DM_MUTED)}>Available to sell</dt>
          <dd className={cn("mt-0.5 font-semibold tabular-nums", DM_INK)}>{ugToGramsDisplay(wallet.availableUg)}</dd>
        </div>
        <div className="px-5 py-3.5">
          <dt className={cn("text-xs", DM_MUTED)}>Reserved</dt>
          <dd className={cn("mt-0.5 font-semibold tabular-nums", reserved ? "text-amber-700" : DM_INK)}>{ugToGramsDisplay(wallet.reservedUg)}</dd>
        </div>
      </dl>
      <div className="border-t border-[#efe5df] px-5 py-3.5 text-xs leading-5">
        {valuationOk ? (
          <p className={DM_MUTED}>
            Worth about <strong className={cn("text-sm", DM_INK)}>{formatInrFromPaise(Number(wallet.estimatedSaleValue!.amountPaise))}</strong>
            {wallet.estimatedSaleValue?.ratePerGramPaise != null ? (
              <> at today&apos;s sell rate of {formatInrFromPaise(Number(wallet.estimatedSaleValue.ratePerGramPaise))}/g</>
            ) : null}
            . Not a guaranteed quote.
          </p>
        ) : wallet.valuationStatus === "STALE_RATE" ? (
          <p className="text-amber-800">Sell rate is being refreshed — the rupee estimate returns once rates update.</p>
        ) : (
          <p className={DM_MUTED}>A rupee estimate isn&apos;t available for this wallet right now.</p>
        )}
      </div>
    </li>
  );
}

export function CustomerDmEmptyPortfolio({
  canBuy,
  tenantSlug,
}: {
  canBuy: boolean;
  tenantSlug: string | null;
}) {
  return (
    <CustomerDmSurface testId="customer-dm-empty-portfolio" className="text-center">
      <div className="mx-auto flex w-fit -space-x-4">
        <DmCoinArt metal="GOLD" size={64} label="Au" />
        <DmCoinArt metal="SILVER" size={64} label="Ag" />
      </div>
      <h2 className={cn("mt-5 font-serif text-2xl", DM_INK)}>Start with your first gram</h2>
      <p className={cn("mx-auto mt-2 max-w-sm text-sm leading-6", DM_MUTED)}>
        Buy digital gold or silver from ₹100. Your balance, history and statements appear here once metal is credited.
      </p>
      {canBuy ? (
        <Button type="button" asChild className="mx-auto mt-6 flex h-11 w-full max-w-xs rounded-full text-white" style={{ background: "var(--customer-primary, #730321)" }}>
          <Link href={customerPath(tenantSlug, "digital-metals", "buy")}>Buy digital metal</Link>
        </Button>
      ) : (
        <p className="mt-4 text-center text-xs text-amber-900">Buying is paused until your jeweller completes setup.</p>
      )}
    </CustomerDmSurface>
  );
}

export function CustomerDmTimeline({
  steps,
}: {
  steps: { id: string; label: string; detail?: string; state: "done" | "current" | "upcoming" | "failed" }[];
}) {
  return (
    <ol className="space-y-0" data-testid="customer-dm-timeline">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.id} className="flex gap-3 text-sm">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  step.state === "done" && "bg-emerald-600 text-white",
                  step.state === "current" && "border-2 border-[var(--customer-primary,#730321)] bg-white text-[var(--customer-primary,#730321)]",
                  step.state === "failed" && "bg-red-600 text-white",
                  step.state === "upcoming" && "border-2 border-[#e2d6ce] bg-white text-[#a39699]",
                )}
                aria-hidden
              >
                {step.state === "done" ? <Check className="size-4" strokeWidth={3} /> : step.state === "failed" ? <X className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              {!last ? <span className={cn("my-1 w-0.5 flex-1 min-h-[1.25rem]", step.state === "done" ? "bg-emerald-600" : "bg-[#ece3dd]")} /> : null}
            </div>
            <div className={cn("pt-0.5", !last && "pb-5")}>
              <p
                className={cn(
                  "font-semibold",
                  step.state === "current" ? "text-[var(--customer-primary,#730321)]" : step.state === "upcoming" ? "text-[#9a8d90]" : step.state === "failed" ? "text-red-700" : DM_INK,
                )}
              >
                {step.label}
              </p>
              {step.detail ? <p className={cn("mt-0.5 text-xs leading-5", DM_MUTED)}>{step.detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Radio cards for picking a metal/purity (buy) or a wallet (sell). */
export function CustomerDmMetalChoice({
  options,
  value,
  onChange,
  testId,
  label,
}: {
  options: { key: string; metal: string; finenessPpm: number; detail?: React.ReactNode }[];
  value: string;
  onChange: (key: string) => void;
  testId?: string;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-3 sm:grid-cols-2" data-testid={testId}>
      {options.map((o) => {
        const selected = value === o.key;
        const f = dmFinish(o.metal);
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.key)}
            className={cn(
              "flex items-center gap-3.5 rounded-2xl border bg-white p-3.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--customer-primary,#730321)]",
              selected ? "border-[var(--customer-primary,#730321)] shadow-[0_0_0_1px_var(--customer-primary,#730321)]" : "border-[#e6d9d1] hover:border-[#cdb9b0]",
            )}
            style={selected ? { background: `linear-gradient(0deg, ${f.soft}, ${f.soft})` } : undefined}
          >
            <DmCoinArt metal={o.metal} size={44} label={o.metal === "SILVER" ? "Ag" : "Au"} />
            <span className="min-w-0 flex-1">
              <span className={cn("block text-sm font-semibold", DM_INK)}>{dmAssetName(o.metal, o.finenessPpm)}</span>
              {o.detail ? <span className={cn("mt-0.5 block text-xs", DM_MUTED)}>{o.detail}</span> : null}
            </span>
            <span
              className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", selected ? "border-[var(--customer-primary,#730321)]" : "border-[#d6c8c0]")}
              aria-hidden
            >
              {selected ? <span className="size-2.5 rounded-full bg-[var(--customer-primary,#730321)]" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Quick-fill chips under an amount or grams field. */
export function CustomerDmQuickChips({
  chips,
  onPick,
  active,
}: {
  chips: { label: string; value: string }[];
  onPick: (value: string) => void;
  active?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => onPick(c.value)}
          className={cn(
            "h-9 rounded-full border px-3.5 text-sm font-medium transition",
            active === c.value
              ? "border-[var(--customer-primary,#730321)] bg-[rgba(var(--customer-primary-rgb,115,3,33),0.06)] text-[var(--customer-primary,#730321)]"
              : "border-[#e3d6ce] bg-white text-[#4d4245] hover:bg-[#faf5f2]",
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function buyOrderStatusLabel(status: string): { title: string; detail: string } {
  switch (status) {
    case "CREDITED":
      return { title: "Metal credited", detail: "Payment succeeded and grams were added to your wallet." };
    case "PAYMENT_PENDING":
      return { title: "Awaiting payment", detail: "Complete payment to lock in your quote and receive metal." };
    case "PAYMENT_FAILED":
      return { title: "Payment did not go through", detail: "You can retry payment without creating a new order." };
    case "REFUND_REVIEW":
      return { title: "Under review", detail: "Our team is reviewing a payment or refund — no action needed from you yet." };
    default:
      return { title: "Processing", detail: "We are updating your purchase status." };
  }
}

export function sellOrderStatusLabel(status: string): { title: string; detail: string } {
  switch (status) {
    case "PENDING_APPROVAL":
      return {
        title: "Previous request needs review",
        detail: "This request was created under the previous sell flow. Contact your jeweller to resolve it.",
      };
    case "RESERVED":
      return { title: "Metal reserved", detail: "Confirm the sale before the quote expires. Your metal is debited when you confirm." };
    case "PAYABLE_OPEN":
      return { title: "Sale accepted — payment pending", detail: "Metal was debited at your confirmed price. Your jeweller still owes the payment." };
    case "SETTLED":
      return { title: "Payment recorded", detail: "Your jeweller has recorded full payment for this sale." };
    case "CANCELLED":
      return { title: "Cancelled", detail: "Reservation released back to your available balance." };
    case "EXPIRED":
      return { title: "Sell request expired", detail: "Start a new sell quote if you still wish to sell." };
    default:
      return { title: "Sell order", detail: "Status updates appear here as your jeweller processes the sale." };
  }
}

export function redemptionOrderStatusLabel(status: string): { title: string; detail: string } {
  switch (status) {
    case "CHARGE_PENDING":
      return { title: "Pay minting & delivery charges", detail: "Metal is reserved; pay INR charges to continue fulfilment." };
    case "CHARGE_PAID":
      return { title: "Charges paid — preparing order", detail: "Your jeweller will pack and dispatch or ready pickup." };
    case "FULFILMENT_ACCEPTED":
      return { title: "Order accepted", detail: "Your jeweller is preparing your physical item." };
    case "PACKING":
      return { title: "Packing", detail: "Your item is being prepared for dispatch or pickup." };
    case "DISPATCHED":
      return { title: "Dispatched", detail: "Track shipment or wait for delivery confirmation." };
    case "PICKUP_READY":
      return { title: "Ready for pickup", detail: "Visit the branch with your pickup code and ID." };
    case "COMPLETED":
      return { title: "Handed over", detail: "Physical item collected — metal was debited from your wallet." };
    case "CANCELLED":
      return { title: "Cancelled", detail: "Reservation released; refunds follow your jeweller's policy." };
    default:
      return { title: "Redemption order", detail: "Progress updates appear below." };
  }
}

export function bankDestinationStatusLabel(status: string): string {
  if (status === "ACTIVE") return "Verified by jeweller — ready for sell payouts";
  if (status === "PENDING_VERIFICATION") return "Pending manual verification by your jeweller";
  if (status === "DISABLED") return "Disabled — cannot be used for payouts";
  return "Status unavailable";
}

export const DM_QUICK_ICONS = {
  buy: ShoppingCart,
  sell: TrendingDown,
  redeem: Package,
  bank: Banknote,
};
