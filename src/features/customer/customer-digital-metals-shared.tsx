"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Banknote,
  Coins,
  Package,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { customerPath } from "@/src/lib/customer-tenant";
import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import { formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";

export const CUSTOMER_DM_PAGE = "mx-auto w-full max-w-lg px-4 py-6 lg:max-w-3xl lg:px-8 lg:py-8";

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

export function CustomerDmPageShell({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  testId,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={CUSTOMER_DM_PAGE} data-testid={testId}>
      {backHref ? (
        <Link
          href={backHref}
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--customer-primary,#730321)]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      <h1 className="font-serif text-2xl text-[var(--customer-primary,#730321)] lg:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5c3d42]">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
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
    <section
      className={`rounded-2xl border border-[#eaded9] bg-white p-5 shadow-[0_6px_20px_rgba(var(--customer-primary-rgb,115,3,33),0.06)] ${className}`}
      data-testid={testId}
    >
      {children}
    </section>
  );
}

export function CustomerDmSectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold tracking-wide text-[#28161a]">{children}</h2>;
}

export function CustomerDmQuickActionGrid({
  actions,
}: {
  actions: {
    key: string;
    label: string;
    icon: LucideIcon;
    href?: string;
    disabled?: boolean;
    variant?: "primary" | "default";
  }[];
}) {
  return (
    <div
      className={`grid gap-2.5 ${actions.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : actions.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
      data-testid="customer-dm-quick-actions"
    >
      {actions.map((action) => {
        const Icon = action.icon;
        const inner = (
          <>
            <span
              className={`grid size-11 place-items-center rounded-2xl ${action.variant === "primary" ? "bg-[var(--customer-primary,#730321)] text-white" : "bg-[#f6edf0] text-[var(--customer-primary,#730321)]"}`}
            >
              <Icon className="size-[1.15rem]" strokeWidth={2.1} aria-hidden />
            </span>
            <span className="text-[0.6875rem] font-bold leading-tight text-[#292732]">{action.label}</span>
          </>
        );
        if (action.disabled || !action.href) {
          return (
            <span
              key={action.key}
              className="flex min-h-[5.35rem] flex-col items-center justify-center gap-2 rounded-2xl border border-[#f0ebe6] bg-[#faf8f7] px-1 py-3.5 text-center opacity-55"
              aria-disabled
            >
              {inner}
            </span>
          );
        }
        return (
          <Link
            key={action.key}
            href={action.href}
            className="flex min-h-[5.35rem] flex-col items-center justify-center gap-2 rounded-2xl border border-[#f0ebe6] bg-white px-1 py-3.5 text-center shadow-[0_6px_20px_rgba(var(--customer-primary-rgb,115,3,33),0.06)] transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--customer-primary,#730321)]"
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

export function CustomerDmAssetCard({ wallet }: { wallet: PortfolioWalletRow }) {
  const accent = customerDmMetalAccent(String(wallet.metal));
  const label = formatAssetLabel(String(wallet.metal), Number(wallet.finenessPpm));
  const valuationOk = wallet.valuationStatus === "OK" && wallet.estimatedSaleValue?.amountPaise != null;

  return (
    <li
      className={`rounded-2xl border ${accent.border} bg-white p-4 shadow-sm`}
      data-testid={`customer-dm-asset-${wallet.metal}-${wallet.finenessPpm}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${accent.chip}`}>{label}</span>
          <p className="mt-2 text-xs text-[#8a6a70]">Each purity is tracked separately — balances are not mixed.</p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${accent.iconBg}`}>
          <Coins className="size-5" aria-hidden />
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center sm:gap-4">
        <div className="rounded-xl bg-[#faf8f7] px-2 py-2.5">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#8a6a70]">Total held</dt>
          <dd className="mt-1 text-sm font-bold text-[#28161a]">{ugToGramsDisplay(wallet.heldUg)}</dd>
        </div>
        <div className="rounded-xl bg-[#faf8f7] px-2 py-2.5">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#8a6a70]">Available</dt>
          <dd className="mt-1 text-sm font-bold text-[var(--customer-primary,#730321)]">
            {ugToGramsDisplay(wallet.availableUg)}
          </dd>
        </div>
        <div className="rounded-xl bg-[#faf8f7] px-2 py-2.5">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#8a6a70]">Reserved</dt>
          <dd className="mt-1 text-sm font-bold text-[#28161a]">{ugToGramsDisplay(wallet.reservedUg)}</dd>
        </div>
      </dl>
      {valuationOk ? (
        <p className="mt-3 text-xs leading-relaxed text-[#5c3d42]">
          Indicative value if sold today at published sell rate:{" "}
          <strong>{formatInrFromPaise(Number(wallet.estimatedSaleValue!.amountPaise))}</strong>
          {wallet.estimatedSaleValue?.ratePerGramPaise != null ? (
            <> ({formatInrFromPaise(Number(wallet.estimatedSaleValue.ratePerGramPaise))}/g)</>
          ) : null}
          . Not a guaranteed quote.
        </p>
      ) : wallet.valuationStatus === "STALE_RATE" ? (
        <p className="mt-3 text-xs text-amber-900">Sell rate is being refreshed — INR estimate hidden until rates update.</p>
      ) : (
        <p className="mt-3 text-xs text-[#8a6a70]">Indicative value unavailable for this wallet.</p>
      )}
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
    <CustomerDmSurface testId="customer-dm-empty-portfolio">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#f6edf0] text-[var(--customer-primary,#730321)]">
        <Coins className="size-7" aria-hidden />
      </span>
      <h2 className="mt-4 text-center text-lg font-bold text-[#171722]">Start with your first purchase</h2>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-[#706b77]">
        Buy digital gold or silver in grams. Your balance, history, and statements will appear here after metal is
        credited.
      </p>
      {canBuy ? (
        <Button type="button" asChild className="mx-auto mt-5 flex w-full max-w-xs">
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
    <ol className="space-y-3" data-testid="customer-dm-timeline">
      {steps.map((step, i) => (
        <li key={step.id} className="flex gap-3 text-sm">
          <span
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              step.state === "done"
                ? "bg-emerald-100 text-emerald-900"
                : step.state === "current"
                  ? "bg-[var(--customer-primary,#730321)] text-white"
                  : step.state === "failed"
                    ? "bg-red-100 text-red-900"
                    : "bg-[#f0ebe6] text-[#8a6a70]"
            }`}
            aria-hidden
          >
            {i + 1}
          </span>
          <div>
            <p className="font-medium text-[#28161a]">{step.label}</p>
            {step.detail ? <p className="mt-0.5 text-xs text-[#5c3d42]">{step.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
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
        title: "Awaiting jeweller approval",
        detail: "Metal is reserved. Approval must happen before the sale executes and payout opens.",
      };
    case "RESERVED":
      return { title: "Metal reserved", detail: "Complete confirmation before the approval window expires." };
    case "PAYABLE_OPEN":
      return { title: "Sale complete — payout in progress", detail: "Metal was debited; bank transfer is handled separately." };
    case "SETTLED":
      return { title: "Payout settled", detail: "Funds were sent to your verified bank account." };
    case "CANCELLED":
      return { title: "Cancelled", detail: "Reservation released back to your available balance." };
    case "EXPIRED":
      return { title: "Approval window expired", detail: "Start a new sell quote if you still wish to sell." };
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
