"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";
import type { EcommerceOrderDetail, EcommerceOrderReturnSummary } from "@/src/types/ecommerce-order";
import type {
  ApiMutationTrigger,
  CreateEcommerceReturnRefundCaseArg,
  DecideEcommerceReturnRequestArg,
  RecordEcommerceReturnInspectionArg,
  RecordEcommerceReturnReceivedArg,
  ResolveEcommerceReturnRequestArg,
} from "@/src/types/ecommerce-admin-mutations";
import { toastApiError } from "@/src/lib/api-error";

type StepId = "approve" | "receive" | "inspect" | "refund" | "resolve";

function stepIndex(status: string): number {
  if (status === "PENDING_REVIEW") return 0;
  if (status === "APPROVED") return 1;
  if (status === "RECEIVED") return 2;
  if (status === "INSPECTED") return 3;
  if (["RESOLVED", "REJECTED", "WITHDRAWN"].includes(status)) return 4;
  return 0;
}

const STEPS: { id: StepId; label: string; help: string }[] = [
  { id: "approve", label: "Approve or reject", help: "Decide whether the return/exchange is accepted." },
  { id: "receive", label: "Receive & inspect", help: "Confirm the parcel arrived, then inspect for resale." },
  { id: "inspect", label: "Inspection outcome", help: "Restock only when approved for resale." },
  { id: "refund", label: "Refund or exchange", help: "Open refund case or record manual proof; exchange links a replacement order." },
  { id: "resolve", label: "Close request", help: "Mark resolved once stock and money outcomes are recorded." },
];

