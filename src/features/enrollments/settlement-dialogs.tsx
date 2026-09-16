"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  dialogScrollShellClass,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/src/components/common/page-parts";
import { PageSkeleton } from "@/src/components/common/query-state";
import { SettlementLinesPanel } from "@/src/features/enrollments/settlement-lines-panel";
import {
  useClosePrematureEnrollmentMutation,
  useGetEnrollmentQuery,
  useGetSettlementPreviewQuery,
  useRedeemEnrollmentMutation,
} from "@/src/store/api/admin-api";
import type { SettlementPreviewType } from "@/src/types/domain";
import { apiErrorCode, apiErrorMessage } from "@/src/lib/api-error";
import { cn } from "@/lib/utils";

const CLOSURE_REASONS = [
  { value: "CUSTOMER_REQUEST", label: "Customer request" },
  { value: "FINANCIAL_DIFFICULTY", label: "Financial difficulty" },
  { value: "RELOCATION", label: "Relocation" },
  { value: "PROLONGED_DEFAULT", label: "Prolonged default" },
  { value: "ENROLMENT_ERROR", label: "Enrolment error (cancel)" },
  { value: "OTHER", label: "Other" },
];

export function SettlementPreviewDialog({
  schemeId,
  type,
  open,
  onOpenChange,
  title,
  description,
  onInitiateRedemption,
}: {
  schemeId: string;
  type: SettlementPreviewType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onInitiateRedemption?: () => void;
}) {
  const previewQuery = useGetSettlementPreviewQuery(
    { schemeId, type },
    { skip: !open },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-2xl")}>
        <DialogBody className="pb-4">
          <DialogHeader>
            <DialogTitle>
              {title ??
                (type === "MATURITY_REDEMPTION"
                  ? "Maturity settlement preview"
                  : "Premature closure preview")}
            </DialogTitle>
            <DialogDescription>
              {description ??
                "Computed from confirmed payments only — no ledger writes until you submit."}
            </DialogDescription>
          </DialogHeader>
          {previewQuery.isLoading ? (
            <PageSkeleton />
          ) : previewQuery.isError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              Could not load settlement preview. Refresh the page and try again.
            </p>
          ) : previewQuery.data ? (
            <SettlementLinesPanel preview={previewQuery.data} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Settlement preview is unavailable.
            </p>
          )}
        </DialogBody>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {type === "MATURITY_REDEMPTION" &&
          previewQuery.data?.eligible &&
          onInitiateRedemption ? (
            <Button
              onClick={() => {
                onInitiateRedemption();
              }}
            >
              Continue to redeem
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RedeemEnrollmentDialog({
  schemeId,
  open,
  onOpenChange,
}: {
  schemeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const previewQuery = useGetSettlementPreviewQuery(
    { schemeId, type: "MATURITY_REDEMPTION" },
    { skip: !open },
  );
  const enrollmentQuery = useGetEnrollmentQuery(schemeId, { skip: !open });
  const [redeem, redeemState] = useRedeemEnrollmentMutation();
  const [mode, setMode] = useState("CASH");
  const [remarks, setRemarks] = useState("");
  const preview = previewQuery.data;
  const expectedVersion = enrollmentQuery.data?.version ?? 1;
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("CASH");
    setRemarks("");
    setSubmitError(null);
  }, [open, schemeId]);

  useEffect(() => {
    const first = preview?.allowedModes.find((m) => m.available);
    if (first) setMode(first.mode);
  }, [preview]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-lg")}>
        <DialogBody className="pb-4">
          <DialogHeader>
            <DialogTitle>Initiate redemption</DialogTitle>
            <DialogDescription>
              Choose how value is handed over before submitting the redemption
              request.
            </DialogDescription>
          </DialogHeader>
          {previewQuery.isLoading || !preview ? (
            <PageSkeleton />
          ) : !preview.eligible ? (
            <SettlementLinesPanel preview={preview} />
          ) : (
            <div className="space-y-4">
              {submitError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {submitError}
                </p>
              ) : null}
              <SettlementLinesPanel preview={preview} compact />
              <div>
                <FieldLabel>Redemption mode</FieldLabel>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {preview.allowedModes
                      .filter((m) => m.available)
                      .map((m) => (
                        <SelectItem key={m.mode} value={m.mode}>
                          {m.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {preview.modePreviews?.[mode]?.note ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {preview.modePreviews[mode].note}
                    {preview.modePreviews[mode].weightDisplay
                      ? ` · ${preview.modePreviews[mode].weightDisplay}`
                      : ""}
                  </p>
                ) : null}
              </div>
              <div>
                <FieldLabel>Remarks (optional)</FieldLabel>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!preview?.eligible || redeemState.isLoading || !mode}
            onClick={async () => {
              if (!preview) return;
              setSubmitError(null);
              try {
                await redeem({
                  schemeId,
                  mode,
                  expectedVersion,
                  expectedFinalValue: preview.finalValue,
                  remarks: remarks.trim() || undefined,
                }).unwrap();
                toast.success(
                  preview.approvalRequired
                    ? "Redemption submitted for approval"
                    : "Redemption approved — complete handover from Maturity & redemption",
                );
                onOpenChange(false);
                await enrollmentQuery.refetch();
              } catch (err) {
                const message = apiErrorMessage(
                  err,
                  "Could not submit redemption.",
                );
                setSubmitError(message);
                toast.error(message);
                if (apiErrorCode(err) === "REDEMPTION_ALREADY_OPEN") {
                  await enrollmentQuery.refetch();
                }
              }
            }}
          >
            {redeemState.isLoading && <Loader2 className="animate-spin" />}
            Submit redemption
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PrematureClosureDialog({
  schemeId,
  open,
  onOpenChange,
}: {
  schemeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const previewQuery = useGetSettlementPreviewQuery(
    { schemeId, type: "PREMATURE_CLOSURE" },
    { skip: !open },
  );
  const enrollmentQuery = useGetEnrollmentQuery(schemeId, { skip: !open });
  const [closePremature, closeState] = useClosePrematureEnrollmentMutation();
  const [mode, setMode] = useState("CASH");
  const [reason, setReason] = useState("CUSTOMER_REQUEST");
  const [remarks, setRemarks] = useState("");
  const [ackPenalty, setAckPenalty] = useState(false);
  const [ackForfeit, setAckForfeit] = useState(false);
  const preview = previewQuery.data;
  const expectedVersion = enrollmentQuery.data?.version ?? 1;
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setAckPenalty(false);
    setAckForfeit(false);
    setReason("CUSTOMER_REQUEST");
    setRemarks("");
    setMode("CASH");
  }, [open, schemeId]);

  useEffect(() => {
    const first = preview?.allowedModes.find((m) => m.available);
    if (first) setMode(first.mode);
  }, [preview]);

  const needsPenaltyAck =
    preview?.eligible &&
    preview.lines.some((l) => l.key === "PENALTY" && l.amount > 0);
  const needsForfeitAck = Boolean(preview?.eligible);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-2xl")}>
        <DialogBody className="pb-4">
          <DialogHeader>
            <DialogTitle>Close scheme prematurely</DialogTitle>
            <DialogDescription>
              Penalty and forfeited benefits must be acknowledged before
              closure.
            </DialogDescription>
          </DialogHeader>
          {previewQuery.isLoading ? (
            <PageSkeleton />
          ) : previewQuery.isError || !preview ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              Could not load closure preview. Check plan rules and try again.
            </p>
          ) : (
            <div className="space-y-4">
              {submitError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {submitError}
                </p>
              ) : null}
              <SettlementLinesPanel preview={preview} compact />
              {preview.eligible ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Closure reason</FieldLabel>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLOSURE_REASONS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Payout mode</FieldLabel>
                      <Select value={mode} onValueChange={setMode}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {preview.allowedModes
                            .filter((m) => m.available)
                            .map((m) => (
                              <SelectItem key={m.mode} value={m.mode}>
                                {m.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Remarks</FieldLabel>
                    <Textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={2}
                      placeholder="Why is this scheme being closed early?"
                    />
                  </div>
                  {needsForfeitAck ? (
                    <div className="space-y-3 rounded-xl border border-[#efe6ea] bg-[#faf6f7] p-4 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Staff confirmation
                      </p>
                      <p className="text-muted-foreground">
                        Required before closure is submitted — confirms you
                        reviewed the settlement with the customer.
                      </p>
                      {needsPenaltyAck ? (
                        <label className="flex items-start gap-3">
                          <Checkbox
                            checked={ackPenalty}
                            onCheckedChange={(v) => setAckPenalty(v === true)}
                          />
                          <span>
                            I confirm the premature closure penalty above is
                            correct and has been explained to the customer.
                          </span>
                        </label>
                      ) : null}
                      <label className="flex items-start gap-3">
                        <Checkbox
                          checked={ackForfeit}
                          onCheckedChange={(v) => setAckForfeit(v === true)}
                        />
                        <span>
                          I confirm the maturity benefit is forfeited and the
                          customer understands they will not receive it.
                        </span>
                      </label>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={
              !preview?.eligible ||
              closeState.isLoading ||
              (needsPenaltyAck && !ackPenalty) ||
              (needsForfeitAck && !ackForfeit)
            }
            onClick={async () => {
              if (!preview) return;
              setSubmitError(null);
              try {
                const result = await closePremature({
                  schemeId,
                  mode,
                  expectedVersion,
                  reason,
                  remarks: remarks.trim() || undefined,
                  acknowledgePenalty: needsPenaltyAck ? ackPenalty : true,
                  acknowledgeBenefitForfeit: ackForfeit,
                  expectedFinalValue: preview.finalValue,
                }).unwrap();
                toast.success(
                  result.redemptionNumber
                    ? `${result.redemptionNumber} closure submitted`
                    : "Closure submitted",
                );
                onOpenChange(false);
                await enrollmentQuery.refetch();
              } catch (err) {
                const message = apiErrorMessage(err, "Could not close scheme.");
                setSubmitError(message);
                toast.error(message);
                if (apiErrorCode(err) === "REDEMPTION_ALREADY_OPEN") {
                  await enrollmentQuery.refetch();
                }
              }
            }}
          >
            {closeState.isLoading && <Loader2 className="animate-spin" />}
            Confirm closure
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
