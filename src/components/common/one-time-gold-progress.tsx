import { oneTimeBonusLabel, type OneTimeGoldProgress } from "@/src/types/one-time-gold";

const grams = (weight: number) => `${(weight / 1000).toFixed(3)} g`;

export function OneTimeGoldProgressPanel({ progress }: { progress: OneTimeGoldProgress }) {
  const posted = progress.periods.filter((period) => period.status === "CREDITED").length;
  return (
    <section className="customer-surface space-y-3 rounded-xl border p-4">
      <h2 className="text-sm font-semibold">One-time gold progress</h2>
      <p className="text-sm text-muted-foreground">{oneTimeBonusLabel(progress.rules)}</p>
      {progress.fundedOn ? (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt>Payment received</dt><dd>₹{(progress.originalPaidPaise / 100).toLocaleString("en-IN")}</dd></div>
            <div><dt>Payment rate</dt><dd>{progress.fundingRatePerGramPaise ? `₹${(progress.fundingRatePerGramPaise / 100).toLocaleString("en-IN")}/g` : "—"}</dd></div>
            <div><dt>Principal gold</dt><dd className="font-semibold">{grams(progress.principalWeightMg)}</dd></div>
            <div><dt>Bonus credited</dt><dd className="font-semibold">{grams(progress.creditedWeightMg)}</dd></div>
            <div><dt>Bonus available to redeem</dt><dd className="font-semibold">{grams(progress.redeemableBonusWeightMg)}</dd></div>
            <div><dt>Maturity</dt><dd>{progress.maturityDate}</dd></div>
          </dl>
          <p className="text-xs text-muted-foreground">{posted} of {progress.periods.length} credits posted{progress.nextCreditDate ? ` · Next credit ${progress.nextCreditDate}` : ""}</p>
          <ul className="max-h-60 divide-y overflow-auto text-sm">
            {progress.periods.map((period) => (
              <li key={period.period} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{period.dueDate}</span>
                <span>{period.status === "CREDITED" ? `${grams(period.weightMg)} credited`
                  : period.status === "PENDING_RATE" ? "Awaiting gold rate"
                    : period.status === "PENDING" ? "Scheduled" : period.status.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </>
      ) : <p className="text-sm">Awaiting the one-time payment.</p>}
    </section>
  );
}
