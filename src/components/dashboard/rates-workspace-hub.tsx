"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Coins, Scale, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Surface } from "@/src/components/common/page-parts";
import { useEcommerceWorkspaceNavVisible } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { useDigitalMetalsWorkspaceNavVisible } from "@/src/features/digital-metals/digital-metals-admin-shared";

type RateDomainLink = {
  href: string;
  label: string;
  detail: string;
  tag: string;
  icon: LucideIcon;
};

const RATE_DOMAINS: RateDomainLink[] = [
  {
    href: "/gold-rates",
    label: "Scheme gold rates",
    detail: "Gold-weight instalments and maturity valuation",
    tag: "Schemes",
    icon: Scale,
  },
  {
    href: "/ecommerce/gold-rates",
    label: "Online store rates",
    detail: "Catalog pricing and checkout quotes by purity",
    tag: "Ecommerce",
    icon: Store,
  },
  {
    href: "/digital-metals/rates",
    label: "Digital gold & silver",
    detail: "Customer buy and sell rates per metal",
    tag: "Digital metals",
    icon: Coins,
  },
];

export function buildRatesWorkspaceLinks(input: {
  showEcommerce: boolean;
  showDigitalMetals: boolean;
}): RateDomainLink[] {
  const items = [RATE_DOMAINS[0]];
  if (input.showEcommerce) items.push(RATE_DOMAINS[1]);
  if (input.showDigitalMetals) items.push(RATE_DOMAINS[2]);
  return items;
}

function isRateDomainActive(pathname: string, href: string) {
  if (href === "/gold-rates") return pathname === "/gold-rates";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function RatesWorkspaceHub({ className }: { className?: string }) {
  const pathname = usePathname();
  const ecommerce = useEcommerceWorkspaceNavVisible();
  const digital = useDigitalMetalsWorkspaceNavVisible();

  const items = buildRatesWorkspaceLinks({
    showEcommerce: ecommerce.showEcommerceNav,
    showDigitalMetals: digital.showDigitalMetalsNav,
  });

  if (items.length <= 1) return null;

  return (
    <Surface
      title="Rate domains"
      description="Each product area has its own publish flow, notifications, and history. Open the one you need."
      className={className}
      data-testid="rates-workspace-hub"
    >
      <nav
        aria-label="Rate domains"
        className="grid gap-3 p-4 sm:p-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        {items.map((row) => {
          const Icon = row.icon;
          const active = isRateDomainActive(pathname, row.href);
          const body = (
            <>
              <span className="flex items-start justify-between gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f8eef0] text-[#7b0a2b]">
                  <Icon className="size-[1.15rem]" aria-hidden />
                </span>
                {!active ? (
                  <ArrowRight
                    className="mt-1 size-4 shrink-0 text-[#b8a8ad] transition-transform group-hover:translate-x-0.5 group-hover:text-[#730321]"
                    aria-hidden
                  />
                ) : (
                  <span className="mt-1 rounded-full bg-[#730321]/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[#730321]">
                    Here
                  </span>
                )}
              </span>
              <span className="mt-3 block text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-[#9a6f2a]">
                {row.tag}
              </span>
              <span className="mt-1 block text-sm font-bold leading-snug text-[#28161a]">
                {row.label}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {row.detail}
              </span>
            </>
          );

          if (active) {
            return (
              <div
                key={row.href}
                aria-current="page"
                className="rounded-xl border border-[#730321]/25 bg-[#fff9f5] p-4 shadow-[0_2px_8px_-4px_rgb(67_15_25/12%)]"
              >
                {body}
              </div>
            );
          }

          return (
            <Link
              key={row.href}
              href={row.href}
              className={cn(
                "group rounded-xl border border-[#e4d7d2] bg-white p-4 transition-colors",
                "hover:border-[#dcc9c0] hover:bg-[#fffcfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#730321]/30",
              )}
            >
              {body}
            </Link>
          );
        })}
      </nav>
    </Surface>
  );
}
