import type { CollectionBonus } from "@/src/types/collection";
import { formatIsoDate } from "@/src/lib/format";

const STATUS_LABELS: Record<CollectionBonus["status"], string> = {
  PENDING: "Pending maturity",
  PENDING_RATE: "Awaiting the applicable gold rate",
  CREDITED: "Credited",
  INELIGIBLE: "Not earned",
};

function formatGold(weightMg: number): string {
  return `${(weightMg / 1000).toLocaleString("en-IN", { maximumFractionDigits: 3 })} g`;
}

export function MaturityGoldCredit({ bonus, className }: { bonus?: CollectionBonus; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground">Maturity bonus gold</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">
        {bonus?.status === "CREDITED" ? `${formatGold(bonus.weightMg)} credited`
          : STATUS_LABELS[bonus?.status ?? "PENDING"]}
        {bonus?.postedAt && bonus.status === "CREDITED" ? ` · ${formatIsoDate(bonus.postedAt)}` : ""}
      </p>
      {bonus?.status === "PENDING" && bonus.estimatedWeightMg != null && (
        <p className="mt-1 text-xs text-muted-foreground">Estimated on contributions to date · {formatGold(bonus.estimatedWeightMg)}</p>
      )}
    </div>
  );
}
