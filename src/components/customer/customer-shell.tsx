"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useBrowserPathname } from "@/src/hooks/use-browser-pathname";
import { recordPortalNavigation } from "@/src/lib/portal-nav";
import { Bell, CircleHelp, Coins, CreditCard, Home, IndianRupee, Layers3, LogOut, Search, ShoppingBag, Sparkles, UserRound, WalletCards } from "lucide-react";
import { useGetCustomerHomeQuery, useGetCustomerProfileQuery, useGetShopAvailabilityQuery } from "@/src/store/api/customer-api";
import { useCustomerSignOut } from "@/src/lib/use-customer-sign-out";
import { cn } from "@/lib/utils";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { CustomerRegistrationGuard } from "@/src/components/customer/customer-registration-guard";
import { useCustomerIdentity } from "@/src/components/customer/customer-identity-context";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { CustomerBrand } from "@/src/components/customer/customer-ui";
import { isCustomerShopProductPage, isCustomerSubPage } from "@/src/components/customer/customer-kit";
import { CustomerBrandingSplash } from "@/src/components/customer/customer-branding-splash";
import { CustomerFcmRegistrar } from "@/src/components/customer/customer-fcm-registrar";
import { CustomerHandoverCodeHost } from "@/src/features/customer/customer-handover-code-drawer";
import { useCustomerDigitalMetalsVisible } from "@/src/lib/customer-digital-metals-visible";

const coreNavigation = [
  { segment: "", label: "Home", icon: Home, exact: true },
  { segment: "schemes", label: "Schemes", icon: WalletCards, exact: false },
  { segment: "payments", label: "Payments", icon: CreditCard, exact: false },
  { segment: "support", label: "Support", icon: CircleHelp, exact: false },
  { segment: "profile", label: "Profile", icon: UserRound, exact: false },
] as const;

const mobileNavigation = [
  { segment: "", label: "Home", icon: Home, exact: true, fab: false },
  { segment: "schemes", label: "Schemes", icon: Layers3, exact: false, fab: false },
  { segment: "__pay__", label: "Pay", icon: IndianRupee, exact: false, fab: true },
  { segment: "notifications", label: "Alerts", icon: Bell, exact: false, fab: false },
  { segment: "profile", label: "Profile", icon: UserRound, exact: false, fab: false },
] as const;

