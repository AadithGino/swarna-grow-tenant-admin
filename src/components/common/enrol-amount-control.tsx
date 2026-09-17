"use client";

import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  amountFieldLocked,
  amountUsesSlabs,
} from "@/src/lib/enrol-plan-rules";
import { money } from "@/src/lib/format";
import { cn } from "@/lib/utils";
import type { EnrolPlanRules } from "@/src/lib/enrol-plan-rules";

export function EnrolAmountControl({
  plan,
  amount,
  onAmountChange,
  invalid,
}: {
  plan?: EnrolPlanRules;
  amount: number;
  onAmountChange: (amount: number) => void;
  invalid?: boolean;
}) {
  const locked = amountFieldLocked(plan);
  const slabs = amountUsesSlabs(plan);

  return (
    <div>
      <FieldLabel>
        {plan?.paymentPattern === "FLEXIBLE_AVERAGE"
          ? "Reference payment amount"
          : "Installment amount"}
      </FieldLabel>
      {slabs ? (
        <Select
          value={String(amount)}
          onValueChange={(value) => onAmountChange(Number(value))}
        >
          <SelectTrigger
            className={cn(
              "h-11 w-full rounded-xl bg-[#faf7f5]",
              invalid && "border-red-600",
            )}
            aria-invalid={invalid}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(plan?.slabs ?? []).map((slab) => (
              <SelectItem key={slab} value={String(slab)}>
                {money(slab)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : locked ? (
        <div className="flex h-11 items-center justify-between rounded-xl border border-[#e3d5d0] bg-[#f5f0ed] px-4 text-sm font-semibold text-[#490b17]">
          <span>{money(amount)}</span>
          <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <Lock className="size-3.5" />
            Fixed by jeweller
          </span>
        </div>
      ) : (
        <Input
          type="number"
          className={cn(
            "h-11 rounded-xl bg-[#faf7f5]",
            invalid && "border-red-600",
          )}
          aria-invalid={invalid}
          value={amount}
          min={plan?.minAmount}
          max={plan?.maxAmount}
          step={plan?.amountStep ?? 1}
          onChange={(e) => onAmountChange(Number(e.target.value))}
        />
      )}
      {plan ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {plan.paymentPattern === "FLEXIBLE_AVERAGE"
            ? "Used to illustrate free-window contributions and capped-cycle limits. Payments in the free phase are optional."
            : plan.amountMode === "JEWELLER_FIXED"
              ? "This plan uses a fixed installment set by the jeweller."
              : plan.amountMode === "JEWELLER_SLABS"
                ? "Pick one of the allowed installment slabs."
                : [
                    plan.minAmount ? `Min ${money(plan.minAmount)}` : null,
                    plan.maxAmount ? `Max ${money(plan.maxAmount)}` : null,
                    plan.amountStep ? `Step ${money(plan.amountStep)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Amount must follow the plan rules."}
        </p>
      ) : null}
    </div>
  );
}
