"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  ExternalLink,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/src/components/common/status-badge";
import type { WorkspaceNavStep } from "@/src/components/common/workspace-nav-cards";
import { WorkspaceNavCards } from "@/src/components/common/workspace-nav-cards";
import type { CheckoutBlocker } from "@/src/features/ecommerce/ecommerce-checkout-blockers";

export function gstPercentFromBps(bps: number): string {
  if (!Number.isFinite(bps)) return "";
  const pct = bps / 100;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, "");
}

export function gstBpsFromPercentInput(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function EcommerceSettingsToggle({
  id,
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#eaded9] bg-[#faf7f5] px-4 py-3.5 sm:items-center">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <p className="font-semibold text-[#28161a]">{title}</p>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </label>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="shrink-0"
      />
    </div>
  );
}

const SETUP_STEPS = [
  {
    key: "tax",
    label: "Product GST & HSN",
    href: "/ecommerce/tax",
    hint: "Rates on catalog + statutory codes",
  },
  {
    key: "fulfilment",
    label: "Delivery & checkout",
    href: "/ecommerce/fulfilment",
    hint: "Pickup, delivery, policies, bill GST",
  },
] as const;

export function EcommerceSetupSteps({ active }: { active: "tax" | "fulfilment" }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      {SETUP_STEPS.map((step, index) => {
        const isActive = step.key === active;
        const done = active === "fulfilment" && step.key === "tax";
        return (
          <Link
            key={step.key}
            href={step.href}
            className={cn(
              "flex gap-3 rounded-2xl border p-4 transition-colors",
              isActive
                ? "border-[#730321]/30 bg-[#fff9f5] shadow-[0_2px_5px_rgb(67_15_25/4%)]"
                : "border-[#e4d7d2] bg-white hover:border-[#dcc9c0]",
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold",
                isActive && "bg-[#730321] text-white",
                done && !isActive && "bg-emerald-100 text-emerald-800",
                !isActive && !done && "bg-[#f7ecee] text-[#7b0a2b]",
              )}
            >
              {done && !isActive ? <CheckCircle2 className="size-5" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-bold text-[#28161a]">
                {step.label}
                {isActive ? (
                  <StatusBadge status="IN_PROGRESS" label="You are here" />
                ) : null}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{step.hint}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function EcommerceReadinessPanel({
  title = "Checkout readiness",
  description = "What still blocks live checkout quotes and payment.",
  checkoutTaxReady,
  checkoutUsable,
  blockers,
  taxSettingsHref = "/ecommerce/tax",
  fulfilmentHref = "/ecommerce/fulfilment",
}: {
  title?: string;
  description?: string;
  checkoutTaxReady?: boolean;
  checkoutUsable?: boolean;
  blockers: CheckoutBlocker[];
  taxSettingsHref?: string;
  fulfilmentHref?: string;
}) {
  const ready = blockers.length === 0 && checkoutTaxReady !== false;
  return (
    <div
      className={cn(
        "mb-6 rounded-2xl border p-5 sm:p-6",
        ready
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white"
          : "border-amber-200 bg-gradient-to-br from-amber-50/90 to-white",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-[#28161a]">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <StatusBadge
          status={ready ? "SUCCESS" : "PENDING"}
          label={ready ? "Ready for checkout tax" : "Action needed"}
        />
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/80 bg-white/70 px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            GST on final bill
          </dt>
          <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#28161a]">
            {checkoutTaxReady ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                Configured
              </>
            ) : (
              <>
                <CircleAlert className="size-4 text-amber-600" aria-hidden />
                Incomplete — finish tax & fulfilment steps
              </>
            )}
          </dd>
        </div>
        <div className="rounded-xl border border-white/80 bg-white/70 px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Online payment
          </dt>
          <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#28161a]">
            {checkoutUsable ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                Enabled on plan
              </>
            ) : (
              <>
                <Circle className="size-4 text-muted-foreground" aria-hidden />
                Separate entitlement (may still be blocked by tax)
              </>
            )}
          </dd>
        </div>
      </dl>
      {blockers.length ? (
        <ul className="mt-4 space-y-2 text-sm text-[#4a3539]">
          {blockers.map((b) => (
            <li
              key={b.code ?? b.message}
              className="flex gap-2 rounded-lg border border-amber-100 bg-white/80 px-3 py-2"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
              <span>
                {b.message ?? "Complete a required setting."}
                {b.code && b.code.startsWith("MISSING_") && b.code.includes("TAX") ? (
                  <>
                    {" "}
                    <Link href={taxSettingsHref} className="font-semibold text-[#730321] underline">
                      Tax settings
                    </Link>
                  </>
                ) : null}
                {b.code === "STORE_POLICIES_NOT_PUBLISHED" ? (
                  <>
                    {" "}
                    <Link href={fulfilmentHref} className="font-semibold text-[#730321] underline">
                      Fulfilment policies
                    </Link>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-emerald-900">
          No server-reported blockers. Save any pending changes and test a checkout quote from the
          customer shop.
        </p>
      )}
    </div>
  );
}

export function EcommerceSettingsHint({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-[#e4d7d2] bg-[#faf7f5] px-4 py-3.5 text-sm leading-relaxed text-[#5c4a50]">
      <Icon className="mt-0.5 size-5 shrink-0 text-[#9a6f2a]" aria-hidden />
      <div>
        <p className="font-semibold text-[#362a2e]">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

export function EcommerceRelatedLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-semibold text-[#730321] underline-offset-2 hover:underline"
    >
      {label}
      <ExternalLink className="size-3.5" aria-hidden />
    </Link>
  );
}

/** Same toggle chrome as ecommerce setup — reuse in tenant Settings → Operations. */
export const SettingsToggleRow = EcommerceSettingsToggle;

const OPERATIONS_NAV: WorkspaceNavStep[] = [
  { href: "/ecommerce/orders", label: "Orders", hint: "Queue, fulfil, open detail" },
  { href: "/ecommerce/courier-cod", label: "Courier COD", hint: "POD & bank remittance" },
  {
    href: "/ecommerce/payment-exceptions",
    label: "Payment exceptions",
    hint: "Refunds & stuck payments",
  },
];

const CATALOG_NAV: WorkspaceNavStep[] = [
  { href: "/ecommerce", label: "Catalog", hint: "Products & publish" },
  { href: "/ecommerce/categories", label: "Categories", hint: "Shop collections" },
  { href: "/ecommerce/banners", label: "Banners", hint: "Offers rail — home & store" },
  { href: "/ecommerce/campaigns", label: "Push campaigns", hint: "FCM promotion history" },
  { href: "/ecommerce/inventory", label: "Inventory", hint: "Stock per SKU" },
  { href: "/ecommerce/gold-rates", label: "Gold rates", hint: "Store pricing" },
  { href: "/ecommerce/tax", label: "Tax", hint: "GST & HSN" },
  { href: "/ecommerce/fulfilment", label: "Fulfilment", hint: "Delivery & checkout" },
];

export function EcommerceOperationsNav() {
  return (
    <WorkspaceNavCards steps={OPERATIONS_NAV} columnsClass="sm:grid-cols-3" />
  );
}

export function EcommerceCatalogNav() {
  return (
    <WorkspaceNavCards
      steps={CATALOG_NAV}
      columnsClass="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    />
  );
}
