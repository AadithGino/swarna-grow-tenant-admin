"use client";

import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  Gift,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { SettlementLinesPanel } from "@/src/features/enrollments/settlement-lines-panel";
import { money } from "@/src/lib/format";
import type { MaturityProjection } from "@/src/lib/v1-maturity-projection";
import type { Enrollment, SettlementPreview } from "@/src/types/domain";
import { cn } from "@/lib/utils";

const WORKFLOW_STEPS = [
  { key: "preview", label: "Preview" },
  { key: "initiate", label: "Initiate" },
  { key: "approve", label: "Approve" },
  { key: "complete", label: "Complete" },
] as const;

function redemptionHeadline(enrollment: Enrollment) {
  const { status } = enrollment;
  if (status === "REDEMPTION_PENDING") return "Redemption in progress";
  if (status === "REDEEMED") return "Redeemed";
  if (status === "CLOSED_PREMATURE") return "Closed early";
  if (status === "MATURED") return "Ready to redeem";
  return "Building toward maturity";
}

function redemptionSubcopy(enrollment: Enrollment) {
  const pending = enrollment.pendingRedemption;
  if (enrollment.status === "REDEMPTION_PENDING" && pending) {
    if (pending.status === "APPROVED") {
      return "Approved — complete customer handover from the redemption queue.";
    }
    return "Open request is pending staff approval or handover. Collections stay blocked.";
  }
  if (enrollment.status === "REDEEMED") {
    return "Term completed and settlement posted. No further installments or redemption actions.";
  }
  if (enrollment.status === "CLOSED_PREMATURE") {
    return "Scheme closed before maturity. Penalties and benefit rules were applied at closure.";
  }
  if (enrollment.status === "MATURED") {
    return "All installments are complete. Settlement uses confirmed payments and plan rules at redemption time.";
  }
  return (
    enrollment.helperText ??
    "Maturity redemption unlocks after the plan term is complete. You can preview early closure while the scheme is still active."
  );
}

function workflowStepIndex(enrollment: Enrollment) {
  const pending = enrollment.pendingRedemption;
  if (enrollment.status === "REDEEMED" || enrollment.status === "CLOSED_PREMATURE") {
    return 4;
  }
  if (enrollment.status === "REDEMPTION_PENDING" && pending) {
    if (pending.status === "APPROVED") return 3;
    return 2;
  }
  if (enrollment.status === "MATURED") return 1;
  return 0;
}

