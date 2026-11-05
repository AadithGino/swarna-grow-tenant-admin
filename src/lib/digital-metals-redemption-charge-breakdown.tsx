"use client";

import { formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";

type ChargeLine = { code?: string; label?: string; amountPaise?: number };

export function DigitalMetalsRedemptionChargeBreakdown({
  quote,
  className = "",
}: {
  quote: Record<string, unknown>;
  className?: string;
}) {
  const metalReserved = quote.quantityReservedUg ?? quote.quantityUg;
  const remaining = quote.remainingAvailableUg;
  const chargeTotal = Number(quote.chargeTotalPaise ?? quote.totalChargePaise ?? 0);
  const lines = (quote.chargeLines as ChargeLine[] | undefined) ?? [];
  const taxPaise = quote.taxPaise != null ? Number(quote.taxPaise) : null;

  return (
    <div
      className={`rounded-xl border border-[#eaded9] bg-[#faf8f7] p-4 text-sm ${className}`}
      data-testid="dm-redemption-charge-breakdown"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6a70]">Redemption summary</p>
      <dl className="mt-3 space-y-2">
        {metalReserved != null ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[#5c3d42]">Metal reserved from wallet</dt>
            <dd className="font-medium">{ugToGramsDisplay(String(metalReserved))}</dd>
          </div>
        ) : null}
        {remaining != null ? (
          <div className="flex justify-between gap-4 text-xs text-[#8a6a70]">
            <dt>Remaining available after reservation</dt>
            <dd>{ugToGramsDisplay(String(remaining))}</dd>
          </div>
        ) : null}
        {lines.length > 0 ? (
          lines.map((line) => (
            <div key={line.code ?? line.label} className="flex justify-between gap-4">
              <dt className="text-[#5c3d42]">{line.label ?? line.code ?? "Charge"}</dt>
              <dd>{formatInrFromPaise(Number(line.amountPaise ?? 0))}</dd>
            </div>
          ))
        ) : null}
        {taxPaise != null ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[#5c3d42]">Taxes</dt>
            <dd>{formatInrFromPaise(taxPaise)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-[#eaded9] pt-2 font-semibold text-[#28161a]">
          <dt>{chargeTotal === 0 ? "INR charges" : "Total INR charges"}</dt>
          <dd>{formatInrFromPaise(chargeTotal)}</dd>
        </div>
      </dl>
      {chargeTotal === 0 ? (
        <p className="mt-2 text-xs text-emerald-900">No INR payment required — we will proceed after you confirm.</p>
      ) : (
        <p className="mt-2 text-xs text-[#8a6a70]">Charges are separate from metal; grams are reserved, not sold as fees.</p>
      )}
    </div>
  );
}
