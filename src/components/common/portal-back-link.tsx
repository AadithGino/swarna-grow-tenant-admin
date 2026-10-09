"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigateBack } from "@/src/lib/navigate-back";

type PortalBackLinkProps = {
  fallbackHref: string;
  children: ReactNode;
  className?: string;
  /** Agent portal styling */
  variant?: "admin" | "agent";
};

export function PortalBackLink({
  fallbackHref,
  children,
  className,
  variant = "admin",
}: PortalBackLinkProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => navigateBack(router, fallbackHref)}
      className={cn(
        variant === "agent"
          ? "inline-flex items-center gap-2 text-sm font-bold text-[#776d70] hover:text-[#730321]"
          : "inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-[#730321]",
        className,
      )}
    >
      {children}
    </button>
  );
}
