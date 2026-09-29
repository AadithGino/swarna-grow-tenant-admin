"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  liveSettlementRemarksError,
  prematureClosureRemarksReady,
  redeemRemarksReady,
  SETTLEMENT_REMARKS_MAX,
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
import type { SettlementPreview, SettlementPreviewType } from "@/src/types/domain";
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

const REDEMPTION_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: "CASH", label: "Cash payout" },
  { value: "GOLD_HANDOVER", label: "Gold handover" },
  { value: "PURCHASE_ADJUSTMENT", label: "Purchase adjustment" },
];

function redemptionModeLabel(mode: string) {
  return (
    REDEMPTION_MODE_OPTIONS.find((row) => row.value === mode)?.label ??
    mode.replaceAll("_", " ")
  );
}

function resolveModeChoices(enrollment?: {
  valueBasis?: string;
  allowedRedemptionModes?: string[];
}) {
  const allowed = enrollment?.allowedRedemptionModes?.filter(Boolean) ?? [];
  if (allowed.length) return allowed;
  if (enrollment?.valueBasis === "GOLD_WEIGHT") {
    return ["GOLD_HANDOVER", "CASH", "PURCHASE_ADJUSTMENT"];
  }
  return ["CASH", "PURCHASE_ADJUSTMENT", "GOLD_HANDOVER"];
}

function pickDefaultMode(
  choices: string[],
  preferred?: string,
) {
  if (preferred && choices.includes(preferred)) return preferred;
  return choices[0] ?? REDEMPTION_MODE_OPTIONS[0]!.value;
}

function hasGoldRateBlocker(preview?: SettlementPreview) {
  return (
    preview?.blockers?.some(
      (blocker) =>
        blocker.code === "GOLD_RATE_NOT_SET" ||
        /gold rate/i.test(blocker.message ?? ""),
    ) ?? false
  );
}

