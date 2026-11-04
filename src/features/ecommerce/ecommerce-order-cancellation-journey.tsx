"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { EcommerceOrderFinancialReviewDialog } from "@/src/features/ecommerce/ecommerce-order-financial-review-dialog";
import { formatOrderInr } from "@/src/features/ecommerce/ecommerce-order-ui";
import {
  cancelStockDispositionError,
  cancelStockDispositionRequired,
  type EcommerceCancelStockDispositionChoice,
} from "@/src/lib/ecommerce-order-stock-disposition";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { toastApiError } from "@/src/lib/api-error";
import type { EcommerceOrderDetail } from "@/src/types/ecommerce-order";
import type {
  EcommerceOrderCancellationRequest,
  EcommerceOrderCancellationView,
} from "@/src/types/ecommerce-cancellation";
import type {
  ApiMutationTrigger,
  DecideEcommerceOrderCancellationArg,
  InitiateEcommerceOrderCancellationArg,
  RecordEcommerceCodCancellationManualRefundArg,
} from "@/src/types/ecommerce-admin-mutations";

function refundConsequence(order: EcommerceOrderDetail): string {
  const method = String(order.paymentMethod ?? "ONLINE");
  const paid = Boolean(order.paidAt || order.successfulPaymentAttemptId);
  if (method === "COD") {
    return paid
      ? "If courier cash was collected, record a manual customer refund after approval — separate from courier remittance."
      : "No customer refund while COD is still uncollected; stock outcome still applies on approval.";
  }
  if (paid) {
    return "On approval, an online refund case opens against the captured payment — initiate or record from the Payments tab.";
  }
  return "No payment capture to refund; cancelling releases the order without a refund obligation.";
}

function stockConsequence(choice: EcommerceCancelStockDispositionChoice): string {
  if (choice === "RESTOCK_CONFIRMED") return "Inventory returns to available stock when cancellation completes.";
  if (choice === "STOCK_EXCEPTION") return "Inventory stays consumed — use when stock cannot be put back.";
  return "Choose a stock outcome before approving or initiating staff cancellation.";
}

