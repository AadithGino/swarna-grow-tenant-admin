"use client";

import Link from "next/link";
import { Building2, Loader2, UserRound, UsersRound } from "lucide-react";
import { Surface } from "@/src/components/common/page-parts";
import { cn } from "@/lib/utils";
import { useGetSubscriptionQuery } from "@/src/store/api/admin-api";

type UsageMeter = {
  used: number;
  limit: number;
  percent: number;
  status: string;
};

function barTone(status: string) {
  if (status === "EXCEEDED") return "bg-red-600";
  if (status === "AT_LIMIT") return "bg-[#730321]";
  if (status === "NEAR_LIMIT") return "bg-[#C9A227]";
  return "bg-[#730321]";
}

function formatRenewLabel(iso?: string | null) {
  if (!iso) return "Renewal date not set";
  try {
    const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
    return `Renews on ${new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d)}`;
  } catch {
    return `Renews on ${iso}`;
  }
}

function UsageRow({
  icon: Icon,
  label,
  meter,
}: {
  icon: typeof UsersRound;
  label: string;
  meter: UsageMeter;
}) {
  const pct = Math.min(100, Math.max(0, meter.percent ?? 0));
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#faf0f3] text-[#730321]">
          <Icon className="size-4" strokeWidth={2.25} />
        </div>
        <p className="min-w-0 flex-1 text-sm font-semibold text-[#3d2a2e]">
          {label}
        </p>
        <p className="text-sm font-semibold tabular-nums text-[#1a1014]">
          {meter.used.toLocaleString("en-IN")}
          <span className="font-medium text-muted-foreground">
            {" "}
            / {meter.limit.toLocaleString("en-IN")}
          </span>
        </p>
        <p className="w-10 text-right text-sm font-bold tabular-nums text-[#730321]">
          {Math.round(pct)}%
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#f3eef0]">
        <div
          className={cn("h-full rounded-full transition-[width]", barTone(meter.status))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PlanUsageCard({ className }: { className?: string }) {
  const { data, isLoading, isError } = useGetSubscriptionQuery();

  const usage = (data?.usage ?? {}) as Record<string, UsageMeter | undefined>;
  const rows = [
    { key: "customers", label: "Customers", icon: UsersRound, meter: usage.activeCustomers },
    { key: "staff", label: "Staff", icon: UserRound, meter: usage.staffSeats },
    { key: "branches", label: "Branches", icon: Building2, meter: usage.branches },
  ].filter(
    (row): row is typeof row & { meter: UsageMeter } =>
      Boolean(row.meter && row.meter.limit > 0),
  );

  return (
    <Surface
      title="Plan usage"
      description={
        data?.currentPlan?.name
          ? `${data.currentPlan.name} plan limits`
          : "Subscription limits"
      }
      className={cn("flex h-full min-h-[380px] flex-col", className)}
    >
      <div className="flex flex-1 flex-col justify-between p-6">
        {isLoading ? (
          <div className="grid flex-1 place-items-center text-muted-foreground">
            <Loader2 className="size-8 animate-spin opacity-40" />
          </div>
        ) : isError || !rows.length ? (
          <p className="text-sm text-muted-foreground">
            {isError
              ? "Could not load plan usage."
              : "No usage limits on your current plan."}
          </p>
        ) : (
          <div className="space-y-6">
            {rows.map((row) => (
              <UsageRow
                key={row.key}
                icon={row.icon}
                label={row.label}
                meter={row.meter}
              />
            ))}
          </div>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#eaded9] pt-4">
          <p className="text-sm text-muted-foreground">
            {formatRenewLabel(
              (data?.currentPeriodEnd as string | undefined) ?? null,
            )}
          </p>
          <Link
            href="/settings/subscription"
            className="text-sm font-semibold text-[#730321] hover:underline"
          >
            View plan
          </Link>
        </div>
      </div>
    </Surface>
  );
}
