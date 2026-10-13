"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Surface } from "@/src/components/common/page-parts";
import { EcommerceOrderFinancialReviewDialog } from "@/src/features/ecommerce/ecommerce-order-financial-review-dialog";
import { formatOrderInr } from "@/src/features/ecommerce/ecommerce-order-ui";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import type { EcommerceCourierCodBlock, EcommerceOrderDetail } from "@/src/types/ecommerce-order";
import { useConfirmEcommerceCourierCodCollectionMutation } from "@/src/store/api/admin-api";

function statusChip(label: string, tone: "muted" | "warn" | "ok" | "danger" = "muted") {
  const cls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-900"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900"
        : tone === "danger"
          ? "bg-red-50 text-red-900"
          : "bg-muted/60 text-muted-foreground";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  );
}

export function EcommerceCourierCodOrderPanel({
  order,
  canFulfilmentOperate,
  onRefresh,
}: {
  order: EcommerceOrderDetail;
  canFulfilmentOperate: boolean;
  onRefresh: () => void;
}) {
  const courier = order.courierCod ?? null;
  const [reference, setReference] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [trackingReference, setTrackingReference] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmCollection, confirmState] = useConfirmEcommerceCourierCodCollectionMutation();

  if (order.paymentMethod !== "COD") return null;

  const fulfilmentOk = ["PROCESSING", "SHIPPED", "DELIVERED"].includes(String(order.status ?? ""));
  const canConfirm =
    canFulfilmentOperate
    && fulfilmentOk
    && courier?.collectionStatus === "PENDING";

  return (
    <Surface title="Courier COD (delivery collection → bank remittance)">
      <div className="space-y-4 p-6 text-sm">
        <p className="text-muted-foreground">
          Third-party courier collects from the customer. This is not staff cash-in-hand. Live courier
          integration is pending — use manual courier POD evidence until a provider is connected.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Delivery proof</p>
            <p className="font-medium">
              {order.fulfilmentHandover?.recordedAt
                ? `Recorded · ${order.fulfilmentHandover.deliveryProofReference ?? "POD"}`
                : "Not recorded yet"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Courier collection</p>
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {courier?.collectionStatus ?? "PENDING"}
              {courier?.collectionStatus === "CONFIRMED"
                ? statusChip(courier.collectionSourceLabel ?? "Confirmed", "ok")
                : statusChip("Awaiting confirmation", "warn")}
            </p>
            {courier?.collectionReference ? (
              <p className="text-xs text-muted-foreground">Ref: {courier.collectionReference}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remittance</p>
            <p className="font-medium">{courier?.remittanceStatus ?? "NOT_DUE"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bank reconciliation</p>
            <p className="font-medium">
              {courier?.bankCreditReference
                ? `${courier.bankCreditReference} · ${courier.reconciliationStatus ?? "—"}`
                : "Not reconciled"}
            </p>
            {courier?.reconciliationDiscrepancyPaise ? (
              <p className="text-xs text-red-700">
                Discrepancy {formatOrderInr(courier.reconciliationDiscrepancyPaise)}
              </p>
            ) : null}
          </div>
        </div>

        {canConfirm ? (
          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="space-y-1">
              <Label htmlFor="courier-ref">Courier collection reference</Label>
              <Input
                id="courier-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="POD / courier receipt id"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="courier-track">Tracking ref (optional)</Label>
              <Input
                id="courier-track"
                value={trackingReference}
                onChange={(e) => setTrackingReference(e.target.value)}
              />
            </div>
            <div className="min-w-[200px] flex-1 space-y-1">
              <Label htmlFor="courier-note">Evidence note</Label>
              <Textarea
                id="courier-note"
                rows={2}
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                placeholder="Statement line, POD scan id, operator note…"
              />
            </div>
            <Button
              type="button"
              disabled={confirmState.isLoading || reference.trim().length < 2}
              onClick={() => setReviewOpen(true)}
            >
              Confirm courier collection…
            </Button>
            <EcommerceOrderFinancialReviewDialog
              open={reviewOpen}
              onOpenChange={setReviewOpen}
              title="Confirm courier COD collection"
              amountPaise={Number(order.totalPaise ?? 0)}
              recipient="Customer (courier collected)"
              consequence="Records courier-reported collection only. Does not mark bank remittance or staff cash."
              permissionNote="Requires ecommerce fulfilment permission."
              actionLabel="Confirm courier collection"
              submitDisabled={reference.trim().length < 2}
              onConfirm={async () => {
                await confirmCollection({
                  orderId: order.id,
                  expectedVersion: Number(order.version ?? 1),
                  reference: reference.trim(),
                  evidenceNote: evidenceNote.trim() || undefined,
                  trackingReference: trackingReference.trim() || undefined,
                  idempotencyKey: newIdempotencyKey(),
                }).unwrap();
                toast.success("Courier collection confirmed");
                setReference("");
                setEvidenceNote("");
                setTrackingReference("");
                setReviewOpen(false);
                onRefresh();
              }}
            />
          </div>
        ) : null}
      </div>
    </Surface>
  );
}

export function courierCodQueueHint(courier: EcommerceCourierCodBlock | null | undefined) {
  if (!courier) return null;
  if (courier.collectionStatus === "PENDING") return "awaiting_collection";
  if (courier.collectionStatus === "CONFIRMED" && courier.remittanceStatus === "OWED") return "awaiting_remittance";
  if (courier.remittanceStatus === "DISCREPANCY") return "reconciliation_exception";
  if (courier.remittanceStatus === "BANK_RECONCILED") return "settled";
  return null;
}
