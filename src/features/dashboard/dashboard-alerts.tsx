"use client";

import Link from "next/link";
import { AlertTriangle, Bell, ChevronRight, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { portalPathFromContract } from "@/src/lib/contract-paths";
import { cn } from "@/lib/utils";
import type { DashboardGoldRate, PortalAlert } from "@/src/types/domain";

const severityStyles: Record<
  PortalAlert["severity"],
  { ring: string; icon: string; badge: string }
> = {
  HIGH: {
    ring: "border-red-300 bg-red-50",
    icon: "text-red-700",
    badge: "bg-red-600 text-white",
  },
  MEDIUM: {
    ring: "border-amber-300 bg-[#fff8e8]",
    icon: "text-[#805817]",
    badge: "bg-[#9a6f2a] text-white",
  },
  LOW: {
    ring: "border-[#e4d7d2] bg-[#fbf7f4]",
    icon: "text-[#776a6d]",
    badge: "bg-[#776a6d] text-white",
  },
  INFO: {
    ring: "border-sky-200 bg-sky-50",
    icon: "text-sky-800",
    badge: "bg-sky-700 text-white",
  },
};

function AlertIcon({ severity }: { severity: PortalAlert["severity"] }) {
  const Icon = severity === "HIGH" ? ShieldAlert : AlertTriangle;
  return <Icon className={cn("size-4", severityStyles[severity].icon)} />;
}

export function DashboardBlockingAlerts({
  goldRate,
}: {
  goldRate?: DashboardGoldRate | null;
}) {
  if (!goldRate || goldRate.isSetForToday) return null;

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-700" />
        <div>
          <p className="font-bold text-red-900">
            Today&apos;s gold rate is not set
          </p>
          <p className="mt-1 text-sm text-red-800">
            {goldRate.warning ??
              "Gold-weight scheme payments are blocked until you set it."}
          </p>
        </div>
      </div>
      <Button asChild className="shrink-0 bg-red-700 hover:bg-red-800">
        <Link href="/gold-rates">Set rate</Link>
      </Button>
    </div>
  );
}

export function DashboardAlertList({
  alerts,
  onDismiss,
  compact,
  fullPage,
}: {
  alerts: PortalAlert[];
  onDismiss?: (id: string) => void;
  compact?: boolean;
  fullPage?: boolean;
}) {
  if (!alerts.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No active alerts — you&apos;re caught up.
      </p>
    );
  }
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        compact ? "p-2" : "p-4",
        !fullPage &&
          !compact &&
          "max-h-[min(420px,55vh)] overflow-y-auto xl:grid-cols-2",
        fullPage && "lg:grid-cols-2",
      )}
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4 transition hover:border-[#b98c96]",
            severityStyles[alert.severity].ring,
          )}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white">
            <AlertIcon severity={alert.severity} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm">{alert.title}</strong>
              {alert.count != null && alert.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    severityStyles[alert.severity].badge,
                  )}
                >
                  {alert.count}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {alert.message}
            </p>
            <Button
              asChild
              variant="link"
              size="sm"
              className="mt-1 h-auto px-0 text-[#730321]"
            >
              <Link href={portalPathFromContract(alert.actionPath)}>
                {alert.actionLabel ?? "Open"}
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
          {alert.dismissible && onDismiss && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={() => onDismiss(alert.id)}
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export function AlertCentreMenu({ alerts }: { alerts: PortalAlert[] }) {
  const openCount = alerts.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 shrink-0 overflow-visible"
        >
          <Bell className="size-5" aria-hidden />
          {openCount > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute -right-0.5 -top-0.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
            >
              {openCount > 9 ? "9+" : openCount}
            </span>
          )}
          <span className="sr-only">
            Alert centre{openCount > 0 ? `, ${openCount} active` : ""}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <DropdownMenuLabel className="border-b px-4 py-3">
          Alert centre
          {openCount > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {openCount} active
            </span>
          )}
        </DropdownMenuLabel>
        <div className="max-h-[min(420px,60vh)] overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No alerts right now.
            </p>
          ) : (
            alerts.slice(0, 8).map((alert) => (
              <DropdownMenuItem key={alert.id} asChild className="p-0">
                <Link
                  href={portalPathFromContract(alert.actionPath)}
                  className="flex cursor-pointer flex-col items-start gap-1 border-b px-4 py-3 last:border-0"
                >
                  <span className="font-semibold text-sm">{alert.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {alert.message}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="justify-center py-3 font-semibold text-[#730321]">
          <Link href="/alerts">View all alerts</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
