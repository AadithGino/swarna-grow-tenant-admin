"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import { toastApiError } from "@/src/lib/api-error";
import {
  livePaymentReversalReasonError,
  PAYMENT_REVERSAL_REASON_MAX,
  paymentReversalReasonReady,
  validatePaymentReversalReason,
} from "@/src/lib/payment-form-validation";
import { cn } from "@/lib/utils";

export function ReversePaymentDialog({
  open,
  onOpenChange,
  receiptNo,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptNo?: string;
  busy?: boolean;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason("");
      setTouched(false);
    }
    onOpenChange(next);
  };

  const displayError =
    touched || reason.trim()
      ? livePaymentReversalReasonError(reason)
      : undefined;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reverse payment?</AlertDialogTitle>
          <AlertDialogDescription>
            {receiptNo
              ? `Receipt ${receiptNo} will be reversed on the ledger. This cannot be undone casually.`
              : "This posts a reversal on the ledger."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <FieldLabel>Reason (required)</FieldLabel>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={3}
            maxLength={PAYMENT_REVERSAL_REASON_MAX}
            placeholder="Duplicate entry, wrong enrollment, customer refund, etc."
            className={cn(displayError && "border-red-600")}
            aria-invalid={Boolean(displayError)}
          />
          <FormFieldError message={displayError} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={busy || !paymentReversalReasonReady(reason)}
            onClick={async (e) => {
              e.preventDefault();
              setTouched(true);
              const err = validatePaymentReversalReason(reason);
              if (err) {
                toast.error("Fix the highlighted fields.");
                return;
              }
              try {
                await onConfirm(reason.trim());
                onOpenChange(false);
              } catch (err) {
                toastApiError(err, "Reversal not allowed or failed");
              }
            }}
          >
            {busy && <Loader2 className="animate-spin" />}
            Reverse payment
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
