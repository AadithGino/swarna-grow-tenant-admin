"use client";

import { Lock } from "lucide-react";
import { money } from "@/src/lib/format";
import {
  cashSettlementBasisLabel,
  paidAmountCashFormulaNote,
  resolveCashSettlementBasis,
  resolvePaidAmountBenefitTreatment,
} from "@/src/lib/cash-settlement-basis";
import type { SettlementPreview } from "@/src/types/domain";

export function SettlementCashBasisPanel({
  preview,
  mode,
}: {
  preview: SettlementPreview;
  mode?: string;
}) {
  const valueBasis = preview.valueBasis;
  if (valueBasis !== "GOLD_WEIGHT" || mode !== "CASH") return null;

  const basis = resolveCashSettlementBasis({
    cashSettlementBasis: preview.cashSettlementBasis,
  });
  const treatment = resolvePaidAmountBenefitTreatment({
    paidAmountBenefitTreatment: preview.paidAmountBenefitTreatment,
  });
  const paidAmount = basis === "PAID_AMOUNT";

  return (
    <div className="space-y-3 rounded-2xl border border-[#e4d7d2] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-[#9a6f2a]" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9a6f2a]">
            Cash payout basis (plan rule)
          </p>
          <p className="text-sm font-semibold text-[#28161a]">
            {cashSettlementBasisLabel(basis)}
          </p>
          <p className="text-xs leading-5 text-[#776a6d]">
            Set in the plan and frozen at enrolment. Staff cannot change this at
            redemption.
          </p>
        </div>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {preview.principalPaid != null && preview.principalPaid > 0 ? (
          <div className="rounded-xl bg-[#faf7f5] px-3 py-2">
            <dt className="text-xs text-muted-foreground">Net paid (ledger)</dt>
            <dd className="font-bold tabular-nums text-[#28161a]">
              {money(preview.principalPaid)}
            </dd>
          </div>
        ) : null}
        {preview.accruedGoldWeightDisplay ? (
          <div className="rounded-xl bg-[#faf7f5] px-3 py-2">
            <dt className="text-xs text-muted-foreground">Accrued gold weight</dt>
            <dd className="font-bold text-[#9a6f2a]">
              {preview.accruedGoldWeightDisplay}
            </dd>
          </div>
        ) : null}
        {paidAmount && treatment === "INCLUDE_MONETARY" ? (
          <div className="rounded-xl bg-[#faf7f5] px-3 py-2 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">
              Monetary plan benefit
            </dt>
            <dd className="font-bold tabular-nums text-emerald-800">
              {preview.includedMonetaryBenefit != null &&
              preview.includedMonetaryBenefit > 0
                ? `+ ${money(preview.includedMonetaryBenefit)} included`
                : "Eligible benefit excluded or forfeited"}
            </dd>
          </div>
        ) : null}
        {paidAmount && treatment === "EXCLUDE" ? (
          <div className="rounded-xl bg-[#faf7f5] px-3 py-2 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Plan benefit</dt>
            <dd className="text-[#5c4a4e]">
              Not added to cash payout (paid-amount basis).
            </dd>
          </div>
        ) : null}
        {!paidAmount &&
        preview.valuationRateDisplay &&
        preview.valuationRateEffectiveDate ? (
          <div className="rounded-xl bg-[#faf7f5] px-3 py-2 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">22K valuation rate</dt>
            <dd className="font-semibold text-[#28161a]">
              {preview.valuationRateDisplay} ·{" "}
              {preview.valuationRateEffectiveDate}
            </dd>
          </div>
        ) : null}
      </dl>

      {paidAmount ? (
        <p className="text-xs leading-5 text-[#776a6d]">
          {paidAmountCashFormulaNote(treatment === "INCLUDE_MONETARY")}
        </p>
      ) : null}
    </div>
  );
}