export function EcommerceOrderReturnJourney({
  order,
  orderReturn,
  canFulfilmentOperate,
  canRefundOperate,
  onRefresh,
  decideReturn,
  recordReturnReceived,
  recordReturnInspection,
  createReturnRefundCase,
  createReturnRefundCaseLoading,
  resolveReturn,
  returnDecisionReason,
  setReturnDecisionReason,
  inspectionNote,
  setInspectionNote,
  resolutionNote,
  setResolutionNote,
  replacementOrderId,
  setReplacementOrderId,
  codRefundFields,
}: {
  order: EcommerceOrderDetail;
  orderReturn: EcommerceOrderReturnSummary;
  canFulfilmentOperate: boolean;
  canRefundOperate: boolean;
  onRefresh: () => void;
  decideReturn: ApiMutationTrigger<DecideEcommerceReturnRequestArg>;
  recordReturnReceived: ApiMutationTrigger<RecordEcommerceReturnReceivedArg>;
  recordReturnInspection: ApiMutationTrigger<RecordEcommerceReturnInspectionArg>;
  createReturnRefundCase: ApiMutationTrigger<CreateEcommerceReturnRefundCaseArg>;
  createReturnRefundCaseLoading: boolean;
  resolveReturn: ApiMutationTrigger<ResolveEcommerceReturnRequestArg>;
  returnDecisionReason: string;
  setReturnDecisionReason: (v: string) => void;
  inspectionNote: string;
  setInspectionNote: (v: string) => void;
  resolutionNote: string;
  setResolutionNote: (v: string) => void;
  replacementOrderId: string;
  setReplacementOrderId: (v: string) => void;
  codRefundFields: React.ReactNode;
}) {
  const status = String(orderReturn.status ?? "");
  const current = stepIndex(status);

  return (
    <div className="space-y-4 p-5 text-sm" data-testid="ecommerce-return-journey">
      <ol className="grid gap-2 sm:grid-cols-5">
        {STEPS.map((step, idx) => {
          const done = idx < current || status === "RESOLVED";
          const active = idx === current;
          return (
            <li
              key={step.id}
              className={cn(
                "rounded-lg border px-2 py-2 text-xs",
                done && "border-emerald-200 bg-emerald-50/80",
                active && !done && "border-[#8e1a36] bg-[#fff8f6]",
                !done && !active && "border-[#eaded9] bg-white opacity-80",
              )}
            >
              <div className="flex items-center gap-1.5 font-semibold text-[#28161a]">
                {done ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : <Circle className="size-3.5" />}
                {step.label}
              </div>
              <p className="mt-1 leading-snug text-muted-foreground">{step.help}</p>
            </li>
          );
        })}
      </ol>

      <p>
        Status: <strong>{status}</strong> · {String(orderReturn.kind ?? "RETURN")}
      </p>
      <p className="text-muted-foreground">{String(orderReturn.reason ?? "")}</p>

      {canFulfilmentOperate && status === "PENDING_REVIEW" ? (
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <Input
            className="max-w-md"
            placeholder="Decision note (optional)"
            value={returnDecisionReason}
            onChange={(e) => setReturnDecisionReason(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            onClick={() =>
              void decideReturn({
                returnRequestId: String(orderReturn.id),
                decision: "APPROVE",
                expectedVersion: Number(orderReturn.version ?? 1),
                decisionReason: returnDecisionReason.trim() || undefined,
              })
                .unwrap()
                .then(() => {
                  toast.success("Return approved — record receipt when the parcel arrives");
                  onRefresh();
                })
                .catch(toastApiError)
            }
          >
            Approve return
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              void decideReturn({
                returnRequestId: String(orderReturn.id),
                decision: "REJECT",
                expectedVersion: Number(orderReturn.version ?? 1),
                decisionReason: returnDecisionReason.trim() || undefined,
              })
                .unwrap()
                .then(() => {
                  toast.success("Return rejected");
                  onRefresh();
                })
                .catch(toastApiError)
            }
          >
            Reject
          </Button>
        </div>
      ) : null}

      {canFulfilmentOperate && status === "APPROVED" ? (
        <Button
          type="button"
          size="sm"
          className="border-t pt-3"
          onClick={() =>
            void recordReturnReceived({
              returnRequestId: String(orderReturn.id),
              expectedVersion: Number(orderReturn.version ?? 1),
            })
              .unwrap()
              .then(() => {
                toast.success("Parcel receipt recorded — inspect next");
                onRefresh();
              })
              .catch(toastApiError)
          }
        >
          Confirm physical return received
        </Button>
      ) : null}

      {canFulfilmentOperate && status === "RECEIVED" ? (
        <div className="flex flex-col gap-2 border-t pt-3">
          <Textarea
            rows={2}
            className="max-w-md"
            placeholder="Inspection note"
            value={inspectionNote}
            onChange={(e) => setInspectionNote(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                void recordReturnInspection({
                  returnRequestId: String(orderReturn.id),
                  expectedVersion: Number(orderReturn.version ?? 1),
                  inspectionNote: inspectionNote.trim(),
                  inspectionOutcome: "APPROVED_FOR_RESALE",
                  confirmRestockInventory: true,
                })
                  .unwrap()
                  .then(() => {
                    toast.success("Approved for resale — complete refund/exchange next");
                    onRefresh();
                  })
                  .catch(toastApiError)
              }
            >
              Approve for resale + restock
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void recordReturnInspection({
                  returnRequestId: String(orderReturn.id),
                  expectedVersion: Number(orderReturn.version ?? 1),
                  inspectionNote: inspectionNote.trim(),
                  inspectionOutcome: "REJECTED_NOT_RESALABLE",
                })
                  .unwrap()
                  .then(() => {
                    toast.success("Inspection recorded — not restocked");
                    onRefresh();
                  })
                  .catch(toastApiError)
              }
            >
              Reject for resale
            </Button>
          </div>
        </div>
      ) : null}

      {canFulfilmentOperate && status === "INSPECTED" ? (
        <div className="space-y-3 border-t pt-3">
          {orderReturn.kind === "RETURN" && orderReturn.refundEntitlementPaise !== 0 && canRefundOperate ? (
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <p className="text-xs text-muted-foreground">
                Refund obligations stay separate from resolution. Online: refund case per capture. COD: manual proof once.
              </p>
              {orderReturn.onlineRefundId ? (
                <p className="text-xs font-mono text-amber-900">
                  Pending/completed capture refund: {String(orderReturn.onlineRefundId)}
                </p>
              ) : orderReturn.manualRefundRecordedAt ? (
                <p className="text-xs text-emerald-800">Manual return refund completed.</p>
              ) : order.paymentMethod === "COD" ? (
                codRefundFields
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={createReturnRefundCaseLoading}
                  onClick={() =>
                    void createReturnRefundCase({
                      returnRequestId: String(orderReturn.id),
                      expectedVersion: Number(orderReturn.version ?? 1),
                    })
                      .unwrap()
                      .then((res) => {
                        toast.success(
                          (res as { created?: boolean }).created === false
                            ? "Refund case already exists"
                            : "Return refund case created — use Payments tab to initiate capture refund",
                        );
                        onRefresh();
                      })
                      .catch(toastApiError)
                  }
                >
                  Open return refund case
                </Button>
              )}
            </div>
          ) : null}
          <Textarea
            rows={2}
            placeholder="Resolution summary"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />
          <Input
            placeholder="Linked replacement order ID (exchange, optional)"
            value={replacementOrderId}
            onChange={(e) => setReplacementOrderId(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            onClick={() =>
              void resolveReturn({
                returnRequestId: String(orderReturn.id),
                expectedVersion: Number(orderReturn.version ?? 1),
                resolutionNote: resolutionNote.trim(),
                replacementOrderId: replacementOrderId.trim() || undefined,
              })
                .unwrap()
                .then(() => {
                  toast.success("Return resolved");
                  onRefresh();
                })
                .catch(toastApiError)
            }
          >
            Mark resolved
          </Button>
        </div>
      ) : null}
    </div>
  );
}
