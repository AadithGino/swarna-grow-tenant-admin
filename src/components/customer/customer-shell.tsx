"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, CircleHelp, CreditCard, Gem, Home, Landmark, LogOut, Menu,
  ShieldCheck, Sparkles, UserRound, WalletCards, X,
} from "lucide-react";
import { useState } from "react";
import { customerSignedOut } from "@/src/store/slices/customer-session-slice";
import { useAppDispatch } from "@/src/store/hooks";
import { useGetCustomerHomeQuery } from "@/src/store/api/customer-api";
import { cn } from "@/lib/utils";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerGoldMetricsVisible } from "@/src/lib/customer-gold-ui";
import { CustomerRegistrationGuard } from "@/src/components/customer/customer-registration-guard";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";

const navigationSections = [
  { segment: "", label: "Home", icon: Home, exact: true },
  { segment: "schemes", label: "My schemes", icon: WalletCards },
  { segment: "plans", label: "Explore plans", icon: Sparkles, requiresSelfEnrol: true },
  { segment: "payments", label: "Payments", icon: CreditCard },
  { segment: "support", label: "Support", icon: CircleHelp },
  { segment: "profile", label: "Profile", icon: UserRound },
];

function CustomerLogo({ compact = false, homeHref }: { compact?: boolean; homeHref: string }) {
  return (
    <Link href={homeHref} className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-2xl bg-[#fff8e8] text-[#730321] shadow-sm ring-1 ring-white/30">
        <Gem className="size-5" />
      </span>
      {!compact && <span><b className="block tracking-[.12em] text-white">SWARNA GROW</b><small className="text-[10px] font-bold tracking-[.2em] text-[#efc85f]">GOLD SAVINGS</small></span>}
    </Link>
  );
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tenantSlug } = useCustomerTenant();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: home } = useGetCustomerHomeQuery();
  const { visible: showGoldMetrics } = useCustomerGoldMetricsVisible();
  const { customerSelfEnrol } = useCustomerPortalCapabilities();
  const unread = home?.unreadNotificationCount ?? 0;
  const goldRatePill =
    showGoldMetrics && home?.goldRate
      ? `${home.goldRate.purity ?? "22K"} · ${home.goldRate.ratePerGramDisplay}`
      : null;
  const navigation = navigationSections
    .filter((item) => !item.requiresSelfEnrol || customerSelfEnrol)
    .map((item) => ({
      ...item,
      href: item.segment ? customerPath(tenantSlug, item.segment) : customerPath(tenantSlug),
    }));
  const homeHref = customerPath(tenantSlug);
  const active = (item: (typeof navigation)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const logout = () => {
    dispatch(customerSignedOut());
    router.push(customerPath(tenantSlug, "login"));
  };

  return (
    <div className="customer-theme min-h-screen bg-[#fbf8f4] text-[#28161a]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col bg-[#4b0a18] px-4 py-5 text-white lg:flex">
        <CustomerLogo homeHref={homeHref} />
        <div className="mt-9 rounded-2xl border border-white/10 bg-white/[.07] p-4">
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#e7bd55]">Welcome back</p>
          <p className="mt-1 text-lg font-bold">{home?.customer.name ?? "Welcome"}</p>
          {home?.customer.passbookNumber ? (
            <p className="text-xs text-white/60">{home.customer.passbookNumber}</p>
          ) : null}
        </div>
        <nav className="mt-6 space-y-1.5" aria-label="Customer navigation">
          {navigation.map((item) => <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition", active(item) ? "bg-[#f8e9c7] text-[#4b0a18] shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white")}><item.icon className="size-5" />{item.label}</Link>)}
        </nav>
        <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
          <Link href={customerPath(tenantSlug, "security")} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-white/70 hover:bg-white/10"><ShieldCheck className="size-5" />Security & devices</Link>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-white/70 hover:bg-white/10"><LogOut className="size-5" />Sign out</button>
        </div>
      </aside>

      {menuOpen && <button aria-label="Close menu" className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#4b0a18] p-5 text-white transition-transform lg:hidden", menuOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between"><CustomerLogo homeHref={homeHref} /><button aria-label="Close" onClick={() => setMenuOpen(false)}><X /></button></div>
        <nav className="mt-8 space-y-2">{navigation.map((item) => <Link onClick={() => setMenuOpen(false)} key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-4 py-3 font-semibold", active(item) ? "bg-[#f8e9c7] text-[#4b0a18]" : "text-white/75")}><item.icon className="size-5" />{item.label}</Link>)}</nav>
        <button onClick={logout} className="mt-auto flex items-center gap-3 border-t border-white/10 px-4 pt-5 text-white/70"><LogOut className="size-5" />Sign out</button>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-[#eaded9] bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <button aria-label="Open menu" className="grid size-10 place-items-center rounded-xl border lg:hidden" onClick={() => setMenuOpen(true)}><Menu className="size-5" /></button>
            <div className="hidden items-center gap-2 text-sm text-[#76666a] lg:flex">
              <Landmark className="size-4 text-[#9a6f2a]" />
              <span>{home?.tenant.city ?? "Your branch"}</span>
              {goldRatePill ? (
                <>
                  <span className="text-[#c8b9b4]">•</span>
                  <span>{goldRatePill}</span>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {goldRatePill ? (
                <Link
                  href={customerPath(tenantSlug, "gold-rate")}
                  className="hidden rounded-full bg-[#fff6df] px-3 py-1.5 text-xs font-bold text-[#805d18] sm:block"
                >
                  {goldRatePill}
                </Link>
              ) : null}
              <Link href={customerPath(tenantSlug, "notifications")} aria-label={`${unread} unread notifications`} className="relative grid size-10 place-items-center rounded-xl border bg-white"><Bell className="size-5" />{unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />}</Link>
              <Link href={customerPath(tenantSlug, "profile")} className="grid size-10 place-items-center rounded-full bg-[#730321] text-xs font-bold text-white">AN</Link>
            </div>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-64px)] max-w-[1320px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10">
          <CustomerRegistrationGuard>{children}</CustomerRegistrationGuard>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eaded9] bg-white/95 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(76,21,33,.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {navigation.slice(0, 4).map((item) => <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold", active(item) ? "text-[#730321]" : "text-[#8b7d80]")}><span className={cn("grid size-8 place-items-center rounded-xl", active(item) && "bg-[#f8e9c7]")}><item.icon className="size-[18px]" /></span>{item.label.replace("My ", "")}</Link>)}
          <Link href={customerPath(tenantSlug, "profile")} className={cn("flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold", pathname.startsWith(customerPath(tenantSlug, "profile")) ? "text-[#730321]" : "text-[#8b7d80]")}><span className={cn("grid size-8 place-items-center rounded-xl", pathname.startsWith(customerPath(tenantSlug, "profile")) && "bg-[#f8e9c7]")}><UserRound className="size-[18px]" /></span>Profile</Link>
        </div>
      </nav>
    </div>
  );
}
