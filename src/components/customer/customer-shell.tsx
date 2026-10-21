"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordPortalNavigation } from "@/src/lib/portal-nav";
import { Bell, CircleHelp, Coins, CreditCard, Home, IndianRupee, Layers3, LogOut, ShoppingBag, Sparkles, UserRound, WalletCards } from "lucide-react";
import { useGetCustomerHomeQuery, useGetShopAvailabilityQuery } from "@/src/store/api/customer-api";
import { useCustomerSignOut } from "@/src/lib/use-customer-sign-out";
import { cn } from "@/lib/utils";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { CustomerRegistrationGuard } from "@/src/components/customer/customer-registration-guard";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { CustomerBrand } from "@/src/components/customer/customer-ui";
import { CustomerFcmRegistrar } from "@/src/components/customer/customer-fcm-registrar";
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

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) recordPortalNavigation(pathname);
  }, [pathname]);
  const { tenantSlug } = useCustomerTenant();
  const { signOut } = useCustomerSignOut();
  const { data: home } = useGetCustomerHomeQuery();
  const { data: shopAvailability } = useGetShopAvailabilityQuery();
  const storeAvailable = shopAvailability?.available === true;
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

  return (
    <div className="customer-theme min-h-screen text-[#171722]">
      <CustomerFcmRegistrar />
      <header className="sticky top-0 z-40 border-b border-[#e8dfd9] bg-[#fffefd]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-lg items-center gap-3 px-4 sm:h-[76px] sm:max-w-[1240px] sm:px-6 lg:px-8">
          <Link href={homeHref} aria-label="Customer home" className="min-w-0 flex-1 sm:flex-none">
            <CustomerBrand />
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
            <Link
              href={customerPath(tenantSlug, "notifications")}
              aria-label={`${unread} unread notifications`}
              className="relative grid size-10 place-items-center rounded-full text-[#171722] transition sm:size-11"
            >
              <Bell className="size-[1.35rem]" />
              {unread > 0 ? <span className="absolute right-1 top-1 size-2.5 rounded-full bg-[#ef394e] ring-2 ring-white" /> : null}
            </Link>
            <Link
              href={customerPath(tenantSlug, "profile")}
              aria-label="Profile"
              className="grid size-10 place-items-center overflow-hidden rounded-full text-sm font-black text-white shadow-sm sm:size-11"
              style={{ background: "var(--customer-primary, #730321)" }}
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
        className="customer-bottom-safe fixed inset-x-0 bottom-0 z-40 border-t border-[#e8dfd9] bg-[#fffefd]/97 px-1 pt-1.5 shadow-[0_-12px_36px_rgba(64,32,40,.08)] backdrop-blur-xl lg:hidden"
        aria-label="Primary navigation"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
          {mobileNav.map((item) =>
            item.fab ? (
              <Link
                key={item.label}
                href={item.href}
                aria-label={item.label}
                className="relative -top-3 mx-auto flex flex-col items-center gap-1"
              >
                <span
                  className="grid size-[3.35rem] place-items-center rounded-full text-white shadow-[0_10px_24px_rgba(var(--customer-primary-rgb,115,3,33),0.35)]"
                  style={{ background: "var(--customer-primary, #730321)" }}
                >
                  <item.icon className="size-6" strokeWidth={2.2} />
                </span>
                <span className="text-[0.65rem] font-semibold text-[#817b84]">{item.label}</span>
              </Link>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[0.65rem] font-semibold transition")}
                style={{ color: active(item) ? "var(--customer-primary, #730321)" : "#817b84" }}
              >
                <span
                  className="relative grid size-9 place-items-center rounded-full"
                  style={
                    active(item)
                      ? { background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.12)" }
                      : undefined
                  }
                >
                  <item.icon className="size-[1.25rem]" strokeWidth={active(item) ? 2.3 : 2} />
                  {item.segment === "notifications" && unread > 0 ? (
                    <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-[#ef394e] ring-2 ring-white" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "truncate",
                    active(item) && "underline decoration-2 underline-offset-[3px]",
                  )}
                >
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
    </div>
  );
}
