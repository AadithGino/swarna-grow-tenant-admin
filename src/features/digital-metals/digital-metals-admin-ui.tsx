"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Coins, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton } from "@/src/components/common/query-state";
import { InitialsAvatar } from "@/src/components/admin-ui/admin-table";
import { formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";

export const DM_SECTION = "Digital Gold & Silver";

/** Rupees from paise with 2 decimals (all DM amounts are paise on the wire). */
export const dmInr = (paise: number | string | null | undefined) =>
  paise == null || paise === "" ? "—" : formatInrFromPaise(Number(paise));

/** Rupees from paise, no decimals — for big headline numbers. */
export function dmInrShort(paise: number | null | undefined) {
  if (paise == null || !Number.isFinite(Number(paise))) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(paise) / 100,
  );
}

/** Weight from micrograms with kg for large silver totals. */
export function dmWeight(ugValue: number | string | null | undefined) {
  if (ugValue == null || ugValue === "") return "—";
  const grams = Number(ugValue) / 1_000_000;
  if (!Number.isFinite(grams)) return "—";
  if (grams >= 1000) return `${(grams / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;
  return ugToGramsDisplay(ugValue);
}

export function MetalPill({ metal, className }: { metal?: string | null; className?: string }) {
  const silver = String(metal ?? "").toUpperCase() === "SILVER";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        silver ? "bg-slate-100 text-slate-700 ring-1 ring-slate-200" : "bg-[#fbf1dc] text-[#7a4f0e] ring-1 ring-[#f0dcae]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          silver ? "bg-gradient-to-br from-white to-slate-400" : "bg-gradient-to-br from-[#fff2c4] to-[#b8862f]",
        )}
      />
      {silver ? "Silver" : "Gold"}
    </span>
  );
}

export function DmCustomerCell({
  customer,
  fallbackId,
}: {
  customer?: { id?: string; name?: string; mobile?: string; customerNumber?: string } | null;
  fallbackId?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <InitialsAvatar name={customer?.name ?? "?"} className="size-8 text-[0.7rem]" />
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#28161a]">{customer?.name ?? "Customer"}</p>
        <p className="truncate text-[0.78rem] text-[#857a7d]">
          {[customer?.customerNumber, customer?.mobile].filter(Boolean).join(" · ") || fallbackId || "—"}
        </p>
      </div>
    </div>
  );
}

/** Loading + "module not available" handling shared by every Digital Gold page. */
export function DmGate({
  loading,
  visible,
  message,
  title,
  children,
}: {
  loading: boolean;
  visible: boolean;
  message?: string | null;
  title: string;
  children: ReactNode;
}) {
  if (loading) return <PageSkeleton cards={4} />;
  if (!visible) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={DM_SECTION} title={title} />
        <div className="rounded-[1.15rem] border border-[#e8dcd7] bg-white">
          <EmptyState
            icon={Lock}
            title="Digital Gold & Silver isn't switched on"
            detail={
              message ??
              "Enable it under Settings → Operations once your plan includes the module, then publish rates and customer terms."
            }
            action={
              <Link
                href="/settings/operations"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#730321] px-4 text-sm font-semibold text-white hover:bg-[#5e0a20]"
              >
                <Coins className="size-4" /> Open settings
              </Link>
            }
          />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/** Relative "2h ago" style labels for queues. */
export function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const future = diff < 0;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60_000);
  let label: string;
  if (m < 1) label = "just now";
  else if (m < 60) label = `${m}m`;
  else if (m < 60 * 24) label = `${Math.round(m / 60)}h`;
  else label = `${Math.round(m / 1440)}d`;
  if (label === "just now") return label;
  return future ? `in ${label}` : `${label} ago`;
}

export function shortDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