export function EcommerceOrderCancellationJourney({
  order,
  cancellationView,
  canOperate,
  onRefresh,
  decideCancellation,
  decideLoading,
  initiateCancellation,
  initiateLoading,
  recordCodRefund,
  recordCodLoading,
}: {
  order: EcommerceOrderDetail;
  cancellationView: EcommerceOrderCancellationView | undefined;
  canOperate: boolean;
  onRefresh: () => void;
  decideCancellation: ApiMutationTrigger<DecideEcommerceOrderCancellationArg>;
  decideLoading: boolean;
  initiateCancellation: ApiMutationTrigger<InitiateEcommerceOrderCancellationArg>;
  initiateLoading: boolean;
  recordCodRefund: ApiMutationTrigger<RecordEcommerceCodCancellationManualRefundArg>;
  recordCodLoading: boolean;
}) {
  const activeCancellation = cancellationView?.activeRequest ?? null;
  const cancelCapabilities = cancellationView?.capabilities;
  const [stockDisposition, setStockDisposition] = useState<EcommerceCancelStockDispositionChoice>("");
  const [rejectDecisionReason, setRejectDecisionReason] = useState("");
  const [adminCancelReason, setAdminCancelReason] = useState("");
  const [approveReviewOpen, setApproveReviewOpen] = useState(false);
  const [initiateReviewOpen, setInitiateReviewOpen] = useState(false);
  const [codCancelRefundReviewOpen, setCodCancelRefundReviewOpen] = useState(false);
  const [codRefundRecipient, setCodRefundRecipient] = useState("");
  const [codRefundMethod, setCodRefundMethod] = useState("");
  const [codRefundReference, setCodRefundReference] = useState("");
  const [codRefundProofNote, setCodRefundProofNote] = useState("");

  const stockDispositionValid = cancelStockDispositionRequired(stockDisposition);
  const stockDispositionHint = cancelStockDispositionError(stockDisposition);
  const codRefundAmountPaise = Number(order.totalPaise ?? 0);
  const codRefundFormValid =
    codRefundRecipient.trim().length >= 2
    && codRefundMethod.trim().length >= 2
    && codRefundReference.trim().length >= 2
    && codRefundProofNote.trim().length >= 8;

  const reviewSummary = useMemo(
    () => ({
      refund: refundConsequence(order),
      stock: stockConsequence(stockDisposition),
      amount: formatOrderInr(codRefundAmountPaise),
    }),
    [order, stockDisposition, codRefundAmountPaise],
  );

  const pendingApprove =
    activeCancellation && String(activeCancellation.status) === "PENDING_DECISION";

  return (
    <div className="space-y-4 p-5 text-sm" data-testid="ecommerce-cancellation-journey">
      <Notice tone="amber">
        <strong>Step 1 — Review</strong> refund and stock consequences. <strong>Step 2 — Confirm</strong>{" "}
        to approve, reject, or staff-initiate cancellation.
      </Notice>

      <div className="rounded-xl border border-[#eaded9] bg-[#faf7f5] p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">Refund consequence</p>
        <p className="text-[#28161a]">{reviewSummary.refund}</p>
        <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a] pt-2">Stock consequence</p>
        <p className="text-[#28161a]">{reviewSummary.stock}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3">
        <Label htmlFor="cancel-stock-disposition" className="shrink-0 text-muted-foreground">
          Stock on approval
        </Label>
        <Select
          value={stockDisposition || undefined}
          onValueChange={(value) => setStockDisposition(value as EcommerceCancelStockDispositionChoice)}
        >
          <SelectTrigger id="cancel-stock-disposition" className="w-[240px]" aria-required>
            <SelectValue placeholder="Choose stock outcome…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RESTOCK_CONFIRMED">Restock confirmed</SelectItem>
            <SelectItem value="STOCK_EXCEPTION">Stock exception (no restock)</SelectItem>
          </SelectContent>
        </Select>
        {stockDispositionHint ? <p className="text-xs text-amber-800">{stockDispositionHint}</p> : null}
      </div>

      {activeCancellation ? (
        <ActiveCancellationBlock
          activeCancellation={activeCancellation}
          canOperate={canOperate}
          pendingApprove={Boolean(pendingApprove)}
          stockDispositionValid={stockDispositionValid}
          rejectDecisionReason={rejectDecisionReason}
          setRejectDecisionReason={setRejectDecisionReason}
          decideLoading={decideLoading}
          onReject={() =>
            void decideCancellation({
              orderId: order.id,
              decision: "REJECT",
              expectedVersion: Number(activeCancellation.version ?? 1),
              decisionReason: rejectDecisionReason.trim(),
            })
              .unwrap()
              .then(() => {
                toast.success("Request rejected");
                setRejectDecisionReason("");
                onRefresh();
              })
              .catch(toastApiError)
          }
          onOpenApproveReview={() => setApproveReviewOpen(true)}
          codRefundBlock={
            order.paymentMethod === "COD"
            && ["APPROVED_PROCESSING", "COMPLETED"].includes(String(activeCancellation.status ?? ""))
            && !activeCancellation.codManualRefund ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={recordCodLoading || !codRefundFormValid}
                  onClick={() => setCodCancelRefundReviewOpen(true)}
                >
                  Record COD cancellation refund…
                </Button>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Recipient" value={codRefundRecipient} onChange={(e) => setCodRefundRecipient(e.target.value)} />
                  <Input placeholder="Method (NEFT/UPI)" value={codRefundMethod} onChange={(e) => setCodRefundMethod(e.target.value)} />
                  <Input placeholder="Reference / UTR" value={codRefundReference} onChange={(e) => setCodRefundReference(e.target.value)} />
                  <Input placeholder="Proof note (min 8 chars)" value={codRefundProofNote} onChange={(e) => setCodRefundProofNote(e.target.value)} />
                </div>
              </>
            ) : activeCancellation.codManualRefund ? (
              <p className="text-xs text-muted-foreground">COD cancellation refund recorded.</p>
            ) : null
          }
        />
      ) : (
        <p className="text-muted-foreground">No open cancellation request.</p>
      )}

      {cancelCapabilities?.adminCancelAllowed && canOperate ? (
        <div className="space-y-2 border-t pt-4">
          <p className="font-medium">Staff-initiated cancellation</p>
          <Textarea
            value={adminCancelReason}
            onChange={(e) => setAdminCancelReason(e.target.value)}
            placeholder="Staff cancellation reason (min 8 chars)"
            rows={3}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={initiateLoading || !stockDispositionValid || adminCancelReason.trim().length < 8}
            onClick={() => setInitiateReviewOpen(true)}
          >
            Review & initiate cancellation…
          </Button>
        </div>
      ) : null}

      <EcommerceOrderFinancialReviewDialog
        open={approveReviewOpen}
        onOpenChange={setApproveReviewOpen}
        title="Confirm cancellation approval"
        amountPaise={codRefundAmountPaise}
        consequence={`${reviewSummary.refund} ${reviewSummary.stock}`}
        permissionNote="Requires fulfilment permission."
        actionLabel="Approve cancellation"
        submitDisabled={!stockDispositionValid}
        onConfirm={async () => {
          if (!activeCancellation) return;
          await decideCancellation({
            orderId: order.id,
            decision: "APPROVE",
            expectedVersion: Number(activeCancellation.version ?? 1),
            stockDisposition: stockDisposition as "RESTOCK_CONFIRMED" | "STOCK_EXCEPTION",
          }).unwrap();
          toast.success("Cancellation approved");
          setApproveReviewOpen(false);
          onRefresh();
        }}
      />

      <EcommerceOrderFinancialReviewDialog
        open={initiateReviewOpen}
        onOpenChange={setInitiateReviewOpen}
        title="Confirm staff cancellation"
        amountPaise={codRefundAmountPaise}
        consequence={`${reviewSummary.refund} ${reviewSummary.stock}`}
        permissionNote="Requires fulfilment permission."
        actionLabel="Initiate cancellation"
        submitDisabled={!stockDispositionValid || adminCancelReason.trim().length < 8}
        onConfirm={async () => {
          await initiateCancellation({
            orderId: order.id,
            reason: adminCancelReason.trim(),
            expectedVersion: Number(order.version ?? 1),
            idempotencyKey: newIdempotencyKey(),
            stockDisposition: stockDisposition as "RESTOCK_CONFIRMED" | "STOCK_EXCEPTION",
          }).unwrap();
          toast.success("Cancellation initiated");
          setInitiateReviewOpen(false);
          onRefresh();
        }}
      />

      <EcommerceOrderFinancialReviewDialog
        open={codCancelRefundReviewOpen}
        onOpenChange={setCodCancelRefundReviewOpen}
        title="Record COD cancellation refund"
        amountPaise={codRefundAmountPaise}
        recipient={codRefundRecipient.trim()}
        consequence="Records actual refund paid to the customer (UTR/proof). Separate from courier remittance."
        permissionNote="Requires refund permission."
        actionLabel="Record refund"
        submitDisabled={!codRefundFormValid}
        onConfirm={async () => {
          await recordCodRefund({
            orderId: order.id,
            idempotencyKey: newIdempotencyKey(),
            amountPaise: codRefundAmountPaise,
            recipient: codRefundRecipient.trim(),
            method: codRefundMethod.trim(),
            reference: codRefundReference.trim(),
            proofNote: codRefundProofNote.trim(),
          }).unwrap();
          toast.success("COD cancellation refund recorded");
          setCodCancelRefundReviewOpen(false);
          onRefresh();
        }}
      />
    </div>
  );
}

