"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import { idempotencyKey, money } from "@/src/lib/format";
import {
  useInitiatePaymentRefundMutation,
  useListPaymentRefundsQuery,
  useReconcilePaymentRefundMutation,
  useReleasePaymentRefundReservationMutation,
} from "@/src/store/api/admin-api";

export function PaymentRefundDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: {
    id: string;
    receiptNo: string;
    grossAmount?: number;
    refundedAmount?: number;
    netAmount?: number;
    amount: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const refundable = Math.max(
    0,
    Number(payment?.netAmount ?? payment?.amount ?? 0),
  );
  const [amount, setAmount] = useState(refundable);
  const [reason, setReason] = useState("");
  const [releaseTarget, setReleaseTarget] = useState<string | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [releaseEvidence, setReleaseEvidence] = useState("");
  const [providerConfirmed, setProviderConfirmed] = useState(false);
  const refunds = useListPaymentRefundsQuery(payment?.id ?? "", {
    skip: !open || !payment?.id,
  });
  const [initiate, initiateState] = useInitiatePaymentRefundMutation();
  const [reconcile, reconcileState] = useReconcilePaymentRefundMutation();
  const [releaseReservation, releaseState] =
    useReleasePaymentRefundReservationMutation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogBody className="space-y-5">
          <DialogHeader>
            <DialogTitle>PhonePe refund · {payment?.receiptNo}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Gross</p>
              <p className="font-semibold">{money(payment?.grossAmount ?? payment?.amount ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Already refunded</p>
              <p className="font-semibold">{money(payment?.refundedAmount ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="font-semibold">{money(refundable)}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Refund amount</FieldLabel>
              <Input
                type="number"
                min={0.01}
                max={refundable}
                step={0.01}
                value={amount || ""}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
            </div>
            <div>
              <FieldLabel>Reason</FieldLabel>
              <Textarea
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Required (minimum 3 characters)"
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Refund history</p>
            {refunds.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading refunds…</p>
            ) : (refunds.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No refunds initiated.</p>
            ) : (
              (refunds.data ?? []).map((refund) => (
                <div
                  key={String(refund._id ?? refund.id)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {money(Number(refund.amountPaise ?? 0) / 100)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {String(refund.reason ?? "—")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={String(refund.status ?? "PENDING")} />
                    {["PENDING", "PROCESSING", "MANUAL_REVIEW"].includes(
                      String(refund.status),
                    ) ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reconcileState.isLoading}
                          onClick={async () => {
                            try {
                              await reconcile({
                                paymentId: payment!.id,
                                refundId: String(refund._id ?? refund.id),
                                idempotencyKey: idempotencyKey(),
                              }).unwrap();
                              toast.success("Refund reconciliation completed");
                              await refunds.refetch();
                            } catch (error) {
                              toastApiError(error, "Could not reconcile refund");
                            }
                          }}
                        >
                          <RefreshCw className="size-3" /> Reconcile
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReleaseTarget(String(refund._id ?? refund.id));
                            setReleaseReason("");
                            setReleaseEvidence("");
                            setProviderConfirmed(false);
                          }}
                        >
                          Release reservation
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          {releaseTarget ? (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-950">Manual reservation release</p>
              <p className="text-xs text-amber-900">
                Use only after provider verification. This releases reserved refundable balance; it does not reverse accounting.
              </p>
              <Textarea
                value={releaseReason}
                onChange={(event) => setReleaseReason(event.target.value)}
                maxLength={500}
                placeholder="Reason (required)"
              />
              <Textarea
                value={releaseEvidence}
                onChange={(event) => setReleaseEvidence(event.target.value)}
                maxLength={2000}
                placeholder="Provider evidence or case reference"
              />
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={providerConfirmed}
                  onCheckedChange={(value) => setProviderConfirmed(value === true)}
                />
                PhonePe/provider confirmed the refund was not accepted
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setReleaseTarget(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={
                    releaseState.isLoading ||
                    releaseReason.trim().length < 3 ||
                    (providerConfirmed && releaseEvidence.trim().length < 10)
                  }
                  onClick={async () => {
                    try {
                      await releaseReservation({
                        paymentId: payment!.id,
                        refundId: releaseTarget,
                        reason: releaseReason.trim(),
                        ...(releaseEvidence.trim()
                          ? { evidence: releaseEvidence.trim() }
                          : {}),
                        providerConfirmedNotAccepted: providerConfirmed,
                        idempotencyKey: idempotencyKey(),
                      }).unwrap();
                      toast.success("Refund reservation released");
                      setReleaseTarget(null);
                      await refunds.refetch();
                    } catch (error) {
                      toastApiError(error, "Could not release refund reservation");
                    }
                  }}
                >
                  Release
                </Button>
              </div>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={
              initiateState.isLoading ||
              amount <= 0 ||
              amount > refundable ||
              reason.trim().length < 3
            }
            onClick={async () => {
              if (!payment) return;
              try {
                await initiate({
                  paymentId: payment.id,
                  amountPaise: Math.round(amount * 100),
                  reason: reason.trim(),
                  idempotencyKey: idempotencyKey(),
                }).unwrap();
                toast.success("Refund submitted to PhonePe");
                setReason("");
                await refunds.refetch();
              } catch (error) {
                toastApiError(error, "Could not initiate refund");
              }
            }}
          >
            {initiateState.isLoading ? <Loader2 className="animate-spin" /> : null}
            Initiate refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