function RedemptionMethodSelect({
  modeChoices,
  selectedMode,
  onModeChange,
  loading,
  isGoldWeight,
  preview,
}: {
  modeChoices: string[];
  selectedMode: string;
  onModeChange: (mode: string) => void;
  loading?: boolean;
  isGoldWeight?: boolean;
  preview?: SettlementPreview;
}) {
  const options =
    modeChoices.length > 0
      ? modeChoices
      : REDEMPTION_MODE_OPTIONS.map((row) => row.value);

  return (
    <div className="space-y-2 rounded-2xl border border-[#eaded9] bg-[#faf7f5] p-4 shadow-sm">
      <FieldLabel>Settlement type (redemption method)</FieldLabel>
      <Select
        value={selectedMode || undefined}
        onValueChange={onModeChange}
        disabled={loading || options.length === 0}
      >
        <SelectTrigger className="w-full bg-white">
          <SelectValue placeholder="Select how value is handed over" />
        </SelectTrigger>
        <SelectContent>
          {options.map((value) => {
            const fromPreview = preview?.allowedModes?.find((m) => m.mode === value);
            return (
              <SelectItem key={value} value={value}>
                {fromPreview?.label ?? redemptionModeLabel(value)}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {preview?.modePreviews?.[selectedMode]?.note ? (
        <p className="text-xs leading-5 text-[#776a6d]">
          {preview.modePreviews[selectedMode].note}
          {preview.modePreviews[selectedMode].weightDisplay
            ? ` · ${preview.modePreviews[selectedMode].weightDisplay}`
            : ""}
        </p>
      ) : (
        <p className="text-xs leading-5 text-[#776a6d]">
          {isGoldWeight
            ? "Gold accumulation plans settle by cash payout, gold handover, or purchase adjustment per plan rules."
            : "Choose how the customer receives value at maturity."}
        </p>
      )}
    </div>
  );
}

export function SettlementPreviewDialog({
  schemeId,
  type,
  open,
  onOpenChange,
  title,
  description,
  mode,
  redemptionWizard = type === "MATURITY_REDEMPTION",
  initialWizardStep = "preview",
}: {
  schemeId: string;
  type: SettlementPreviewType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  mode?: string;
  redemptionWizard?: boolean;
  initialWizardStep?: "preview" | "submit";
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SettlementPreviewDialogBody
          key={`${schemeId}:${type}:${initialWizardStep}`}
          schemeId={schemeId}
          type={type}
          onOpenChange={onOpenChange}
          title={title}
          description={description}
          mode={mode}
          redemptionWizard={redemptionWizard}
          initialWizardStep={initialWizardStep}
        />
      ) : null}
    </Dialog>
  );
}

function SettlementPreviewDialogBody({
  schemeId,
  type,
  onOpenChange,
  title,
  description,
  mode,
  redemptionWizard,
  initialWizardStep,
}: {
  schemeId: string;
  type: SettlementPreviewType;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  mode?: string;
  redemptionWizard: boolean;
  initialWizardStep: "preview" | "submit";
}) {
  const enrollmentQuery = useGetEnrollmentQuery(schemeId);
  const [redeem, redeemState] = useRedeemEnrollmentMutation();
  const isMaturity = type === "MATURITY_REDEMPTION";
  const [wizardStep, setWizardStep] = useState<"preview" | "submit">(
    initialWizardStep,
  );
  const [modeOverride, setModeOverride] = useState<string | null>(null);
  const [billNumber, setBillNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [remarksTouched, setRemarksTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const modeChoices = useMemo(
    () => resolveModeChoices(enrollmentQuery.data),
    [enrollmentQuery.data],
  );
  const isGoldWeight = enrollmentQuery.data?.valueBasis === "GOLD_WEIGHT";
  const selectedMode = isMaturity
    ? modeOverride && modeChoices.includes(modeOverride)
      ? modeOverride
      : pickDefaultMode(modeChoices, mode)
    : "";

  const previewReady =
    !enrollmentQuery.isLoading && (!isMaturity || Boolean(selectedMode));

  const previewQuery = useGetSettlementPreviewQuery(
    {
      schemeId,
      type,
      ...(isMaturity && selectedMode ? { mode: selectedMode } : {}),
    },
    { skip: !previewReady },
  );

  const preview = previewQuery.data;
  const expectedVersion = enrollmentQuery.data?.version ?? 1;
  const showWizard = isMaturity && redemptionWizard;
  const onSubmitStep = showWizard && wizardStep === "submit";

  const remarksDisplayError = liveSettlementRemarksError(remarks, {
    required: false,
  });

  const modeSelect = isMaturity ? (
    <RedemptionMethodSelect
      modeChoices={modeChoices}
      selectedMode={selectedMode}
      onModeChange={setModeOverride}
      loading={enrollmentQuery.isLoading}
      isGoldWeight={isGoldWeight}
      preview={preview}
    />
  ) : null;

  const previewPanel =
    enrollmentQuery.isLoading ||
    (previewQuery.isFetching && !previewQuery.isError && !preview) ? (
      <PageSkeleton cards={4} />
    ) : previewQuery.isError ? (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        {apiErrorMessage(
          previewQuery.error,
          "Could not load settlement preview. Refresh the page and try again.",
        )}
      </p>
    ) : preview ? (
      <SettlementLinesPanel preview={preview} compact={onSubmitStep} />
    ) : isMaturity && !selectedMode ? (
      <p className="rounded-2xl border border-[#eaded9] bg-[#faf7f5] p-4 text-sm text-[#5c4a4e]">
        Select a settlement type to load the computation.
      </p>
    ) : (
      <p className="text-sm text-muted-foreground">
        Settlement preview is unavailable.
      </p>
    );

  return (
    <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-3xl")}>
      <DialogBody className="space-y-5 pb-2">
        <DialogHeader className="space-y-2 text-left">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6f2a]">
            {onSubmitStep ? "Redemption" : "Settlement preview"}
          </p>
          <DialogTitle className="text-2xl font-extrabold tracking-tight text-[#241316]">
            {onSubmitStep
              ? "Confirm & submit redemption"
              : title ??
                (isMaturity ? "Maturity settlement" : "Premature closure")}
          </DialogTitle>
          <DialogDescription className="max-w-2xl text-sm leading-6 text-[#776a6d]">
            {onSubmitStep
              ? "Step 2 of 2 — verify settlement type and submit when blockers are cleared."
              : description ??
                "Step 1 of 2 — pick settlement type and review the computation before submitting."}
          </DialogDescription>
        </DialogHeader>

        {modeSelect}

        {onSubmitStep && preview && !preview.eligible ? (
          <p className="text-sm text-[#776a6d]">
            Submission stays disabled until blockers above are resolved (for example
            today&apos;s 22K gold rate).
          </p>
        ) : null}

        {previewPanel}

        {onSubmitStep && preview?.eligible ? (
          <div className="space-y-4 border-t border-[#efe6ea] pt-4">
            {submitError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {submitError}
              </p>
            ) : null}
            {selectedMode === "PURCHASE_ADJUSTMENT" ? (
              <div>
                <FieldLabel>Purchase bill number</FieldLabel>
                <Input
                  value={billNumber}
                  onChange={(event) => setBillNumber(event.target.value)}
                  maxLength={64}
                  placeholder="Required for purchase adjustment"
                />
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
              />
              <FormFieldError
                message={remarksTouched ? remarksDisplayError : undefined}
              />
            </div>
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter className="flex-wrap gap-3 border-t border-[#efe6ea] bg-[#faf7f5]/80 px-6 py-4 sm:justify-between">
        {onSubmitStep ? (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setWizardStep("preview")}
          >
            <ArrowLeft className="size-4" />
            Back to preview
          </Button>
        ) : (
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onSubmitStep && preview && hasGoldRateBlocker(preview) ? (
            <Button variant="secondary" asChild>
              <Link href="/gold-rates">Set today&apos;s gold rate</Link>
            </Button>
          ) : null}
          {showWizard && !onSubmitStep && preview && selectedMode ? (
            <Button
              className="gap-2"
              onClick={() => setWizardStep("submit")}
            >
              Continue to redeem
              <ArrowRight className="size-4" />
            </Button>
          ) : null}
          {onSubmitStep && preview ? (
            <Button
              className="gap-2"
              disabled={
                !preview.eligible ||
                redeemState.isLoading ||
                previewQuery.isFetching ||
                !selectedMode ||
                (selectedMode === "PURCHASE_ADJUSTMENT" && !billNumber.trim()) ||
                !redeemRemarksReady(remarks)
              }
              onClick={async () => {
                setRemarksTouched(true);
                const remarksErr = validateSettlementRemarks(remarks, {
                  required: false,
                });
                if (remarksErr) {
                  setSubmitError(remarksErr);
                  toast.error("Fix the highlighted fields.");
                  return;
                }
                setSubmitError(null);
                try {
                  await redeem({
                    schemeId,
                    mode: selectedMode,
                    expectedVersion,
                    expectedFinalValue: preview.finalValue,
                    remarks: remarks.trim() || undefined,
                    billNumber:
                      selectedMode === "PURCHASE_ADJUSTMENT"
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
          ) : null}
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

/** @deprecated Use SettlementPreviewDialog with redemptionWizard (default for maturity). */
export function RedeemEnrollmentDialog({
  schemeId,
  open,
  onOpenChange,
  initialMode,
}: {
  schemeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: string;
}) {
  return (
    <SettlementPreviewDialog
      schemeId={schemeId}
      type="MATURITY_REDEMPTION"
      open={open}
      onOpenChange={onOpenChange}
      mode={initialMode}
      redemptionWizard
      initialWizardStep="submit"
    />
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <PrematureClosureDialogBody
          key={schemeId}
          schemeId={schemeId}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  );
}

function PrematureClosureDialogBody({
  schemeId,
  onOpenChange,
}: {
  schemeId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const enrollmentQuery = useGetEnrollmentQuery(schemeId);
  const [closePremature, closeState] = useClosePrematureEnrollmentMutation();
  const [modeOverride, setModeOverride] = useState<string | null>(null);
  const [billNumber, setBillNumber] = useState("");
  const [reason, setReason] = useState("CUSTOMER_REQUEST");
  const [remarks, setRemarks] = useState("");
  const [remarksTouched, setRemarksTouched] = useState(false);
  const [ackPenalty, setAckPenalty] = useState(false);
  const [ackForfeit, setAckForfeit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const modeChoices = useMemo(
    () => resolveModeChoices(enrollmentQuery.data),
    [enrollmentQuery.data],
  );
  const mode =
    modeOverride && modeChoices.includes(modeOverride)
      ? modeOverride
      : pickDefaultMode(modeChoices);

  const previewQuery = useGetSettlementPreviewQuery(
    { schemeId, type: "PREMATURE_CLOSURE", mode },
    { skip: !mode },
  );
  const preview = previewQuery.data;
  const expectedVersion = enrollmentQuery.data?.version ?? 1;

  const remarksDisplayError = liveSettlementRemarksError(remarks, {
    required: true,
  });

  const needsPenaltyAck =
    preview?.eligible &&
    preview.lines.some((l) => l.key === "PENALTY" && l.amount > 0);
  const needsForfeitAck = Boolean(
    preview?.eligible && preview.lines.some((line) => line.forfeited),
  );

  return (
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
        {previewQuery.isLoading && !preview ? (
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
            <div
              className={cn(
                previewQuery.isFetching && "opacity-60 pointer-events-none",
              )}
            >
              <SettlementLinesPanel preview={preview} compact />
            </div>
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
                    <Select value={mode} onValueChange={setModeOverride}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(preview.allowedModes.filter((m) => m.available)
                          .length
                          ? preview.allowedModes.filter((m) => m.available)
                          : modeChoices.map((value) => ({
                              mode: value,
                              label: redemptionModeLabel(value),
                              available: true,
                            }))
                        ).map((m) => (
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
                    <FieldLabel>Purchase bill number</FieldLabel>
                    <Input
                      value={billNumber}
                      onChange={(event) => setBillNumber(event.target.value)}
                      maxLength={64}
                      placeholder="Required for purchase adjustment"
                    />
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
            previewQuery.isFetching ||
            (needsPenaltyAck && !ackPenalty) ||
            (needsForfeitAck && !ackForfeit) ||
            (mode === "PURCHASE_ADJUSTMENT" && !billNumber.trim()) ||
            !prematureClosureRemarksReady(remarks)
          }
          onClick={async () => {
            if (!preview) return;
            setRemarksTouched(true);
            const remarksErr = validateSettlementRemarks(remarks, {
              required: true,
            });
            if (remarksErr) {
              setSubmitError(remarksErr);
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
  );
}
