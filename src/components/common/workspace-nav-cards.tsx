"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/src/components/common/status-badge";

export type WorkspaceNavStep = {
  href: string;
  label: string;
  hint?: string;
};

export function isWorkspaceNavActive(pathname: string, href: string) {
  if (href === "/" || href === "/ecommerce") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceNavCards({
  steps,
  activeHref,
  columnsClass = "sm:grid-cols-2 lg:grid-cols-3",
  className,
}: {
  steps: readonly WorkspaceNavStep[];
  activeHref?: string;
  columnsClass?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;

  return (
    <nav
      aria-label="Section navigation"
      className={cn("mb-6 grid gap-2", columnsClass, className)}
    >
      {steps.map((step) => {
        const active = isWorkspaceNavActive(current, step.href);
        return (
          <Link
            key={step.href}
            href={step.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[4.25rem] flex-col justify-center rounded-xl border px-3 py-2.5 transition-colors",
              active
                ? "border-[#730321]/35 bg-[#fff9f5] shadow-[0_2px_5px_rgb(67_15_25/4%)]"
                : "border-[#e4d7d2] bg-white hover:border-[#dcc9c0]",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-[#28161a]">
              {step.label}
              {active ? <StatusBadge status="IN_PROGRESS" label="Here" /> : null}
            </span>
            {step.hint ? (
              <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                {step.hint}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
