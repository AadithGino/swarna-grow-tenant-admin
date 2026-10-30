"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  ExternalLink,
  Percent,
  Scale,
  Truck,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/src/components/common/status-badge";
import { SectionTabs, type SectionTab } from "@/src/components/admin-ui/detail-parts";
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

const STORE_SETTINGS_TABS: SectionTab[] = [
  { href: "/ecommerce/gold-rates", label: "Gold rates", icon: Scale },
  { href: "/ecommerce/tax", label: "GST & HSN", icon: Percent },
  { href: "/ecommerce/fulfilment", label: "Delivery & checkout", icon: Truck },
];

/** Tabs shared by the three store-settings pages (one "Store settings" item in the sidebar). */
export function EcommerceStoreSettingsTabs({ className }: { className?: string }) {
  return <SectionTabs tabs={STORE_SETTINGS_TABS} ariaLabel="Store settings" className={className} />;
}

/** Kept for existing callers: the tax → fulfilment setup flow is now the settings tabs. */
export function EcommerceSetupSteps({ active }: { active: "tax" | "fulfilment" }) {
  void active;
  return <EcommerceStoreSettingsTabs />;
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
        "mb-6 rounded-[1.15rem] border p-5 sm:p-6",
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
          <dt className="text-xs font-semibold text-muted-foreground">GST on final bill</dt>
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
          <dt className="text-xs font-semibold text-muted-foreground">Online payment</dt>
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
    <div className="flex gap-3 rounded-2xl border border-[#efe2d0] bg-gradient-to-r from-[#fdf8ef] to-white px-4 py-3.5 text-sm leading-relaxed text-[#5c4a50]">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f7ead0] text-[#8a5c12]">
        <Icon className="size-4" aria-hidden />
      </span>
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

/**
 * The big section nav cards were replaced by the grouped sidebar ("Online store").
 * These stay as no-ops so existing pages keep compiling.
 */
export function EcommerceOperationsNav() {
  return null;
}

export function EcommerceCatalogNav() {
  return null;
}

const QUICK_LINKS: { href: string; label: string }[] = [
  { href: "/ecommerce", label: "Store overview" },
  { href: "/ecommerce/catalog", label: "Products" },
  { href: "/ecommerce/categories", label: "Categories" },
  { href: "/ecommerce/inventory", label: "Inventory" },
  { href: "/ecommerce/banners", label: "Banners" },
  { href: "/ecommerce/gold-rates", label: "Gold rates" },
  { href: "/ecommerce/tax", label: "GST & HSN" },
  { href: "/ecommerce/fulfilment", label: "Delivery & checkout" },
];

/** Compact link chips into the online store (used from Settings). */
export function EcommerceQuickLinks() {
  return (
    <nav aria-label="Online store pages" className="flex flex-wrap gap-2">
      {QUICK_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="inline-flex h-8 items-center rounded-full border border-[#e6dad6] bg-white px-3 text-sm font-medium text-[#5c4a4e] transition-colors hover:border-[#d7b2bc] hover:bg-[#fbf1f3] hover:text-[#5e0a20]"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
