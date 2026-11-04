"use client";

import { Banknote, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useRecordDigitalMetalsSellCashPayoutMutation } from "@/src/store/api/admin-api";
import { dmInr } from "@/src/features/digital-metals/digital-metals-admin-ui";

/** "Paid ₹X in cash" for an accepted counter sell whose payout is cash and still open. */
export function SellCashPayoutButton({ row }: { row: Record<string, unknown> }) {
  const [payCash, state] = useRecordDigitalMetalsSellCashPayoutMutation();
  const payable = row.payable as { status?: string } | undefined;
  const due = row.payoutMethod === "CASH" && row.status === "PAYABLE_OPEN" && payable?.status !== "SETTLED";
  if (row.payoutMethod !== "CASH") return null;
  if (!due) {
    return row.status === "PAYABLE_OPEN" ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <Banknote className="size-3.5" aria-hidden />
        Cash paid
      </span>
    ) : null;
  }
  const amount = Number(row.settlementPaise ?? 0);
  return (
    <Button
      size="sm"
      className="w-full sm:w-auto"
      disabled={state.isLoading}
      onClick={async () => {
        try {
          await payCash({ orderId: String(row.id), idempotencyKey: newIdempotencyKey() }).unwrap();
          toast.success(`${dmInr(amount)} recorded as paid in cash`);
        } catch (err) {
          toastApiError(err, "Could not record the cash payout");
        }
      }}
    >
      {state.isLoading ? <Loader2 className="animate-spin" /> : <Banknote />}
      Paid {dmInr(amount)} in cash
    </Button>
  );
}
