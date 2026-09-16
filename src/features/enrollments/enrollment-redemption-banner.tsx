"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CircleCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import type { Enrollment } from "@/src/types/domain";
import { cn } from "@/lib/utils";

function closureLabel(closureType?: string) {
  if (closureType === "PREMATURE_CLOSURE") return "Premature closure";
  if (closureType === "MATURITY_REDEMPTION") return "Maturity redemption";
  return "Redemption";
}

function modeLabel(mode?: string) {
  const map: Record<string, string> = {
    CASH: "Cash payout",
    GOLD_HANDOVER: "Gold handover",
    PURCHASE_ADJUSTMENT: "Purchase adjustment",
    TRANSFER_TO_SCHEME: "New scheme",
  };
  return mode ? (map[mode] ?? mode.replaceAll("_", " ")) : null;
}

function pendingStepLabel(status?: string) {
  if (status === "APPROVED") return "Awaiting handover";
  if (status === "REQUESTED" || status === "PENDING_APPROVAL") {
    return "Awaiting approval";
  }
  return "In progress";
}

export function EnrollmentRedemptionStatus({
  enrollment,
  compact,
}: {
  enrollment: Enrollment;
  compact?: boolean;
}) {
  const pending = enrollment.pendingRedemption;
  const completed = enrollment.completedRedemption;
  const inProgress =
    enrollment.status === "REDEMPTION_PENDING" || Boolean(pending);
  const redeemed = enrollment.status === "REDEEMED";
  const closedEarly = enrollment.status === "CLOSED_PREMATURE";

  if (inProgress && pending) {
    const settlement =
      pending.settlementPaise != null
        ? money(pending.settlementPaise / 100)
        : null;
    const payout = modeLabel(pending.mode);

    return (
      <div
        className={cn(
          "rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-[#fff9f4] to-white p-5 shadow-sm",
          compact && "p-4",
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
              <ShieldAlert className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-[#241316]">Redemption in progress</p>
                <StatusBadge status={pending.status} />
                <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/80">
                  {pendingStepLabel(pending.status)}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                <strong className="font-semibold text-[#241316]">
                  {closureLabel(pending.closureType)}
                </strong>
                {settlement ? (
                  <>
                    {" "}
                    · Settlement{" "}
                    <strong className="text-[#730321]">{settlement}</strong>
                  </>
                ) : null}
                {payout ? <> · {payout}</> : null}. Collections and a new
                initiate are blocked until this request is finished.
              </p>
            </div>
          </div>
          <Button variant="outline" className="shrink-0 bg-white" asChild>
            <Link href={`/maturity?review=${pending.id}`}>
              Review in queue
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (redeemed || closedEarly) {
    const settlementPaise =
      completed?.settlementPaise ??
      (closedEarly ? undefined : undefined);
    const settlement =
      settlementPaise != null ? money(settlementPaise / 100) : null;
    const payout = modeLabel(completed?.mode);

    return (
      <div
        className={cn(
          "rounded-2xl border p-5 shadow-sm",
          redeemed
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-[#f8fdf9]"
            : "border-stone-200 bg-gradient-to-br from-stone-50 via-white to-[#fafafa]",
          compact && "p-4",
        )}
      >
        <div className="flex gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              redeemed
                ? "bg-emerald-100 text-emerald-800"
                : "bg-stone-200 text-stone-700",
            )}
          >
            {redeemed ? (
              <BadgeCheck className="size-6" />
            ) : (
              <CircleCheck className="size-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-[#241316]">
                {redeemed ? "Redeemed at maturity" : "Closed early"}
              </p>
              <StatusBadge status={enrollment.status} />
            </div>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {closureLabel(completed?.closureType)}
              {settlement ? (
                <>
                  {" "}
                  · Final settlement{" "}
                  <strong className="text-[#730321]">{settlement}</strong>
                </>
              ) : null}
              {payout ? <> · {payout}</> : null}. This enrollment is closed.
            </p>
            {completed?.completedAt ? (
              <p className="mt-2 text-xs font-medium text-[#776a6d]">
                Completed{" "}
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(completed.completedAt))}
              </p>
            ) : null}
          </div>
          {settlement ? (
            <div className="hidden shrink-0 text-right sm:block">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#776a6d]">
                Settled
              </p>
              <p className="text-xl font-extrabold tabular-nums text-[#730321]">
                {settlement}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}

/** @deprecated Use EnrollmentRedemptionStatus */
export const EnrollmentRedemptionBanner = EnrollmentRedemptionStatus;
