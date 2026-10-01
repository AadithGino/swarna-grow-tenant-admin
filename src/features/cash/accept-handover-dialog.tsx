"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import { toastApiError } from "@/src/lib/api-error";
import {
  HANDOVER_REMARKS_MAX,
  liveHandoverRejectReasonError,
  liveHandoverRemarksError,
  validateHandoverAcceptedAmount,
  validateHandoverRejectReason,
  validateHandoverRemarks,
} from "@/src/lib/cash-handover-form-validation";
import { money } from "@/src/lib/format";
import {
  useAcceptHandoverMutation,
  useRejectHandoverMutation,
  useResolveHandoverDiscrepancyMutation,
} from "@/src/store/api/admin-api";
import { cn } from "@/lib/utils";

export function AcceptHandoverDialog({
  handover,
  open,
  onOpenChange,
}: {
  handover: {
    id: string;
    handoverNo: string;
    amount: number;
    status: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [acceptedRupee, setAcceptedRupee] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [remarksTouched, setRemarksTouched] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [accept, acceptState] = useAcceptHandoverMutation();
  const [reject, rejectState] = useRejectHandoverMutation();
  const [resolve, resolveState] = useResolveHandoverDiscrepancyMutation();

  const busy =
    acceptState.isLoading || rejectState.isLoading || resolveState.isLoading;

  const handoverSeed = handover ? `${handover.id}-${handover.amount}` : "";
  const [appliedHandoverSeed, setAppliedHandoverSeed] = useState("");
  if (open && handover && appliedHandoverSeed !== handoverSeed) {
    setAppliedHandoverSeed(handoverSeed);
    setAcceptedRupee(handover.amount);
    setRemarks("");
    setAmountTouched(false);
    setRemarksTouched(false);
    setRejectMode(false);
  }
  if (!open && appliedHandoverSeed) {
    setAppliedHandoverSeed("");
  }

  if (!handover) return null;

  const submitted = handover.amount;
  const variance = submitted - acceptedRupee;
  const amountError =
    amountTouched || acceptedRupee > 0
      ? validateHandoverAcceptedAmount(acceptedRupee)
      : undefined;
  const remarksError = rejectMode
    ? liveHandoverRejectReasonError(remarks) ??
      (remarksTouched && !remarks.trim()
        ? "Rejection reason is required."
        : undefined)
    : liveHandoverRemarksError(remarks);

  const acceptReady =
    validateHandoverAcceptedAmount(acceptedRupee) === undefined &&
    validateHandoverRemarks(remarks) === undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Accept {handover.handoverNo}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Submitted {money(submitted)}. Edit accepted amount if your count
            differs — any shortfall stays on staff balance until resolved.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <FieldLabel>Accepted amount (₹)</FieldLabel>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={acceptedRupee || ""}
                disabled={rejectMode}
                className={cn(amountError && "border-red-600")}
                aria-invalid={Boolean(amountError)}
                onChange={(e) => {
                  setAmountTouched(true);
                  setAcceptedRupee(Number(e.target.value));
                }}
              />
              <FormFieldError message={amountError} />
            </div>
            {variance !== 0 && !rejectMode && (
              <p className="text-sm text-amber-800">
                Variance {money(Math.abs(variance))}{" "}
                {variance > 0 ? "short" : "over"}
              </p>
            )}
            <div>
              <FieldLabel>
                {rejectMode ? "Rejection reason (required)" : "Remarks (optional)"}
              </FieldLabel>
              <Textarea
                placeholder={
                  rejectMode
                    ? "Why is this handover being rejected?"
                    : "Acceptance remarks"
                }
                value={remarks}
                maxLength={HANDOVER_REMARKS_MAX}
                className={cn(remarksError && "border-red-600")}
                aria-invalid={Boolean(remarksError)}
                onChange={(e) => setRemarks(e.target.value)}
                onBlur={() => setRemarksTouched(true)}
              />
              <FormFieldError message={remarksTouched ? remarksError : undefined} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            className="text-red-700"
            disabled={busy}
            onClick={() => {
              if (!rejectMode) {
                setRejectMode(true);
                setRemarksTouched(false);
                return;
              }
              setRemarksTouched(true);
              const err = validateHandoverRejectReason(remarks);
              if (err) {
                toast.error("Fix the highlighted fields.");
                return;
              }
              void (async () => {
                try {
                  await reject({
                    id: handover.id,
                    reason: remarks.trim(),
                  }).unwrap();
                  toast.success("Handover rejected");
                  onOpenChange(false);
                } catch (e) {
                  toastApiError(e, "Could not reject handover");
                }
              })();
            }}
          >
            {rejectMode ? "Confirm reject" : "Reject"}
          </Button>
          <div className="flex gap-2">
            {rejectMode ? (
              <Button
                variant="outline"
                onClick={() => {
                  setRejectMode(false);
                  setRemarks("");
                  setRemarksTouched(false);
                }}
              >
                Back
              </Button>
            ) : null}
            {handover.status === "DISCREPANCY" ? (
              <Button
                disabled={busy || !acceptReady}
                onClick={async () => {
                  setAmountTouched(true);
                  setRemarksTouched(true);
                  const amtErr = validateHandoverAcceptedAmount(acceptedRupee);
                  const remErr = validateHandoverRemarks(remarks);
                  if (amtErr || remErr) {
                    toast.error("Fix the highlighted fields.");
                    return;
                  }
                  try {
                    await resolve({
                      id: handover.id,
                      acceptedAmountPaise: Math.round(acceptedRupee * 100),
                      reason: remarks.trim() || "Resolved",
                    }).unwrap();
                    toast.success("Discrepancy resolved");
                    onOpenChange(false);
                  } catch (e) {
                    toastApiError(e, "Could not resolve discrepancy");
                  }
                }}
              >
                {busy && <Loader2 className="animate-spin" />}
                Resolve
              </Button>
            ) : !rejectMode ? (
              <Button
                disabled={busy || !acceptReady}
                onClick={async () => {
                  setAmountTouched(true);
                  setRemarksTouched(true);
                  const amtErr = validateHandoverAcceptedAmount(acceptedRupee);
                  const remErr = validateHandoverRemarks(remarks);
                  if (amtErr || remErr) {
                    toast.error("Fix the highlighted fields.");
                    return;
                  }
                  const amountPaise = Math.round(acceptedRupee * 100);
                  try {
                    if (variance !== 0) {
                      await accept({
                        id: handover.id,
                        acceptedAmountPaise: amountPaise,
                      }).unwrap();
                    } else {
                      await accept({
                        id: handover.id,
                      }).unwrap();
                    }
                    toast.success("Handover accepted");
                    onOpenChange(false);
                  } catch (e) {
                    toastApiError(e, "Could not accept handover");
                  }
                }}
              >
                {busy && <Loader2 className="animate-spin" />}
                Accept
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