export function EnrollmentMaturityTab({
  enrollment,
  maturityPreview,
  maturityProjection,
  onMaturityPreview,
  onPrematurePreview,
  onRedeem,
  onCloseEarly,
}: {
  enrollment: Enrollment;
  maturityPreview?: SettlementPreview;
  maturityProjection?: MaturityProjection | null;
  onMaturityPreview: () => void;
  onPrematurePreview: () => void;
  onRedeem: () => void;
  onCloseEarly: () => void;
}) {
  const row = enrollment;
  const pending = row.pendingRedemption;
  const completed = row.completedRedemption;
  const redemptionInProgress =
    row.status === "REDEMPTION_PENDING" || Boolean(pending);
  const redemptionComplete =
    row.status === "REDEEMED" || row.status === "CLOSED_PREMATURE";
  const canCloseEarly =
    !redemptionInProgress &&
    !redemptionComplete &&
    (row.status === "ACTIVE" ||
      row.status === "LOCKED" ||
      row.status === "PENDING_ACTIVATION");
  const canRedeem =
    !redemptionInProgress &&
    !redemptionComplete &&
    (row.canRedeem === true || row.status === "MATURED");
  const step = workflowStepIndex(row);
  const progressPct = Math.min(
    100,
    (row.progress / Math.max(row.tenure, 1)) * 100,
  );
  const cyclesRemaining = Math.max(row.tenure - row.progress, 0);
  const projectedFromApi =
    maturityProjection && maturityProjection.projectedAmountPaise > 0
      ? maturityProjection.projectedAmountPaise / 100
      : null;
  const projected = projectedFromApi ?? row.installment * row.tenure;
  const projectedLabel =
    projectedFromApi != null
      ? "Projected at maturity"
      : "Projected contribution";
  const showTermProgress = !redemptionComplete;

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "rounded-2xl border p-5 sm:p-6",
          redemptionComplete &&
            "border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-white",
          redemptionInProgress &&
            "border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-[#fdf5f7]",
          !redemptionComplete &&
            !redemptionInProgress &&
            "border-[#e8dde2] bg-gradient-to-br from-[#fff9f4] via-white to-[#fdf5f7]",
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl",
                redemptionComplete
                  ? "bg-emerald-100 text-emerald-800"
                  : redemptionInProgress
                    ? "bg-amber-100 text-amber-900"
                    : "bg-[#730321]/10 text-[#730321]",
              )}
            >
              {redemptionComplete ? (
                <CircleCheck className="size-6" />
              ) : (
                <Gift className="size-6" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={row.status} />
                <span className="text-sm font-semibold text-[#241316]">
                  {redemptionHeadline(row)}
                </span>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {redemptionSubcopy(row)}
              </p>
            </div>
          </div>
          {showTermProgress ? (
            <div className="rounded-xl border border-[#efe6ea] bg-white/80 px-4 py-3 text-center sm:min-w-[140px]">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                To maturity
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[#730321]">
                {cyclesRemaining}
              </p>
              <p className="text-xs text-muted-foreground">
                cycle{cyclesRemaining === 1 ? "" : "s"} remaining
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#efe6ea] bg-white/80 px-4 py-3 text-center sm:min-w-[140px]">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Enrollment
              </p>
              <p className="mt-1 text-lg font-bold text-[#241316]">Closed</p>
              <p className="text-xs text-muted-foreground">No cycles due</p>
            </div>
          )}
        </div>
        {showTermProgress ? (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>
                {row.progress} of {row.tenure} cycles paid
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-[#e4d7d2] bg-white/60 px-4 py-3 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" />
            Installment schedule is complete — focus on settlement and ledger
            history.
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Surface title="Maturity & settlement">
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {[
              {
                icon: Scale,
                label: projectedLabel,
                value: money(projected),
                tone: "text-[#241316]",
              },
              {
                icon: Sparkles,
                label: "Contributed so far",
                value: money(row.paid),
                tone: "text-[#730321]",
              },
              {
                icon: Gift,
                label: "Maturity date",
                value: row.maturity,
                tone: "text-[#241316]",
              },
              {
                icon: ShieldCheck,
                label: redemptionComplete ? "Final status" : "Value basis",
                value: redemptionComplete
                  ? row.status.replaceAll("_", " ")
                  : row.valueBasis.replaceAll("_", " "),
                tone: "text-[#241316]",
              },
            ].map(({ icon: Icon, label, value, tone }) => (
              <div
                key={label}
                className="rounded-xl border border-[#efe6ea] bg-[#faf6f7] p-4"
              >
                <Icon className="mb-2 size-4 text-[#9a6f2a]" />
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("mt-1 font-bold tabular-nums capitalize", tone)}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface
          title="Redemption workflow"
          description={
            redemptionComplete
              ? "Closure recorded"
              : redemptionInProgress
                ? "Request active on this enrollment"
                : "Staff path from preview to handover"
          }
        >
          <div className="space-y-5 p-5">
            <ol className="flex items-center justify-between gap-1">
              {WORKFLOW_STEPS.map((item, index) => {
                const done = index < step;
                const current = index === step && step < 4;
                const allDone = step >= 4;
                return (
                  <li
                    key={item.key}
                    className="flex min-w-0 flex-1 flex-col items-center gap-2"
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                        (done || (allDone && index < 4)) &&
                          "bg-emerald-100 text-emerald-800",
                        current &&
                          "bg-[#730321] text-white ring-4 ring-[#f7ecee]",
                        !done &&
                          !current &&
                          !(allDone && index < 4) &&
                          "bg-[#f3eef0] text-muted-foreground",
                      )}
                    >
                      {done || (allDone && index < 4) ? (
                        <CircleCheck className="size-4" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-center text-[10px] font-semibold uppercase tracking-wide sm:text-xs",
                        current ? "text-[#730321]" : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {redemptionComplete && completed?.settlementPaise != null ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Recorded settlement
                </p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#730321]">
                  {money(completed.settlementPaise / 100)}
                </p>
                <p className="mt-2 text-sm text-emerald-900/80">
                  Posted to the enrollment ledger when handover was completed.
                </p>
              </div>
            ) : redemptionInProgress && pending?.settlementPaise != null ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Requested settlement
                </p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#730321]">
                  {money(pending.settlementPaise / 100)}
                </p>
                <p className="mt-2 text-sm text-amber-950/85">
                  Locked when the request was initiated — approve or complete from
                  the queue.
                </p>
                <Button className="mt-4 w-full" variant="outline" asChild>
                  <Link href={`/maturity?review=${pending.id}`}>
                    Open redemption queue
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            ) : maturityPreview?.eligible ? (
              <SettlementLinesPanel preview={maturityPreview} compact />
            ) : (
              <div className="rounded-xl border border-dashed border-[#e8dde2] bg-[#faf6f7] px-4 py-5 text-center">
                <p className="text-sm font-medium text-[#241316]">
                  {canRedeem
                    ? "Settlement preview"
                    : redemptionComplete
                      ? "Enrollment closed"
                      : "Not at maturity yet"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {redemptionComplete
                    ? "Settlement was finalized at handover. See payment ledger and audit for entries."
                    : canRedeem
                      ? "Open the full preview to review line items before initiating redemption."
                      : "When the scheme matures, the settlement computation appears here."}
                </p>
              </div>
            )}

            {!redemptionComplete ? (
              <div className="space-y-2">
                {canRedeem ? (
                  <Button className="w-full" onClick={onRedeem}>
                    Initiate redemption
                    <ArrowRight className="size-4" />
                  </Button>
                ) : redemptionInProgress ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
                    Redemption actions are managed in the{" "}
                    <Link
                      href={`/maturity?review=${pending?.id ?? ""}`}
                      className="font-semibold text-[#730321] underline-offset-2 hover:underline"
                    >
                      redemption queue
                    </Link>
                    . Initiate and collect are disabled until this request
                    completes or is rejected.
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#efe6ea] bg-white p-4 text-sm text-muted-foreground">
                    Initiate redemption is available once the scheme reaches{" "}
                    <strong className="text-foreground">Matured</strong> status.
                  </div>
                )}
                {!redemptionInProgress ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="secondary"
                      className="bg-[#f3eef0] hover:bg-[#ebe3e6]"
                      onClick={onMaturityPreview}
                    >
                      Maturity preview
                    </Button>
                    {canCloseEarly ? (
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={onPrematurePreview}
                      >
                        Early closure
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {canCloseEarly ? (
                  <button
                    type="button"
                    className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-[#730321] hover:underline"
                    onClick={onCloseEarly}
                  >
                    Close scheme prematurely…
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-[#efe6ea] bg-[#faf6f7] px-4 py-4 text-sm text-muted-foreground">
                No redemption actions — this enrollment is closed. Use{" "}
                <strong className="text-foreground">Payment ledger</strong> and{" "}
                <strong className="text-foreground">Timeline</strong> for audit
                history.
              </div>
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}
