"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  liveSettlementRemarksError,
  prematureClosureRemarksReady,
  purchaseAdjustmentBillReady,
  redeemRemarksReady,
  SETTLEMENT_REMARKS_MAX,
  validatePurchaseAdjustmentBillNumber,
  validateSettlementRemarks,
} from "@/src/lib/settlement-form-validation";
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
  const [previewMode, setPreviewMode] = useState("CASH");
  const enrollmentQuery = useGetEnrollmentQuery(schemeId, { skip: !open });
  const isGoldWeight = enrollmentQuery.data?.valueBasis === "GOLD_WEIGHT";

  useEffect(() => {
    if (!open) setPreviewMode("CASH");
  }, [open, schemeId]);

  const previewQuery = useGetSettlementPreviewQuery(
    { schemeId, type, mode: previewMode },
    { skip: !open },
  );

  const preview = previewQuery.data;
  const canContinue =
    type === "MATURITY_REDEMPTION" &&
    preview?.eligible &&
    Boolean(onInitiateRedemption);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-3xl")}>
        <DialogBody className="space-y-5 pb-2">
          <DialogHeader className="space-y-2 text-left">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6f2a]">
              Settlement preview
            </p>
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-[#241316]">
              {title ??
                (type === "MATURITY_REDEMPTION"
                  ? "Maturity settlement"
                  : "Premature closure")}
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-6 text-[#776a6d]">
              {description ??
                "Computed from confirmed payments only — no ledger writes until you submit redemption or closure."}
            </DialogDescription>
          </DialogHeader>
          {previewQuery.isLoading ? (
            <PageSkeleton cards={4} />
          ) : previewQuery.isError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {apiErrorMessage(
                previewQuery.error,
                "Could not load settlement preview. Refresh the page and try again.",
              )}
            </p>
          ) : preview ? (
            <>
              {isGoldWeight && preview.allowedModes.length > 0 ? (
                <div>
                  <FieldLabel>Settlement basis (gold plan)</FieldLabel>
                  <Select value={previewMode} onValueChange={setPreviewMode}>
                    <SelectTrigger className="w-full sm:max-w-xs">
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
                  {preview.modePreviews?.[previewMode]?.note ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {preview.modePreviews[previewMode].note}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <SettlementLinesPanel preview={preview} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Settlement preview is unavailable.
            </p>
          )}
        </DialogBody>
        <DialogFooter className="gap-3 border-t border-[#efe6ea] bg-[#faf7f5]/80 px-6 py-4 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canContinue ? (
            <Button
              className="gap-2"
              onClick={() => {
                onInitiateRedemption?.();
              }}
            >
              Continue to redeem
              <ArrowRight className="size-4" />
            </Button>
          ) : preview && !preview.eligible ? (
            <p className="text-sm text-[#776a6d]">
              Resolve blockers above to proceed.
            </p>
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
  const enrollmentQuery = useGetEnrollmentQuery(schemeId, { skip: !open });
  const [redeem, redeemState] = useRedeemEnrollmentMutation();
  const [mode, setMode] = useState("CASH");
  const [billNumber, setBillNumber] = useState("");
  const [billNumberTouched, setBillNumberTouched] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [remarksTouched, setRemarksTouched] = useState(false);
  const expectedVersion = enrollmentQuery.data?.version ?? 1;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const previewQuery = useGetSettlementPreviewQuery(
    { schemeId, type: "MATURITY_REDEMPTION", mode },
    { skip: !open },
  );
  const preview = previewQuery.data;

  const billNumberDisplayError =
    mode === "PURCHASE_ADJUSTMENT" && billNumberTouched
      ? validatePurchaseAdjustmentBillNumber(billNumber)
      : undefined;

  const remarksDisplayError =
    submitError && submitError.includes("Remarks")
      ? undefined
      : liveSettlementRemarksError(remarks, { required: false });

  useEffect(() => {
    if (!open) return;
    setMode("CASH");
    setBillNumber("");
    setBillNumberTouched(false);
    setRemarks("");
    setRemarksTouched(false);
    setSubmitError(null);
  }, [open, schemeId]);

  useEffect(() => {
    const available = preview?.allowedModes.filter((item) => item.available) ?? [];
    if (available.length && !available.some((item) => item.mode === mode)) {
      setMode(available[0].mode);
    }
  }, [preview, mode]);

  useEffect(() => {
    if (mode !== "PURCHASE_ADJUSTMENT") {
      setBillNumberTouched(false);
    }
  }, [mode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-3xl")}>
        <DialogBody className="space-y-5 pb-2">
          <DialogHeader className="space-y-2 text-left">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6f2a]">
              Redemption
            </p>
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-[#241316]">
              Initiate redemption
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-6 text-[#776a6d]">
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
              {mode === "PURCHASE_ADJUSTMENT" ? (
                <div>
                  <FieldLabel>Bill / invoice number</FieldLabel>
                  <Input
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    onBlur={() => setBillNumberTouched(true)}
                    placeholder="e.g. INV-2026-0042"
                    className={cn(
                      billNumberTouched && billNumberDisplayError && "border-red-600",
                    )}
                    aria-invalid={Boolean(billNumberDisplayError)}
                  />
                  <FormFieldError message={billNumberDisplayError} />
                </div>
              ) : null}
              <div>
                <FieldLabel>Remarks (optional)</FieldLabel>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  onBlur={() => setRemarksTouched(true)}
                  rows={2}
                  maxLength={SETTLEMENT_REMARKS_MAX}
                  className={cn(
                    remarksTouched && remarksDisplayError && "border-red-600",
                  )}
                  aria-invalid={Boolean(remarksTouched && remarksDisplayError)}
                />
                <FormFieldError
                  message={remarksTouched ? remarksDisplayError : undefined}
                />
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="gap-3 border-t border-[#efe6ea] bg-[#faf7f5]/80 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="gap-2"
            disabled={
              !preview?.eligible ||
              redeemState.isLoading ||
              !mode ||
              !redeemRemarksReady(remarks) ||
              !purchaseAdjustmentBillReady(mode, billNumber)
            }
            onClick={async () => {
              if (!preview) return;
              setRemarksTouched(true);
              if (mode === "PURCHASE_ADJUSTMENT") setBillNumberTouched(true);
              const billErr =
                mode === "PURCHASE_ADJUSTMENT"
                  ? validatePurchaseAdjustmentBillNumber(billNumber)
                  : undefined;
              const remarksErr = validateSettlementRemarks(remarks, {
                required: false,
              });
              if (billErr || remarksErr) {
                setSubmitError(billErr ?? remarksErr ?? null);
                toast.error("Fix the highlighted fields.");
                return;
              }
              setSubmitError(null);
              try {
                await redeem({
                  schemeId,
                  mode,
                  expectedVersion,
                  expectedFinalValue: preview.finalValue,
                  remarks: remarks.trim() || undefined,
                  billNumber:
                    mode === "PURCHASE_ADJUSTMENT"
                      ? billNumber.trim()
                      : undefined,
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
  const enrollmentQuery = useGetEnrollmentQuery(schemeId, { skip: !open });
  const [closePremature, closeState] = useClosePrematureEnrollmentMutation();
  const [mode, setMode] = useState("CASH");
  const [billNumber, setBillNumber] = useState("");
  const [billNumberTouched, setBillNumberTouched] = useState(false);
  const [reason, setReason] = useState("CUSTOMER_REQUEST");
  const [remarks, setRemarks] = useState("");
  const [remarksTouched, setRemarksTouched] = useState(false);
  const [ackPenalty, setAckPenalty] = useState(false);
  const [ackForfeit, setAckForfeit] = useState(false);
  const expectedVersion = enrollmentQuery.data?.version ?? 1;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const previewQuery = useGetSettlementPreviewQuery(
    { schemeId, type: "PREMATURE_CLOSURE", mode },
    { skip: !open },
  );
  const preview = previewQuery.data;

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setAckPenalty(false);
    setAckForfeit(false);
    setReason("CUSTOMER_REQUEST");
    setRemarks("");
    setRemarksTouched(false);
    setMode("CASH");
    setBillNumber("");
    setBillNumberTouched(false);
  }, [open, schemeId]);

  useEffect(() => {
    const available = preview?.allowedModes.filter((item) => item.available) ?? [];
    if (available.length && !available.some((item) => item.mode === mode)) {
      setMode(available[0].mode);
    }
  }, [preview, mode]);

  useEffect(() => {
    if (mode !== "PURCHASE_ADJUSTMENT") {
      setBillNumberTouched(false);
    }
  }, [mode]);

  const billNumberDisplayError =
    mode === "PURCHASE_ADJUSTMENT" && billNumberTouched
      ? validatePurchaseAdjustmentBillNumber(billNumber)
      : undefined;

  const remarksDisplayError = liveSettlementRemarksError(remarks, {
    required: true,
  });

  const needsPenaltyAck =
    preview?.eligible &&
    preview.lines.some((l) => l.key === "PENALTY" && l.amount > 0);
  const needsForfeitAck = Boolean(preview?.eligible);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-3xl")}>
        <DialogBody className="space-y-5 pb-2">
          <DialogHeader className="space-y-2 text-left">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6f2a]">
              Early closure
            </p>
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-[#241316]">
              Close scheme prematurely
            </DialogTitle>
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
                  {mode === "PURCHASE_ADJUSTMENT" ? (
                    <div>
                      <FieldLabel>Bill / invoice number</FieldLabel>
                      <Input
                        value={billNumber}
                        onChange={(e) => setBillNumber(e.target.value)}
                        onBlur={() => setBillNumberTouched(true)}
                        placeholder="e.g. INV-2026-0042"
                        className={cn(
                          billNumberTouched &&
                            billNumberDisplayError &&
                            "border-red-600",
                        )}
                        aria-invalid={Boolean(billNumberDisplayError)}
                      />
                      <FormFieldError message={billNumberDisplayError} />
                    </div>
                  ) : null}
                  <div>
                    <FieldLabel>Remarks</FieldLabel>
                    <Textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      onBlur={() => setRemarksTouched(true)}
                      rows={2}
                      maxLength={SETTLEMENT_REMARKS_MAX}
                      placeholder="Why is this scheme being closed early?"
                      className={cn(
                        remarksTouched && remarksDisplayError && "border-red-600",
                      )}
                      aria-invalid={Boolean(
                        remarksTouched && remarksDisplayError,
                      )}
                    />
                    <FormFieldError
                      message={
                        remarksTouched || remarks.trim()
                          ? remarksDisplayError ??
                            (remarks.trim()
                              ? undefined
                              : "Remarks are required.")
                          : undefined
                      }
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
        <DialogFooter className="gap-3 border-t border-[#efe6ea] bg-[#faf7f5]/80 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            disabled={
              !preview?.eligible ||
              closeState.isLoading ||
              (needsPenaltyAck && !ackPenalty) ||
              (needsForfeitAck && !ackForfeit) ||
              !prematureClosureRemarksReady(remarks) ||
              !purchaseAdjustmentBillReady(mode, billNumber)
            }
            onClick={async () => {
              if (!preview) return;
              setRemarksTouched(true);
              if (mode === "PURCHASE_ADJUSTMENT") setBillNumberTouched(true);
              const billErr =
                mode === "PURCHASE_ADJUSTMENT"
                  ? validatePurchaseAdjustmentBillNumber(billNumber)
                  : undefined;
              const remarksErr = validateSettlementRemarks(remarks, {
                required: true,
              });
              if (billErr || remarksErr) {
                setSubmitError(billErr ?? remarksErr ?? null);
                toast.error("Fix the highlighted fields.");
                return;
              }
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
                  billNumber:
                    mode === "PURCHASE_ADJUSTMENT"
                      ? billNumber.trim()
                      : undefined,
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
