"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { money, formatIsoDate } from "@/src/lib/format";
import { portalPathFromContract } from "@/src/lib/contract-paths";
import { cn } from "@/lib/utils";

export type EnrolValidationPreview = {
  blockers?: { code: string; message: string; actionPath?: string }[];
  warnings?: { code: string; message: string }[];
  preview?: {
    installmentAmount?: number;
    installmentCount?: number;
    phaseSummary?: string;
    illustrativeCapPerCycle?: number;
    totalCommitment?: number;
    totalPayableNote?: string;
    isFlexible?: boolean;
    firstDueDate?: string;
    maturityDate?: string;
    benefitLabel?: string;
    projectedValue?: number;
    schedulePreview?: {
      sequence: number;
      dueDate: string;
      amountDisplay: string;
      note?: string | null;
    }[];
  };
};

export function EnrolValidationPanel({
  validation,
  loading,
  className,
}: {
  validation?: EnrolValidationPreview | null;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#e8dcd8] bg-[#fbf8f5] p-6 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-5 animate-spin text-[#730321]" />
        Validating enrolment…
      </div>
    );
  }
  if (!validation) {
    return (
      <div
        className={cn(
          "min-h-[280px] rounded-2xl border border-dashed border-[#e3d5d0] bg-[#faf7f5] p-6 text-sm text-muted-foreground",
          className,
        )}
      >
        Choose customer and plan to see live validation and schedule preview.
      </div>
    );
  }

  const p = validation.preview;
  const hasPreview = p && (p.installmentAmount != null || p.schedulePreview?.length);
  const canEnrol = !(validation.blockers?.length);

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-[#e8dcd8] bg-[#fbf8f5] p-5 shadow-sm",
        className,
      )}
    >
      {(validation.blockers ?? []).map((b) => (
        <div
          key={b.code}
          className="flex gap-2 rounded-xl border border-red-200/80 bg-red-50 p-3 text-sm text-red-900"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="leading-snug">
            {b.message}
            {b.actionPath ? (
              <Link
                href={portalPathFromContract(b.actionPath)}
                className="ml-1 font-semibold underline underline-offset-2"
              >
                Fix
              </Link>
            ) : null}
          </div>
        </div>
      ))}
      {(validation.warnings ?? []).map((w) => (
        <div
          key={w.code}
          className="rounded-xl border border-amber-200/80 bg-amber-50 p-3 text-sm leading-snug text-amber-950"
        >
          {w.message}
        </div>
      ))}

      {hasPreview ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {canEnrol ? (
              <CheckCircle2 className="size-4 text-emerald-700" />
            ) : (
              <AlertTriangle className="size-4 text-amber-700" />
            )}
            <span className="text-sm font-semibold text-[#490b17]">
              {canEnrol ? "Ready to enrol" : "Preview"}
            </span>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
            {p!.installmentAmount != null && (
              <>
                <dt className="text-muted-foreground">
                  {p!.isFlexible ? "Reference payment" : "Installment"}
                </dt>
                <dd className="font-medium">{money(p!.installmentAmount)}</dd>
              </>
            )}
            {p!.phaseSummary ? (
              <>
                <dt className="text-muted-foreground">Structure</dt>
                <dd className="font-medium">{p!.phaseSummary}</dd>
              </>
            ) : p!.installmentCount != null ? (
              <>
                <dt className="text-muted-foreground">Installments</dt>
                <dd className="font-medium">{p!.installmentCount}</dd>
              </>
            ) : null}
            {p!.illustrativeCapPerCycle != null && p!.illustrativeCapPerCycle > 0 ? (
              <>
                <dt className="text-muted-foreground">Illustrative cap / cycle</dt>
                <dd className="font-medium">{money(p!.illustrativeCapPerCycle)}</dd>
              </>
            ) : null}
            {p!.totalCommitment != null && p!.totalCommitment > 0 && (
              <>
                <dt className="text-muted-foreground">
                  {p!.isFlexible ? "Illustrative max" : "Total payable"}
                </dt>
                <dd className="font-medium">{money(p!.totalCommitment)}</dd>
              </>
            )}
            {p!.firstDueDate && (
              <>
                <dt className="text-muted-foreground">First due</dt>
                <dd className="font-medium">{formatIsoDate(p!.firstDueDate)}</dd>
              </>
            )}
            {p!.maturityDate && (
              <>
                <dt className="text-muted-foreground">Maturity</dt>
                <dd className="font-medium">{formatIsoDate(p!.maturityDate)}</dd>
              </>
            )}
          </dl>

          {p!.totalPayableNote ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {p!.totalPayableNote}
            </p>
          ) : null}
          {p!.benefitLabel ? (
            <p className="rounded-lg border border-[#e9d8ab] bg-[#fff9e9] px-3 py-2 text-xs font-medium text-[#6b4e0a]">
              {p!.benefitLabel}
            </p>
          ) : null}

          {p!.schedulePreview?.length ? (
            <div className="overflow-hidden rounded-xl border border-[#e8dcd8] bg-white">
              <div className="grid grid-cols-[2.5rem_1fr_5.5rem] gap-2 border-b bg-[#faf7f5] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>#</span>
                <span>Due date</span>
                <span className="text-right">Amount</span>
              </div>
              <ul className="max-h-36 overflow-y-auto text-xs">
                {p!.schedulePreview.slice(0, 6).map((row) => (
                  <li
                    key={row.sequence}
                    className="grid grid-cols-[2.5rem_1fr_5.5rem] gap-2 border-b border-[#f0e8e4] px-3 py-2 last:border-0"
                  >
                    <span className="font-medium text-muted-foreground">
                      {row.sequence}
                    </span>
                    <span>{formatIsoDate(row.dueDate)}</span>
                    <span className="text-right font-medium">
                      {row.amountDisplay}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : !validation.blockers?.length ? (
        <p className="text-sm text-muted-foreground">
          Complete the form to generate a schedule preview.
        </p>
      ) : null}
    </div>
  );
}
