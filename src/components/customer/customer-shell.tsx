"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CircleHelp, CreditCard, Home, LogOut, Sparkles, UserRound, WalletCards } from "lucide-react";
import { customerSignedOut } from "@/src/store/slices/customer-session-slice";
import { useAppDispatch } from "@/src/store/hooks";
import { useGetCustomerHomeQuery } from "@/src/store/api/customer-api";
import { cn } from "@/lib/utils";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { CustomerRegistrationGuard } from "@/src/components/customer/customer-registration-guard";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { CustomerBrand } from "@/src/components/customer/customer-ui";

const coreNavigation = [
  { segment: "", label: "Home", icon: Home, exact: true },
  { segment: "schemes", label: "Schemes", icon: WalletCards, exact: false },
  { segment: "payments", label: "Payments", icon: CreditCard, exact: false },
  { segment: "support", label: "Support", icon: CircleHelp, exact: false },
  { segment: "profile", label: "Profile", icon: UserRound, exact: false },
] as const;

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tenantSlug } = useCustomerTenant();
  const { data: home } = useGetCustomerHomeQuery();
  const { customerSelfEnrol } = useCustomerPortalCapabilities();
  const unread = home?.unreadNotificationCount ?? 0;
  const homeHref = customerPath(tenantSlug);
  const navigation = coreNavigation.map((item) => ({ ...item, href: item.segment ? customerPath(tenantSlug, item.segment) : homeHref }));
  const active = (item: (typeof navigation)[number]) => item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const initials = (home?.customer.name ?? "AN").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const logout = () => {
    dispatch(customerSignedOut());
    router.push(customerPath(tenantSlug, "login"));
  };

  return (
    <div className="customer-theme min-h-screen text-[#171722]">
      <header className="sticky top-0 z-40 border-b border-[#e8dfd9] bg-[#fffefd]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center px-4 sm:px-6 lg:px-8">
          <Link href={homeHref} aria-label="Customer home" className="min-w-0"><CustomerBrand /></Link>
          <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Customer navigation">
            {navigation.slice(0, 4).map((item) => (
              <Link key={item.href} href={item.href} className={cn("rounded-xl px-4 py-2.5 text-sm font-bold transition", active(item) ? "bg-[#f7edf0] text-[#730321]" : "text-[#6f6b78] hover:bg-[#f6f2ee] hover:text-[#171722]")}>
                {item.label}
              </Link>
            ))}
            {customerSelfEnrol ? <Link href={customerPath(tenantSlug, "plans")} className="ml-1 inline-flex items-center gap-2 rounded-xl border border-[#eadfda] px-4 py-2.5 text-sm font-bold text-[#730321] hover:bg-[#fff7e5]"><Sparkles className="size-4 text-[#a47316]" />Explore plans</Link> : null}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-4">
            <Link href={customerPath(tenantSlug, "notifications")} aria-label={`${unread} unread notifications`} className="relative grid size-11 place-items-center rounded-full border border-[#e5ddd7] bg-white text-[#171722] transition hover:border-[#cdbdb5]">
              <Bell className="size-[1.35rem]" />
              {unread > 0 ? <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-[#ef394e] ring-2 ring-white" /> : null}
            </Link>
            <Link href={customerPath(tenantSlug, "profile")} aria-label="Profile" className="grid size-11 place-items-center rounded-full bg-[#730321] text-sm font-black text-white shadow-sm">{initials}</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-76px)] max-w-[1240px] px-4 pb-28 pt-7 sm:px-6 sm:pt-9 lg:px-8 lg:pb-12">
        <CustomerRegistrationGuard>{children}</CustomerRegistrationGuard>
      </main>

      <nav className="customer-bottom-safe fixed inset-x-0 bottom-0 z-40 border-t border-[#e8dfd9] bg-[#fffefd]/97 px-2 pt-2 shadow-[0_-12px_36px_rgba(64,32,40,.08)] backdrop-blur-xl lg:hidden" aria-label="Primary navigation">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[0.68rem] font-semibold transition", active(item) ? "text-[#730321]" : "text-[#817b84]")}>
              <span className={cn("grid size-9 place-items-center rounded-full", active(item) && "bg-[#fff0c8]")}><item.icon className="size-[1.35rem]" strokeWidth={active(item) ? 2.3 : 2} /></span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <button type="button" onClick={logout} className="fixed bottom-5 right-5 z-20 hidden items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-bold text-[#706b77] shadow-sm xl:flex" aria-label="Sign out"><LogOut className="size-4" />Sign out</button>
    </div>
  );
}
