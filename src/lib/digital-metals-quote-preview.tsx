"use client";

import { formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";

export type QuoteSide = "BUY" | "SELL";

type TaxLine = { code?: string; label?: string; amountPaise?: number; ratePercent?: unknown };
type FeeLine = { code?: string; amountPaise?: number };

function finitePaise(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ratePerGramPaise(quote: Record<string, unknown>, side: QuoteSide): number | null {
  const snap = quote.rateSnapshot as Record<string, unknown> | undefined;
  if (!snap) return null;
  const key = side === "BUY" ? "buyRatePerGramPaise" : "sellRatePerGramPaise";
  return finitePaise(snap[key]);
}

export function quoteSideFromDto(quote: Record<string, unknown>): QuoteSide {
  return String(quote.side ?? "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY";
}

/** Renders admin/customer quote preview from API envelope (no raw JSON). */
export function DigitalMetalsQuoteBreakdown({
  quote,
  className = "",
}: {
  quote: Record<string, unknown>;
  className?: string;
}) {
  const side = quoteSideFromDto(quote);
  const metalUg = quote.metalQuantityUg ?? quote.quantityUg;
  const metalSubtotal = finitePaise(quote.metalSubtotalPaise);
  const feePaise = finitePaise(quote.feePaise);
  const taxPaise = finitePaise(quote.taxPaise);
  const feeLines = (quote.feeLines as FeeLine[] | undefined) ?? [];
  const taxLines = (quote.taxLines as TaxLine[] | undefined) ?? [];
  const ratePaise = ratePerGramPaise(quote, side);
  const totalPayable = finitePaise(quote.totalPayablePaise);
  const settlement = finitePaise(quote.settlementPaise);
  const budgetRemainder = finitePaise(quote.budgetRemainderPaise);
  const expiresAt = quote.expiresAt ? String(quote.expiresAt) : null;

  const moneyTotalLabel = side === "BUY" ? "Total payable" : "Net settlement to you";
  const moneyTotal =
    side === "BUY"
      ? totalPayable
      : settlement;

  return (
    <div
      className={`rounded-lg border bg-muted/30 p-4 text-sm ${className}`}
      data-testid="dm-quote-breakdown"
      data-quote-side={side}
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {side === "BUY" ? "Buy quote" : "Sell quote"}
      </p>
      <dl className="space-y-2">
        {metalUg != null ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Metal quantity</dt>
            <dd className="font-medium">{ugToGramsDisplay(String(metalUg))}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {side === "BUY" ? "Buy rate (per gram)" : "Sell rate (per gram)"}
          </dt>
          <dd>{ratePaise != null ? formatInrFromPaise(ratePaise) : "Unavailable"}</dd>
        </div>
        {metalSubtotal != null ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Metal subtotal</dt>
            <dd>{formatInrFromPaise(metalSubtotal)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Fees</dt>
          <dd>
            {feePaise != null
              ? feePaise === 0
                ? formatInrFromPaise(0)
                : formatInrFromPaise(feePaise)
              : "Unavailable"}
          </dd>
        </div>
        {feeLines.length > 0 ? (
          <ul className="ml-2 space-y-1 text-xs text-muted-foreground">
            {feeLines.map((line) => (
              <li key={`fee-${line.code ?? "fee"}`} className="flex justify-between gap-4">
                <span>{line.code ?? "Fee"}</span>
                <span>{formatInrFromPaise(finitePaise(line.amountPaise) ?? 0)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Taxes</dt>
          <dd>
            {taxPaise != null
              ? taxPaise === 0
                ? formatInrFromPaise(0)
                : formatInrFromPaise(taxPaise)
              : "Unavailable"}
          </dd>
        </div>
        {taxLines.length > 0 ? (
          <ul className="ml-2 space-y-1 text-xs text-muted-foreground">
            {taxLines.map((line) => (
              <li key={`tax-${line.code ?? "tax"}`} className="flex justify-between gap-4">
                <span>{line.label ?? line.code ?? "Tax"}</span>
                <span>{formatInrFromPaise(finitePaise(line.amountPaise) ?? 0)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex justify-between gap-4 border-t pt-2 font-semibold">
          <dt>{moneyTotalLabel}</dt>
          <dd>{moneyTotal != null ? formatInrFromPaise(moneyTotal) : "Unavailable"}</dd>
        </div>
        {side === "BUY" && budgetRemainder != null && budgetRemainder > 0 ? (
          <div className="flex justify-between gap-4 text-xs text-muted-foreground">
            <dt>Unused from your budget</dt>
            <dd>{formatInrFromPaise(budgetRemainder)}</dd>
          </div>
        ) : null}
      </dl>
      {expiresAt ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Quote valid until{" "}
          {new Date(expiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (IST)
        </p>
      ) : null}
    </div>
  );
}
