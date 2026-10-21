"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Building2,
  Coins,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { href: "/digital-metals", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/digital-metals/settings", label: "Rates & settings", icon: Settings },
  { href: "/digital-metals/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/digital-metals/sells", label: "Sell approvals", icon: Coins },
  { href: "/digital-metals/bank-verification", label: "Bank verification", icon: Building2 },
  { href: "/digital-metals/payouts", label: "Payouts", icon: Banknote },
  { href: "/digital-metals/redemption/catalogue", label: "Catalogue", icon: Package },
  { href: "/digital-metals/redemption/fulfilment", label: "Fulfilment", icon: Truck },
  { href: "/digital-metals/procurement", label: "Procurement", icon: FileText },
  { href: "/digital-metals/hedge", label: "Hedge", icon: TrendingUp },
  { href: "/digital-metals/payment-exceptions", label: "Exceptions", icon: AlertTriangle },
] as const;

export function DigitalMetalsAdminNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex flex-col gap-0.5 border-r border-[#eaded9] bg-[#faf7f5] p-3 md:min-w-[220px]"
      aria-label="Digital metals workspace"
    >
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#8a6a70]">
        Digital Gold & Silver
      </p>
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--customer-primary,#730321)] text-white"
                : "text-[#5c3d42] hover:bg-white hover:text-[#28161a]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DigitalMetalsAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      <DigitalMetalsAdminNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
