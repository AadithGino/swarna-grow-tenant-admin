"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useVerifyDigitalMetalsBankDestinationMutation } from "@/src/store/api/admin-api";

export type BankVerifyDialogTarget = {
  customerId: string;
  destinationId: string;
  accountHolderName?: string;
  accountLast4?: string;
  ifsc?: string;
  bankName?: string;
  customerName?: string;
};

export function DigitalMetalsBankVerifyDialog({
  open,
  onOpenChange,
  target,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: BankVerifyDialogTarget | null;
  onCompleted?: () => void;
}) {
  const [note, setNote] = useState("");
  const [evidenceRaw, setEvidenceRaw] = useState("");
  const [verify, verifyState] = useVerifyDigitalMetalsBankDestinationMutation();

  useEffect(() => {
    if (!open) {
      setNote("");
      setEvidenceRaw("");
    }
  }, [open, target?.destinationId]);

  const evidenceUploadIds = evidenceRaw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const noteOk = note.trim().length >= 3;

  async function submit(activate: boolean) {
    if (!target) return;
    await verify({
      customerId: target.customerId,
      destinationId: target.destinationId,
      note: note.trim(),
      activate,
      evidenceUploadIds: evidenceUploadIds.length ? evidenceUploadIds : undefined,
      idempotencyKey: newIdempotencyKey(),
    })
      .unwrap()
      .then(() => {
        toast.success(
          activate ? "Bank account verified (manual attestation recorded)." : "Left in pending verification.",
        );
        onOpenChange(false);
        onCompleted?.();
      })
      .catch(toastApiError);
  }

  const summary = target
    ? `${target.accountHolderName ?? "Account"} · ****${target.accountLast4 ?? "????"} · ${target.ifsc ?? "—"}${target.bankName ? ` · ${target.bankName}` : ""}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="digital-metals-bank-verify-dialog">
        <DialogBody>
          <DialogHeader className="mb-4">
            <DialogTitle>Verify payout bank</DialogTitle>
            <DialogDescription>
              Confirm offline (cancelled cheque or statement) that this account belongs to the customer. Full account
              numbers are never shown in admin.
            </DialogDescription>
          </DialogHeader>
          {target ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-[#fbf8f6] px-3 py-2 text-sm">
                {target.customerName ? (
                  <p className="font-medium text-[#28161a]">{target.customerName}</p>
                ) : null}
                <p className="text-xs text-[#5c4a4e]">{summary}</p>
                <Link
                  href={`/customers/${target.customerId}`}
                  className="mt-2 inline-block text-xs font-medium underline underline-offset-2"
                >
                  Open customer profile
                </Link>
              </div>
              <div>
                <Label htmlFor="queue-bank-verify-note" className="text-xs">
                  Verification note (required)
                </Label>
                <Input
                  id="queue-bank-verify-note"
                  className="mt-1"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="How you verified this account (audited)"
                />
              </div>
              <div>
                <Label htmlFor="queue-bank-verify-evidence" className="text-xs">
                  Evidence upload IDs (optional)
                </Label>
                <Input
                  id="queue-bank-verify-evidence"
                  className="mt-1 font-mono text-xs"
                  value={evidenceRaw}
                  onChange={(e) => setEvidenceRaw(e.target.value)}
                  placeholder="upl_… upl_…"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="mt-6 flex-wrap gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!target || verifyState.isLoading || !noteOk}
              onClick={() => void submit(false)}
            >
              Reject verification
            </Button>
            <Button type="button" disabled={!target || verifyState.isLoading || !noteOk} onClick={() => void submit(true)}>
              Verify (activate)
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
