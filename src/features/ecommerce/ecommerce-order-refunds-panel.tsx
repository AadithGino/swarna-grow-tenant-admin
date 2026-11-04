"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/src/components/common/status-badge";
import { EcommerceOrderFinancialReviewDialog } from "@/src/features/ecommerce/ecommerce-order-financial-review-dialog";
import { formatOrderInr, OrderPaymentAttemptsList } from "@/src/features/ecommerce/ecommerce-order-ui";
import type { EcommerceOrderDetail, EcommerceOrderPaymentExceptionRefund } from "@/src/types/ecommerce-order";

const TERMINAL_REFUND = new Set(["SUCCEEDED", "COMPLETED", "MANUAL_RECORDED", "CLOSED"]);

export function EcommerceOrderRefundsPanel({
  order,
  refundRow,
  attempts,
  paymentExceptionStatus,
  canRefundOperate,
  canPaymentOperate,
  manualRef,
  setManualRef,
  manualReason,
  setManualReason,
  manualEvidence,
  setManualEvidence,
  manualRefundReviewOpen,
  setManualRefundReviewOpen,
  onInitiateRefund,
  initiateRefundLoading,
  onRecordManual,
  recordManualLoading,
  stuckAttempt,
  reconcileReason,
  setReconcileReason,
  onRetryReconcile,
  retryReconcileLoading,
}: {
  order: EcommerceOrderDetail;
  refundRow: EcommerceOrderPaymentExceptionRefund | null;
  attempts: Record<string, unknown>[];
  paymentExceptionStatus?: string | null;
  canRefundOperate: boolean;
  canPaymentOperate: boolean;
  manualRef: string;
  setManualRef: (v: string) => void;
  manualReason: string;
  setManualReason: (v: string) => void;
  manualEvidence: string;
  setManualEvidence: (v: string) => void;
  manualRefundReviewOpen: boolean;
  setManualRefundReviewOpen: (v: boolean) => void;
  onInitiateRefund: () => void;
  initiateRefundLoading: boolean;
  onRecordManual: () => Promise<void>;
  recordManualLoading: boolean;
  stuckAttempt: Record<string, unknown> | null;
  reconcileReason: string;
  setReconcileReason: (v: string) => void;
  onRetryReconcile: () => void;
  retryReconcileLoading: boolean;
}) {
  const refundStatus = refundRow?.status ? String(refundRow.status) : null;
  const refundPending = refundStatus && !TERMINAL_REFUND.has(refundStatus);
  const captureObligation =
    paymentExceptionStatus || refundRow
      ? {
          label: paymentExceptionStatus
            ? `Payment exception: ${String(paymentExceptionStatus).replaceAll("_", " ").toLowerCase()}`
            : "Exception refund case",
          amountPaise: Number(refundRow?.amountPaise ?? order.totalPaise ?? 0),
          refundCaseId: refundRow?.id ?? null,
          providerRefundId: refundRow?.providerRefundId ?? null,
        }
      : null;

  return (
    <div className="space-y-5" data-testid="ecommerce-order-refunds-panel">
      {captureObligation ? (
        <div className="rounded-xl border border-[#eaded9] bg-[#fffdf8] p-5 text-sm space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">Capture obligation</p>
          <p className="font-medium text-[#28161a]">{captureObligation.label}</p>
          <p className="tabular-nums font-bold">{formatOrderInr(captureObligation.amountPaise)}</p>
          {captureObligation.refundCaseId ? (
            <p className="text-xs font-mono">Refund case: {String(captureObligation.refundCaseId)}</p>
          ) : null}
          {refundStatus ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Outcome:</span>
              <StatusBadge status={refundStatus} />
              {refundPending ? (
                <span className="text-xs text-amber-800">Refund still pending — initiate provider or record manual proof.</span>
              ) : (
                <span className="text-xs text-emerald-800">Refund completed or manually closed.</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-amber-800">No refund case row yet — create by initiating refund below.</p>
          )}
          {captureObligation.providerRefundId ? (
            <p className="font-mono text-xs">Provider ref: {String(captureObligation.providerRefundId)}</p>
          ) : null}
          {canRefundOperate ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" size="sm" disabled={initiateRefundLoading} onClick={() => void onInitiateRefund()}>
                Initiate provider refund
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={recordManualLoading}
                onClick={() => setManualRefundReviewOpen(true)}
              >
                Record manual refund…
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {canRefundOperate && captureObligation ? (
        <div className="rounded-lg border border-dashed p-4 space-y-2 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Manual resolution (separate from provider capture)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="manual-ref">Provider reference</Label>
              <Input id="manual-ref" value={manualRef} onChange={(e) => setManualRef(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="manual-reason">Reason</Label>
              <Input id="manual-reason" value={manualReason} onChange={(e) => setManualReason(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="manual-evidence">Evidence note</Label>
            <Input id="manual-evidence" value={manualEvidence} onChange={(e) => setManualEvidence(e.target.value)} />
          </div>
        </div>
      ) : null}

      <EcommerceOrderFinancialReviewDialog
        open={manualRefundReviewOpen}
        onOpenChange={setManualRefundReviewOpen}
        title="Record manual payment exception refund"
        amountPaise={Number(order.totalPaise ?? 0)}
        consequence="Closes the exception with manual proof. Do not use if provider refund already succeeded."
        permissionNote="Requires ecommerce refund permission."
        actionLabel="Record manual refund"
        onConfirm={async () => {
          await onRecordManual();
          setManualRefundReviewOpen(false);
        }}
      />

      {stuckAttempt && canPaymentOperate ? (
        <div className="rounded-lg border p-4 text-sm space-y-2">
          <p className="font-medium">Stuck capture — reconcile before refund</p>
          <p>
            Attempt {String(stuckAttempt.id ?? stuckAttempt._id)} ·{" "}
            {String(stuckAttempt.operationalStatus ?? "")}
          </p>
          <div>
            <Label htmlFor="reconcile-reason">Reason for retry</Label>
            <Input
              id="reconcile-reason"
              value={reconcileReason}
              onChange={(e) => setReconcileReason(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={retryReconcileLoading || reconcileReason.trim().length < 8}
            onClick={() => void onRetryReconcile()}
          >
            Safe reconcile retry
          </Button>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-semibold">Payment attempts</p>
        <OrderPaymentAttemptsList items={attempts} />
      </div>
    </div>
  );
}