function ActiveCancellationBlock({
  activeCancellation,
  canOperate,
  pendingApprove,
  stockDispositionValid,
  rejectDecisionReason,
  setRejectDecisionReason,
  decideLoading,
  onReject,
  onOpenApproveReview,
  codRefundBlock,
}: {
  activeCancellation: EcommerceOrderCancellationRequest;
  canOperate: boolean;
  pendingApprove: boolean;
  stockDispositionValid: boolean;
  rejectDecisionReason: string;
  setRejectDecisionReason: (v: string) => void;
  decideLoading: boolean;
  onReject: () => void;
  onOpenApproveReview: () => void;
  codRefundBlock: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="font-semibold">
        Active request · {String(activeCancellation.status ?? "")}
      </p>
      <p className="mt-1 text-muted-foreground">{String(activeCancellation.reason ?? "")}</p>
      {activeCancellation.onlineRefundId ? (
        <p className="mt-2 text-xs font-mono">Online refund case: {String(activeCancellation.onlineRefundId)}</p>
      ) : null}
      {pendingApprove && canOperate ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={decideLoading || !stockDispositionValid}
              onClick={onOpenApproveReview}
            >
              Review & approve…
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={decideLoading || rejectDecisionReason.trim().length < 8}
              onClick={onReject}
            >
              Reject
            </Button>
          </div>
          <Textarea
            placeholder="Rejection reason (required to reject, min 8 characters)"
            value={rejectDecisionReason}
            onChange={(e) => setRejectDecisionReason(e.target.value)}
            rows={2}
            className="max-w-md text-xs"
          />
        </div>
      ) : null}
      {codRefundBlock ? <div className="mt-3 space-y-2 rounded-md border border-dashed p-3">{codRefundBlock}</div> : null}
    </div>
  );
}
