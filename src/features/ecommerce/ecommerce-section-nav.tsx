"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/ecommerce", label: "Products" },
  { href: "/ecommerce/categories", label: "Categories" },
  { href: "/ecommerce/inventory", label: "Inventory" },
  { href: "/ecommerce/gold-rates", label: "Gold rates" },
  { href: "/ecommerce/tax", label: "Tax" },
  { href: "/ecommerce/fulfilment", label: "Fulfilment" },
  { href: "/ecommerce/orders", label: "Orders" },
  { href: "/ecommerce/payment-exceptions", label: "Exceptions" },
] as const;

export function EcommerceSectionNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Online store sections" className="mb-6 -mx-1 overflow-x-auto px-1 pb-2">
      <p className="mb-2 px-1 text-xs text-muted-foreground">
        Setup order: <span className="font-medium text-[#5c4a50]">Tax</span>
        {" → "}
        <span className="font-medium text-[#5c4a50]">Gold rates</span>
        {" → "}
        <span className="font-medium text-[#5c4a50]">Categories</span>
        {" → "}
        <span className="font-medium text-[#5c4a50]">Products</span>
        {" → "}
        <span className="font-medium text-[#5c4a50]">Inventory</span>
        {" → "}
        <span className="font-medium text-[#5c4a50]">Publish</span>
        {" → "}
        enable store in Settings.
      </p>
      <div className="flex w-max min-w-full gap-1 rounded-2xl border border-[#ece1da] bg-white p-1.5 shadow-sm">
        {sections.map((section) => {
          const active = section.href === "/ecommerce"
            ? pathname === section.href
            : pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition sm:text-sm",
                active ? "bg-[#730321] text-white shadow-sm" : "text-[#74666a] hover:bg-[#f9f2ee] hover:text-[#730321]",
              )}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
