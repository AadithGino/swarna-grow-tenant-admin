"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, ChevronRight, Lock } from "lucide-react";
import { customerPath } from "@/src/lib/customer-tenant";
import { navigateBack } from "@/src/lib/navigate-back";
import { cn } from "@/lib/utils";
import { useGetCustomerHomeQuery } from "@/src/store/api/customer-api";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ProfileSubpageHeader({
  tenantSlug,
  title,
  backHref,
  centered,
  showNotificationBell,
  preferHistoryBack,
}: {
  tenantSlug: string | null;
  title: string;
  backHref?: string;
  centered?: boolean;
  showNotificationBell?: boolean;
  /** When true (default), use browser back with fallback instead of a fixed href. */
  preferHistoryBack?: boolean;
}) {
  const router = useRouter();
  const { data: home } = useGetCustomerHomeQuery(undefined, { skip: !showNotificationBell });
  const unread = home?.unreadNotificationCount ?? 0;
  const fallbackHref = backHref ?? customerPath(tenantSlug, "profile");
  const useHistory = preferHistoryBack !== false && !backHref;
  const backLink = useHistory ? (
    <button
      type="button"
      onClick={() => navigateBack(router, fallbackHref)}
      className="grid size-10 place-items-center rounded-full text-[var(--customer-primary,#730321)] transition hover:bg-[#f6f2ee]"
      aria-label="Back"
    >
      <ArrowLeft className="size-5" strokeWidth={2.5} />
    </button>
  ) : (
    <Link
      href={fallbackHref}
      className="grid size-10 place-items-center rounded-full text-[var(--customer-primary,#730321)] transition hover:bg-[#f6f2ee]"
      aria-label="Back"
    >
      <ArrowLeft className="size-5" strokeWidth={2.5} />
    </Link>
  );

  if (centered) {
    return (
      <header className="relative flex min-h-10 items-center justify-center px-10">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">{backLink}</div>
        <h1 className="text-[1.0625rem] font-black text-[var(--customer-primary,#730321)]">{title}</h1>
        {showNotificationBell ? (
          <Link
            href={customerPath(tenantSlug, "notifications")}
            aria-label="Notifications"
            className="absolute right-0 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-[#171722] transition hover:bg-[#f6f2ee]/80"
          >
            <Bell className="size-[1.35rem]" strokeWidth={2} />
            {unread > 0 ? (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#ef394e] ring-2 ring-[#fdf8f4]" />
            ) : null}
          </Link>
        ) : (
          <span className="absolute right-0 size-10" aria-hidden />
        )}
      </header>
    );
  }

  return (
    <header className="mb-5 flex items-center gap-2">
      {backLink}
      <h1 className="text-lg font-black text-[var(--customer-primary,#730321)]">{title}</h1>
    </header>
  );
}

/** Shared filled field styling for profile sub-forms (nominee, etc.). */
export const profileFormFieldClass =
  "h-12 rounded-2xl border border-[#e5ddd7] bg-white px-4 text-sm font-semibold text-[#171722] shadow-[0_1px_0_rgba(23,23,34,0.04)] focus-visible:border-[rgba(var(--customer-primary-rgb,115,3,33),0.35)] focus-visible:ring-[3px] focus-visible:ring-[rgba(var(--customer-primary-rgb,115,3,33),0.12)]";

export const profileFormLabelClass = "text-[11px] font-semibold text-[#8a8490]";

export function ProfileAccountRow({
  icon: Icon,
  label,
  value,
  locked,
  trailing,
  onClick,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  locked?: boolean;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#faf3eb] text-[#730321]">
        <Icon className="size-[1.15rem]" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-[#8a8490]">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-[#171722]">{value}</p>
        {locked ? (
          <p className="mt-1 flex items-center gap-1 text-[10px] text-[#8a8490]">
            <Lock className="size-3" strokeWidth={2} />
            Cannot be changed
          </p>
        ) : null}
      </div>
      {trailing ?? (href || onClick ? <ChevronRight className="size-4 shrink-0 text-[#b0a9b3]" /> : null)}
    </>
  );

  const className =
    "flex w-full items-center gap-3 border-b border-[#ece6e1] px-4 py-3.5 text-left last:border-b-0";

  if (href) {
    return (
      <Link href={href} className={cn(className, "transition hover:bg-[#fcf8f5]")}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className, "transition hover:bg-[#fcf8f5]")}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

export function ProfileMenuRow({
  icon: Icon,
  label,
  href,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-[#ece6e1] px-4 py-4 transition last:border-b-0 hover:bg-[#fcf8f5]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f6edf0] text-[var(--customer-primary,#730321)]">
        <Icon className="size-[1.15rem]" strokeWidth={2} />
      </span>
      <span className="flex-1 text-sm font-bold text-[#171722]">{label}</span>
      {badge}
      <ChevronRight className="size-4 shrink-0 text-[#b0a9b3]" />
    </Link>
  );
}

export function ProfileMenuAction({
  icon: Icon,
  label,
  hint,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "leave";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-[#fcf8f5] disabled:opacity-60"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f6edf0] text-[var(--customer-primary,#730321)]"
        style={
          tone === "leave"
            ? { background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.1)" }
            : undefined
        }
      >
        <Icon className="size-[1.15rem]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-bold",
            tone === "leave" ? "text-[var(--customer-primary,#730321)]" : "text-[#171722]",
          )}
        >
          {label}
        </span>
        {hint ? <span className="mt-0.5 block text-xs text-[#777280]">{hint}</span> : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-[#b0a9b3]" />
    </button>
  );
}

export function kycMenuBadge(status?: string, statusLabel?: string) {
  if (status === "VERIFIED") {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
        Verified
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
        Rejected
      </span>
    );
  }
  return (
    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
      {status === "SUBMITTED" || status === "PENDING" ? (statusLabel ?? "Pending") : "Pending"}
    </span>
  );
}

export function maskCustomerMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length >= 10) {
    const local = digits.slice(-10);
    return `+91 ${local.slice(0, 2)}•••• ••${local.slice(-3)}`;
  }
  return mobile;
}

export function formatProfileCustomerId(passbookNumber?: string, customerNumber?: string) {
  const number = passbookNumber?.trim() || customerNumber?.trim();
  return number ? `No. ${number}` : "—";
}

export function formatPassbookLabel(passbookNumber?: string, customerNumber?: string) {
  const raw = passbookNumber?.trim() || customerNumber?.trim();
  if (!raw) return "—";
  if (passbookNumber?.trim()) {
    const digits = passbookNumber.replace(/\D/g, "");
    if (digits.length >= 4) return `PB-${digits.slice(-5)}`;
    return passbookNumber;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 4) return `PB-${digits.slice(-5)}`;
  return raw;
}
