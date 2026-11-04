"use client";

import Link from "next/link";
import { Coins, Scale, Store } from "lucide-react";
import { Surface } from "@/src/components/common/page-parts";
import { useEcommerceWorkspaceNavVisible } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { useDigitalMetalsWorkspaceNavVisible } from "@/src/features/digital-metals/digital-metals-admin-shared";

const LINKS = [
  {
    href: "/gold-rates",
    label: "Scheme gold rates",
    detail: "Gold-weight instalments and maturity valuation",
    icon: Scale,
    always: true,
  },
  {
    href: "/ecommerce/gold-rates",
    label: "Online store rates",
    detail: "Product pricing and checkout quotes",
    icon: Store,
    module: "ecommerce" as const,
  },
  {
    href: "/digital-metals/rates",
    label: "Digital gold & silver",
    detail: "Customer buy/sell rates per metal",
    icon: Coins,
    module: "digitalMetals" as const,
  },
];

export function RatesWorkspaceHub() {
  const store = useEcommerceWorkspaceNavVisible();
  const dm = useDigitalMetalsWorkspaceNavVisible();
  const items = LINKS.filter((row) => {
    if (row.always) return true;
    if (row.module === "ecommerce") return store;
    if (row.module === "digitalMetals") return dm;
    return false;
  });
  return (
    <Surface
      title="Rates workspace"
      description="One place to jump to every rate domain. Each area has its own publish flow and history."
      data-testid="rates-workspace-hub"
    >
      <ul className="divide-y">
        {items.map((row) => {
          const Icon = row.icon;
          return (
            <li key={row.href} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 text-[#8e1a36]" aria-hidden />
                <div>
                  <p className="font-semibold text-[#28161a]">{row.label}</p>
                  <p className="text-sm text-muted-foreground">{row.detail}</p>
                </div>
              </div>
              <Link href={row.href} className="shrink-0 text-sm font-semibold text-[#730321] underline-offset-2 hover:underline">
                Open
              </Link>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
