"use client";

import { useRef, useState } from "react";
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
import { FieldLabel, Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { parseApiError, toastApiError } from "@/src/lib/api-error";
import { money } from "@/src/lib/format";
import {
  POST_SETTLEMENT_DISPOSITION_OPTIONS,
  POST_SETTLEMENT_REASON_MAX,
  type PostSettlementRefundCaseRow,
  type PostSettlementRefundDisposition,
  formatIstDateTime,
  isPostSettlementVersionConflict,
  validatePostSettlementResolveReason,
} from "@/src/lib/post-settlement-refund-case";
import { cn } from "@/lib/utils";

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function PostSettlementRefundCaseDialog({
  open,
  onOpenChange,
  caseRow,
  canResolve,
  busy,
  onResolve,
  onRefreshCase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseRow: PostSettlementRefundCaseRow | null;
  canResolve: boolean;
  busy?: boolean;
  onResolve: (input: {
    disposition: PostSettlementRefundDisposition;
    reason: string;
  }) => Promise<void>;
  onRefreshCase: () => Promise<PostSettlementRefundCaseRow | undefined>;
}) {
  const [disposition, setDisposition] =
    useState<PostSettlementRefundDisposition>("RECOVERABLE");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitLock = useRef(false);

  function resetForm() {
    setReason("");
    setTouched(false);
    setConfirmOpen(false);
    setDisposition("RECOVERABLE");
    submitLock.current = false;
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  const reasonError =
    touched || reason.trim()
      ? validatePostSettlementResolveReason(reason)
      : undefined;

  const pending =
    String(caseRow?.status ?? "") === "PENDING_RESOLUTION" ||
    String(caseRow?.status ?? "") === "PENDING";

  const snap = caseRow?.settlementSnapshot ?? {};
  const settlementPaise = Number(snap.redemptionSettlementPaise ?? 0);

  async function handleConfirmedResolve() {
    if (!caseRow || submitLock.current || busy) return;
    submitLock.current = true;
    try {
      await onResolve({ disposition, reason: reason.trim() });
      toast.success("Post-settlement case resolved");
      handleOpenChange(false);
    } catch (err) {
      const parsed = parseApiError(err, "Could not resolve case");
      if (isPostSettlementVersionConflict(parsed.code)) {
        toast.message("Case was updated elsewhere", {
          description: "Showing the latest decision.",
        });
        await onRefreshCase();
        setConfirmOpen(false);
      } else {
        toastApiError(err, "Could not resolve case");
      }
    } finally {
      submitLock.current = false;
    }
  }

  return (
    <>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Post-settlement refund case</AlertDialogTitle>
            <AlertDialogDescription>
              Review the gateway refund recorded after scheme settlement. Disposition
              is for reconciliation only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {caseRow ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={String(caseRow.status ?? "PENDING")} />
                <span className="text-sm text-muted-foreground">
                  Refund {money(Number(caseRow.refundAmountPaise ?? 0) / 100)}
                </span>
              </div>
              <Surface className="border bg-muted/30 p-3 shadow-none">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Refund & identifiers
                </p>
                <SnapshotRow
                  label="Refund completed (IST)"
                  value={formatIstDateTime(caseRow.refundCompletedAt)}
                />
                <SnapshotRow label="Scheme" value={String(caseRow.schemeId ?? "—")} />
                <SnapshotRow label="Payment" value={String(caseRow.paymentId ?? "—")} />
                <SnapshotRow
                  label="Payment refund"
                  value={String(caseRow.paymentRefundId ?? "—")}
                />
                {caseRow.providerRefundId ? (
                  <SnapshotRow
                    label="Provider refund"
                    value={String(caseRow.providerRefundId)}
                  />
                ) : null}
              </Surface>
              <Surface className="border bg-muted/30 p-3 shadow-none">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Settlement snapshot
                </p>
                <SnapshotRow
                  label="Scheme status at refund"
                  value={String(snap.schemeStatus ?? "—")}
                />
                <SnapshotRow
                  label="Settlement completed"
                  value={formatIstDateTime(
                    snap.settlementCompletedAt as string | undefined,
                  )}
                />
                <SnapshotRow
                  label="Settlement principal"
                  value={
                    settlementPaise > 0
                      ? money(settlementPaise / 100)
                      : "—"
                  }
                />
                {snap.redemptionMode ? (
                  <SnapshotRow
                    label="Redemption mode"
                    value={String(snap.redemptionMode)}
                  />
                ) : null}
              </Surface>
              <p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
                Choosing a disposition does not trigger another refund, payment,
                collection attempt, or payout edit. The gateway refund is already
                recorded.
              </p>
              {!pending && caseRow.disposition ? (
                <Surface className="border p-3 shadow-none">
                  <p className="text-sm font-medium">Recorded decision</p>
                  <p className="text-sm text-muted-foreground">
                    {String(caseRow.disposition).replaceAll("_", " ")}
                    {caseRow.resolvedAt
                      ? ` · ${formatIstDateTime(caseRow.resolvedAt)}`
                      : ""}
                  </p>
                  {caseRow.resolutionReason ? (
                    <p className="mt-2 text-sm">{caseRow.resolutionReason}</p>
                  ) : null}
                </Surface>
              ) : null}
              {pending && canResolve ? (
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Disposition</FieldLabel>
                    <div className="mt-2 grid gap-2">
                      {POST_SETTLEMENT_DISPOSITION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={cn(
                            "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                            disposition === opt.value
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50",
                          )}
                          onClick={() => setDisposition(opt.value)}
                        >
                          <span className="font-medium">{opt.label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {opt.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Reason (required)</FieldLabel>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      onBlur={() => setTouched(true)}
                      rows={3}
                      maxLength={POST_SETTLEMENT_REASON_MAX}
                      placeholder="Explain why this disposition applies and any follow-up."
                      className={cn(reasonError && "border-red-600")}
                      aria-invalid={Boolean(reasonError)}
                    />
                    <FormFieldError message={reasonError} />
                  </div>
                </div>
              ) : null}
              {pending && !canResolve ? (
                <p className="text-sm text-muted-foreground">
                  You can view this case but do not have permission to resolve it.
                  Ask a manager with payment reversal access.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading case…</p>
          )}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel disabled={busy}>Close</AlertDialogCancel>
            {pending && canResolve ? (
              <Button
                disabled={busy || Boolean(reasonError) || !reason.trim()}
                onClick={(e) => {
                  e.preventDefault();
                  setTouched(true);
                  const err = validatePostSettlementResolveReason(reason);
                  if (err) {
                    toast.error(err);
                    return;
                  }
                  setConfirmOpen(true);
                }}
              >
                Review & resolve
              </Button>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm disposition?</AlertDialogTitle>
            <AlertDialogDescription>
              This records{" "}
              <strong>
                {POST_SETTLEMENT_DISPOSITION_OPTIONS.find((o) => o.value === disposition)?.label}
              </strong>{" "}
              for {money(Number(caseRow?.refundAmountPaise ?? 0) / 100)}. No further
              refund or payment will be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Back</AlertDialogCancel>
            <Button
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmedResolve();
              }}
            >
              {busy && <Loader2 className="animate-spin" />}
              Confirm resolution
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
