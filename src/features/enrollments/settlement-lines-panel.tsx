"use client";

import {
  BadgeCheck,
  Calendar,
  CircleCheck,
  Gift,
  IndianRupee,
  Minus,
  Plus,
  Scale,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { StatCard, Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { formatIsoDate, money } from "@/src/lib/format";
import type { SettlementLine, SettlementPreview } from "@/src/types/domain";
import { cn } from "@/lib/utils";

function lineTone(line: SettlementLine) {
  if (line.forfeited) return "muted" as const;
  if (line.sign === "-") return "debit" as const;
  return "credit" as const;
}

function sumLines(lines: SettlementLine[], sign: "+" | "-") {
  return lines
    .filter((l) => l.sign === sign && !l.forfeited)
    .reduce((sum, l) => sum + l.amount, 0);
}

function SettlementHero({ preview }: { preview: SettlementPreview }) {
  const isMaturity = preview.type === "MATURITY_REDEMPTION";
  const eligible = preview.eligible;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border shadow-[0_2px_5px_rgb(67_15_25/3%)]",
        eligible
          ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-[#fdf5f7]"
          : "border-amber-200/80 bg-gradient-to-br from-amber-50/35 via-white to-[#fdf5f7]",
      )}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl",
              eligible
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-900",
            )}
          >
            {eligible ? (
              <CircleCheck className="size-6" />
            ) : (
              <ShieldAlert className="size-6" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">
              {isMaturity ? "Maturity settlement" : "Premature closure"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-extrabold tracking-tight text-[#241316]">
                {preview.scheme?.schemeNumber ?? "Enrollment"}
              </h3>
              {preview.scheme?.planName ? (
                <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-[#776a6d] ring-1 ring-[#eaded9]">
                  {preview.scheme.planName}
                </span>
              ) : null}
            </div>
            {preview.customer ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#776a6d]">
                <UserRound className="size-3.5 shrink-0" />
                <span className="font-medium text-[#4f3d41]">
                  {preview.customer.name}
                </span>
                {preview.customer.passbookNumber ? (
                  <span>· {preview.customer.passbookNumber}</span>
                ) : null}
                {preview.customer.mobile ? (
                  <span>· {preview.customer.mobile}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <StatusBadge
            status={eligible ? "ACTIVE" : "LOCKED"}
            label={eligible ? "Eligible" : "Not eligible"}
          />
          {preview.scheme?.lockInMet ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
              <BadgeCheck className="size-3.5" />
              Lock-in met
            </span>
          ) : null}
          {preview.approvalRequired ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/80">
              Approval required
            </span>
          ) : null}
        </div>
      </div>
      {preview.scheme?.maturityDate ? (
        <div className="border-t border-[#efe6ea]/80 bg-white/50 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#776a6d]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4 text-[#9a6f2a]" />
              Maturity {formatIsoDate(preview.scheme.maturityDate)}
            </span>
            {preview.scheme.lockInMonths != null ? (
              <span>
                {preview.scheme.monthsCompleted ?? 0}/{preview.scheme.lockInMonths}{" "}
                months lock-in
                {preview.scheme.lockInMet ? " · satisfied" : ""}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettlementSummaryStrip({ preview }: { preview: SettlementPreview }) {
  const credits = sumLines(preview.lines, "+");
  const debits = sumLines(preview.lines, "-");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={IndianRupee}
        label="Total credits"
        value={money(credits)}
        detail="Paid installments & benefits"
        tone="green"
      />
      <StatCard
        icon={Minus}
        label="Deductions"
        value={money(debits)}
        detail="Penalties & adjustments"
        tone={debits > 0 ? "red" : "cream"}
      />
      <StatCard
        icon={Gift}
        label="Benefit lines"
        value={String(preview.textBenefits.length)}
        detail={
          preview.textBenefits.length
            ? "Non-monetary plan benefits"
            : "No text benefits on this plan"
        }
        tone="cream"
      />
      <StatCard
        icon={Scale}
        label="Final settlement"
        value={money(preview.finalValue)}
        detail={
          preview.finalWeightDisplay
            ? preview.finalWeightDisplay
            : "Customer payout amount"
        }
        tone="wine"
      />
    </div>
  );
}

function SettlementLineRow({ line }: { line: SettlementLine }) {
  const tone = lineTone(line);
  return (
    <li
      className={cn(
        "grid grid-cols-[1fr_auto] gap-4 px-4 py-3.5 sm:px-5",
        line.forfeited && "bg-[#faf6f7]/60",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
              tone === "credit" && "bg-emerald-50 text-emerald-700",
              tone === "debit" && "bg-red-50 text-red-700",
              tone === "muted" && "bg-[#f3eef0] text-muted-foreground",
            )}
          >
            {line.sign}
          </span>
          <div>
            <p
              className={cn(
                "font-semibold text-[#28161a]",
                line.forfeited && "line-through opacity-70",
              )}
            >
              {line.label}
            </p>
            {line.forfeitReason ? (
              <p className="mt-1 text-xs leading-5 text-[#807478]">
                {line.forfeitReason}
              </p>
            ) : null}
            {line.note ? (
              <p className="mt-1 text-xs leading-5 text-[#807478]">{line.note}</p>
            ) : null}
            {line.weightDisplay ? (
              <p className="mt-1 text-xs font-medium text-[#9a6f2a]">
                {line.weightDisplay}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "text-base font-bold tabular-nums",
            tone === "credit" && "text-emerald-800",
            tone === "debit" && "text-red-700",
            tone === "muted" && "text-muted-foreground",
          )}
        >
          {line.weightDisplay && !line.amount
            ? line.weightDisplay
            : `${line.sign}${money(line.amount)}`}
        </p>
        {line.forfeited ? (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Forfeited
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function SettlementLinesPanel({
  preview,
  compact,
}: {
  preview: SettlementPreview;
  compact?: boolean;
}) {
  const hasContext = preview.scheme || preview.customer;

  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      {hasContext && !compact ? <SettlementHero preview={preview} /> : null}

      {hasContext && compact ? (
        <div className="rounded-xl border border-[#e4d7d2] bg-[#faf6f7] px-4 py-3 text-sm">
          {preview.scheme ? (
            <p className="font-semibold text-[#730321]">
              {preview.scheme.schemeNumber}
              {preview.scheme.planName ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {preview.scheme.planName}
                </span>
              ) : null}
            </p>
          ) : null}
          {preview.customer ? (
            <p className="mt-1 text-muted-foreground">
              {preview.customer.name}
              {preview.customer.passbookNumber
                ? ` · ${preview.customer.passbookNumber}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {!preview.eligible && preview.blockers.length ? (
        <div className="space-y-3">
          {preview.blockers.map((blocker) => (
            <div
              key={blocker.code}
              className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm"
            >
              <div className="flex gap-3">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-800" />
                <div>
                  <p className="font-semibold text-amber-950">{blocker.message}</p>
                  {blocker.eligibleFrom ? (
                    <p className="mt-1 text-sm text-amber-900/80">
                      Eligible from {formatIsoDate(blocker.eligibleFrom)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {preview.lines.length ? (
            <p className="text-xs text-muted-foreground">
              Breakdown below is for reference — settlement is blocked until the
              conditions above are resolved.
            </p>
          ) : null}
        </div>
      ) : null}

      {preview.warningText ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-900">
          {preview.warningText}
        </div>
      ) : null}

      {preview.textBenefits.map((benefit) => (
        <div
          key={benefit.displayLabel}
          className="rounded-2xl border border-[#eadbb5] bg-gradient-to-br from-[#fff8e8] to-white p-4 shadow-sm"
        >
          <div className="flex gap-3">
            <Gift className="size-5 shrink-0 text-[#805817]" />
            <div>
              <p className="font-bold text-[#805817]">{benefit.displayLabel}</p>
              <p className="mt-2 text-sm leading-6 text-[#5c4a2a]">
                {benefit.text}
              </p>
              <p className="mt-2 text-sm font-medium text-[#805817]">
                {benefit.note}
              </p>
            </div>
          </div>
        </div>
      ))}

      {preview.lines.length ? (
        <>
          {!compact ? <SettlementSummaryStrip preview={preview} /> : null}

          <Surface
            title="Settlement computation"
            description="Based on confirmed payments and active plan rules at preview time."
          >
            <ul className="divide-y divide-[#efe6ea]">
              {preview.lines.map((line) => (
                <SettlementLineRow key={line.key} line={line} />
              ))}
            </ul>
            <div className="flex flex-col gap-2 border-t border-[#e4d7d2] bg-gradient-to-r from-[#fdfafb] to-[#f7ecee]/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9a6f2a]">
                  Final settlement
                </p>
                <p className="mt-0.5 text-sm text-[#776a6d]">
                  Amount payable to customer on completion
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-extrabold tabular-nums tracking-tight text-[#730321]">
                  {money(preview.finalValue)}
                </p>
                {preview.finalWeightDisplay ? (
                  <p className="mt-1 text-sm font-semibold text-[#9a6f2a]">
                    {preview.finalWeightDisplay}
                  </p>
                ) : null}
                {preview.handoverValue != null && preview.handoverValue > 0 ? (
                  <p className="mt-1 text-xs text-[#776a6d]">
                    Gold valued at handover: {money(preview.handoverValue)}
                  </p>
                ) : null}
                {preview.roundingDelta != null && preview.roundingDelta !== 0 ? (
                  <p className="mt-1 text-xs text-amber-900/90">
                    Rounding vs settlement: {money(preview.roundingDelta)} (disclosure only)
                  </p>
                ) : null}
              </div>
            </div>
          </Surface>

          {preview.valuationNote ? (
            <p className="rounded-xl border border-dashed border-[#e4d7d2] bg-[#faf7f5] px-4 py-3 text-xs leading-5 text-[#776a6d]">
              {preview.valuationNote}
            </p>
          ) : null}

          {preview.approvalRequired ? (
            <div className="flex gap-3 rounded-2xl border border-[#e4d7d2] bg-white px-4 py-3 shadow-sm">
              <Plus className="mt-0.5 size-4 shrink-0 text-[#9a6f2a]" />
              <p className="text-sm leading-6 text-[#776a6d]">
                {preview.approvalReason ??
                  "Admin approval is required before this scheme can be closed."}
              </p>
            </div>
          ) : null}
        </>
      ) : !preview.eligible && preview.blockers.length ? null : (
        <p className="text-sm text-muted-foreground">
          No settlement lines available for this scheme.
        </p>
      )}
    </div>
  );
}
