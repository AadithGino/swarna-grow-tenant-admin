"use client";

import Link from "next/link";
import { ArrowRight, Gift, IndianRupee, Scale, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, Surface } from "@/src/components/common/page-parts";
import { grams, money } from "@/src/lib/format";

export type RedemptionFulfillmentSummary = {
  count: number;
  totalSettled: number;
  cashHandedOut: number;
  benefitPaid: number;
  penaltyCollected: number;
  goldHandedGrams: number;
  goldHandoverValue: number;
  maturityCount: number;
  /** Cash + gold handed out on maturity redemptions only. */
  maturityHandedOut?: number;
  /** Settled as credit toward a shop purchase (no cash/gold handed out). */
  purchaseCredit?: number;
  prematureCount: number;
  prematurePenalty: number;
};

export function RedemptionFulfillmentCard({
  data,
  periodLabel,
}: {
  data: RedemptionFulfillmentSummary;
  periodLabel?: string;
}) {
  if (!data.count && !data.prematureCount && !data.maturityCount) {
    return (
      <Surface
        title="Redemption & closure"
        description={
          periodLabel
            ? `Completed handovers · ${periodLabel}`
            : "Completed handovers"
        }
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/reports">
              Maturity & redemption report
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      >
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          No completed redemptions or premature closures in this period. Open
          requests appear under{" "}
          <Link href="/maturity" className="font-semibold text-[#730321]">
            Maturity & redemption
          </Link>
          .
        </p>
      </Surface>
    );
  }

  return (
    <Surface
      title="Redemption & closure"
      description={
        periodLabel
          ? `${data.count} completion${data.count === 1 ? "" : "s"} · ${periodLabel}`
          : `${data.count} completed handover${data.count === 1 ? "" : "s"}`
      }
      action={
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports">
            Full report
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          icon={Gift}
          label="Maturity redemptions"
          value={String(data.maturityCount)}
          detail={`${money(data.maturityHandedOut ?? data.totalSettled)} handed out (cash + gold)`}
          tone="cream"
        />
        <StatCard
          icon={ShieldAlert}
          label="Premature closures"
          value={String(data.prematureCount)}
          detail={
            data.prematurePenalty > 0
              ? `${money(data.prematurePenalty)} penalties`
              : "Early exits"
          }
          tone="gold"
        />
        <StatCard
          icon={IndianRupee}
          label="Cash handed out"
          value={money(data.cashHandedOut)}
          detail={
            (data.purchaseCredit ?? 0) > 0
              ? `Plus ${money(data.purchaseCredit ?? 0)} given as purchase credit`
              : "Paid in cash to customers"
          }
          tone="wine"
        />
        <StatCard
          icon={Scale}
          label="Gold handover value"
          value={
            data.goldHandoverValue > 0
              ? money(data.goldHandoverValue)
              : data.goldHandedGrams > 0
                ? grams(data.goldHandedGrams)
                : "—"
          }
          detail={
            data.goldHandoverValue > 0 && data.goldHandedGrams > 0
              ? `${grams(data.goldHandedGrams)} at handover-day rate`
              : data.goldHandedGrams > 0
                ? "Gold handover mode (weight only)"
                : "Take-as-gold fulfilment"
          }
          tone="green"
        />
        <StatCard
          icon={Gift}
          label="Benefits paid"
          value={money(data.benefitPaid)}
          detail="Benefit credits in settlement"
          tone="cream"
        />
        <StatCard
          icon={ShieldAlert}
          label="Penalties (premature)"
          value={money(data.penaltyCollected)}
          detail="Collected on early closure"
          tone="red"
        />
      </div>
    </Surface>
  );
}