function CustomerShellInner({ children }: { children: React.ReactNode }) {
  const pathname = useBrowserPathname();
  useEffect(() => {
    if (pathname) recordPortalNavigation(pathname);
  }, [pathname]);
  const { tenantSlug, tenantCode } = useCustomerTenant();
  const { signOut } = useCustomerSignOut();
  const { ready: identityReady } = useCustomerIdentity();
  const splashStorageKey = tenantCode ? `swarnagrow.customer.splashDone.${tenantCode}` : null;
  const [splashDone, setSplashDone] = useState(() => {
    if (typeof window === "undefined" || !tenantCode) return false;
    try {
      return sessionStorage.getItem(`swarnagrow.customer.splashDone.${tenantCode}`) === "1";
    } catch {
      return false;
    }
  });
  const onSplashDone = useCallback(() => {
    setSplashDone(true);
    if (!splashStorageKey) return;
    try {
      sessionStorage.setItem(splashStorageKey, "1");
    } catch {
      /* ignore quota / private mode */
    }
  }, [splashStorageKey]);
  // Re-show splash only when switching jeweller in the same browser tab session.
  useEffect(() => {
    if (!tenantCode) {
      setSplashDone(false);
      return;
    }
    try {
      setSplashDone(sessionStorage.getItem(`swarnagrow.customer.splashDone.${tenantCode}`) === "1");
    } catch {
      setSplashDone(false);
    }
  }, [tenantCode]);
  // Defer portal data until splash finishes so skeleton/nav never bleed through.
  const { data: home } = useGetCustomerHomeQuery(undefined, { skip: !identityReady || !splashDone });
  const { data: shopAvailability } = useGetShopAvailabilityQuery(undefined, { skip: !identityReady || !splashDone });
  const storeAvailable = shopAvailability?.available === true;
  const { data: profile } = useGetCustomerProfileQuery(undefined, { skip: !identityReady || !splashDone });
  const { visible: digitalMetalsVisible } = useCustomerDigitalMetalsVisible();
  const { customerSelfEnrol, customerAppWriteEnabled, customerAppPaymentsEnabled } = useCustomerPortalCapabilities();
  const unread = home?.unreadNotificationCount ?? 0;
  const homeHref = customerPath(tenantSlug);
  const navigation = [
    ...coreNavigation.slice(0, 2),
    ...(digitalMetalsVisible
      ? [{ segment: "digital-metals", label: "Digital gold", icon: Coins, exact: false }]
      : []),
    ...(storeAvailable ? [{ segment: "shop", label: "Shop", icon: ShoppingBag, exact: false }] : []),
    ...coreNavigation.slice(2),
  ].map((item) => ({ ...item, href: item.segment ? customerPath(tenantSlug, item.segment) : homeHref }));
  const payScheme =
    home?.activeSchemes?.find((scheme) => scheme.id === home.actionCard?.schemeId) ??
    home?.activeSchemes?.find((scheme) => scheme.canPay) ??
    home?.activeSchemes?.[0];
  const payHref =
    payScheme && customerAppPaymentsEnabled
      ? customerPath(tenantSlug, "schemes", payScheme.id)
      : customerPath(tenantSlug, "schemes");

  const mobileItems = mobileNavigation.map((item) => {
    if (item.segment !== "notifications") return item;
    if (storeAvailable) {
      return { ...item, segment: "shop", label: "Shop", icon: ShoppingBag };
    }
    if (digitalMetalsVisible) {
      return { ...item, segment: "digital-metals", label: "Digital gold", icon: Coins };
    }
    return item;
  });
  const mobileNav = mobileItems.map((item) => {
    if (item.segment === "__pay__") return { ...item, href: payHref };
    return { ...item, href: item.segment ? customerPath(tenantSlug, item.segment) : homeHref };
  });

  const active = (item: { href: string; exact: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const initials = (home?.customer.name ?? "AN")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!splashDone) {
    return (
      <div className="customer-theme min-h-screen bg-[#0a0a0a]">
        <CustomerBrandingSplash onDone={onSplashDone} />
      </div>
    );
  }

  return (
    <div className="customer-theme min-h-screen text-[#171722]">
      <CustomerFcmRegistrar />
      <header className={cn("sticky top-0 z-40 border-b border-[var(--ck-line)] bg-[#f7f3ee]/95 backdrop-blur-xl", isCustomerSubPage(pathname) && "hidden lg:block")}>
        <div className="mx-auto flex h-[68px] max-w-lg items-center gap-3 px-4 sm:h-[76px] sm:max-w-[1240px] sm:px-6 lg:px-8">
          <Link href={homeHref} aria-label="Customer home" className="min-w-0 flex-1 sm:flex-none">
            <CustomerBrand subtitle={profile?.branch?.name} />
          </Link>
          <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Customer navigation">
            {navigation.filter((item) => item.segment !== "profile").map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-bold transition",
                  active(item) ? "text-[var(--customer-primary,#730321)]" : "text-[#6f6b78] hover:bg-[#f6f2ee] hover:text-[#171722]",
                )}
                style={active(item) ? { background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.08)" } : undefined}
              >
                {item.label}
              </Link>
            ))}
            {customerSelfEnrol && customerAppWriteEnabled ? (
              <Link
                href={customerPath(tenantSlug, "plans")}
                className="ml-1 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-[#fff7e5]"
                style={{
                  borderColor: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.18)",
                  color: "var(--customer-primary, #730321)",
                }}
              >
                <Sparkles className="size-4" style={{ color: "var(--customer-accent, #a47316)" }} />
                Explore plans
              </Link>
            ) : null}
          </nav>
          <div className="flex shrink-0 items-center gap-2 lg:ml-4">
            {storeAvailable ? (
              <Link
                href={`${customerPath(tenantSlug, "shop")}?search=1`}
                aria-label="Search jewellery"
                className="grid size-10 place-items-center rounded-full border border-[var(--ck-line)] bg-white text-[var(--ck-ink)] transition hover:bg-[#fbf8f4]"
              >
                <Search className="size-[1.1rem]" strokeWidth={1.8} />
              </Link>
            ) : null}
            <Link
              href={customerPath(tenantSlug, "notifications")}
              aria-label={`${unread} unread notifications`}
              className="relative grid size-10 place-items-center rounded-full border border-[var(--ck-line)] bg-white text-[var(--ck-ink)] transition hover:bg-[#fbf8f4]"
            >
              <Bell className="size-[1.1rem]" strokeWidth={1.8} />
              {unread > 0 ? (
                <span
                  className="absolute -right-1 -top-1 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full px-1 text-[0.625rem] font-bold text-white ring-2 ring-[#f7f3ee]"
                  style={{ background: "var(--customer-primary, #730321)" }}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <Link
              href={customerPath(tenantSlug, "profile")}
              aria-label="Profile"
              className="hidden size-10 place-items-center overflow-hidden rounded-full border border-[var(--ck-line)] bg-[var(--ck-gold-soft)] text-[0.8rem] font-bold lg:grid"
              style={{ color: "var(--customer-primary, #730321)" }}
            >
              {initials}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-68px)] max-w-lg px-4 pb-28 pt-5 sm:min-h-[calc(100vh-76px)] sm:max-w-[1240px] sm:px-6 sm:pt-9 lg:px-8 lg:pb-12">
        {!customerAppWriteEnabled || !customerAppPaymentsEnabled ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {!customerAppWriteEnabled
              ? "View-only mode is enabled by your jeweller."
              : "Online payments are currently disabled by your jeweller."}
          </div>
        ) : null}
        <CustomerRegistrationGuard>{children}</CustomerRegistrationGuard>
      </main>

      <nav
        className={cn("customer-bottom-safe fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ck-line)] bg-white px-1 pt-1.5 lg:hidden", isCustomerShopProductPage(pathname) && "hidden")}
        aria-label="Primary navigation"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
          {mobileNav.map((item) =>
            item.fab ? (
              <Link
                key={item.label}
                href={item.href}
                aria-label={item.label}
                className="relative -top-4 mx-auto flex flex-col items-center gap-1"
              >
                <span
                  className="grid size-[3.25rem] place-items-center rounded-full border-4 border-white text-white shadow-[0_6px_14px_-6px_rgba(58,13,22,.55)]"
                  style={{ background: "var(--customer-primary, #730321)" }}
                >
                  <item.icon className="size-[1.35rem]" strokeWidth={2} />
                </span>
                <span className="text-[0.65rem] font-medium text-[var(--ck-muted)]">{item.label}</span>
              </Link>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[0.65rem] font-semibold transition")}
                style={{ color: active(item) ? "var(--customer-primary, #730321)" : "var(--ck-muted)" }}
              >
                <span className="relative grid size-8 place-items-center">
                  <item.icon className="size-[1.4rem]" strokeWidth={active(item) ? 2 : 1.7} />
                  {item.segment === "notifications" && unread > 0 ? (
                    <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-[#ef394e] ring-2 ring-white" />
                  ) : null}
                </span>
                <span className={cn("truncate", active(item) ? "font-semibold" : "font-medium")}>
                  {item.label}
                </span>
              </Link>
            ),
          )}
        </div>
      </nav>

      <button
        type="button"
        onClick={signOut}
        className="fixed bottom-5 right-5 z-20 hidden items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-bold text-[#706b77] shadow-sm xl:flex"
        style={{ borderColor: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.18)" }}
        aria-label="Sign out"
      >
        <LogOut className="size-4" />
        Sign out
      </button>

      <CustomerHandoverCodeHost />
    </div>
  );
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  return <CustomerShellInner>{children}</CustomerShellInner>;
}
