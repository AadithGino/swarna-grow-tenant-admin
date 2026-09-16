"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileImage, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import {
  KYC_REJECT_REMARKS_MAX,
  kycRejectRemarksReady,
  kycSubmitReadyForSubmit,
  liveKycRejectRemarksError,
  liveKycSubmitFieldErrors,
  sanitizePanInput,
  validateKycRejectRemarks,
  validateKycSubmit,
  type KycSubmitFormState,
} from "@/src/lib/kyc-form";
import type { Customer } from "@/src/types/domain";
import {
  usePresignUploadMutation,
  useSubmitCustomerKycMutation,
  useVerifyCustomerKycMutation,
} from "@/src/store/api/admin-api";
import { uploadFileViaPresign } from "@/src/lib/upload-via-presign";
import { cn } from "@/lib/utils";

function mergeMessage(
  apiOrSubmit: string | undefined,
  live: string | undefined,
): string | undefined {
  return apiOrSubmit ?? live;
}

export function ReviewKycDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const kyc = customer.kycDetail;
  const status = kyc?.status ?? "NOT_SUBMITTED";
  const [verifyKyc, verifyState] = useVerifyCustomerKycMutation();
  const [submitKycMutation, submitState] = useSubmitCustomerKycMutation();
  const [presignUpload] = usePresignUploadMutation();
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [uploadType, setUploadType] = useState<"AADHAAR" | "PAN">("AADHAAR");
  const [panNumber, setPanNumber] = useState("");
  const [frontUploadId, setFrontUploadId] = useState<string | null>(null);
  const [backUploadId, setBackUploadId] = useState<string | null>(null);
  const [panUploadId, setPanUploadId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [submitFieldErrors, setSubmitFieldErrors] = useState<
    Record<string, string>
  >({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [rejectFieldError, setRejectFieldError] = useState<string | undefined>();
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setRejectRemarks("");
    setPanNumber("");
    setFrontUploadId(null);
    setBackUploadId(null);
    setPanUploadId(null);
    setSubmitFieldErrors({});
    setSubmitAttempted(false);
    setRejectFieldError(undefined);
  }, [open, customer.id]);

  const busy = verifyState.isLoading || submitState.isLoading || uploadBusy;
  const canReview = status === "SUBMITTED";
  const isVerified = status === "VERIFIED";
  const isRejected = status === "REJECTED";
  const showUpload =
    !isVerified && (status === "NOT_SUBMITTED" || isRejected);

  const submitFormState: KycSubmitFormState = useMemo(
    () => ({
      type: uploadType,
      panNumber,
      frontUploadId,
      backUploadId,
      panUploadId,
    }),
    [uploadType, panNumber, frontUploadId, backUploadId, panUploadId],
  );

  const liveSubmitErrors = useMemo(
    () => liveKycSubmitFieldErrors(submitFormState),
    [submitFormState],
  );

  const submitValidation = useMemo(
    () => validateKycSubmit(submitFormState),
    [submitFormState],
  );

  const displaySubmitError = (field: string) => {
    const fromValidate = submitAttempted ? submitValidation[field] : undefined;
    return mergeMessage(
      submitFieldErrors[field],
      fromValidate ?? liveSubmitErrors[field],
    );
  };

  const rejectLiveError = liveKycRejectRemarksError(rejectRemarks);
  const displayRejectError = rejectFieldError ?? rejectLiveError;

  const submitReady = kycSubmitReadyForSubmit(submitFormState);
  const rejectReady = kycRejectRemarksReady(rejectRemarks);

  async function handleUpload(
    file: File,
    target: "front" | "back" | "pan",
  ) {
    setUploadBusy(true);
    try {
      const uploadId = await uploadFileViaPresign(
        file,
        (input) => presignUpload(input).unwrap(),
        "KYC_DOCUMENT",
      );
      if (target === "front") {
        setFrontUploadId(uploadId);
        setSubmitFieldErrors((prev) => {
          const next = { ...prev };
          delete next.front;
          return next;
        });
      }
      if (target === "back") {
        setBackUploadId(uploadId);
        setSubmitFieldErrors((prev) => {
          const next = { ...prev };
          delete next.back;
          return next;
        });
      }
      if (target === "pan") {
        setPanUploadId(uploadId);
        setSubmitFieldErrors((prev) => {
          const next = { ...prev };
          delete next.panUpload;
          return next;
        });
      }
      toast.success("Document uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-2xl")}>
        <DialogBody className="pb-4">
          <DialogHeader>
            <DialogTitle>Review KYC documents</DialogTitle>
            <DialogDescription>
              Human verification for {customer.name}. Upload images via secure
              storage, then submit for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={customer.kyc} />
              {kyc?.type ? (
                <span className="text-sm text-muted-foreground">{kyc.type}</span>
              ) : null}
              {kyc?.submittedAt ? (
                <span className="text-sm text-muted-foreground">
                  Submitted {kyc.submittedAt}
                </span>
              ) : null}
              {kyc?.verifiedAt ? (
                <span className="text-sm text-muted-foreground">
                  Verified {kyc.verifiedAt} by {kyc.verifiedBy}
                </span>
              ) : null}
            </div>

            {isRejected && kyc?.rejectionRemarks ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <strong>Previous rejection</strong>
                <p className="mt-1">{kyc.rejectionRemarks}</p>
              </div>
            ) : null}

            {showUpload ? (
              <div className="space-y-4 rounded-xl border p-4">
                <h3 className="font-semibold">Upload on behalf of customer</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Document type</FieldLabel>
                    <Select
                      value={uploadType}
                      onValueChange={(v) => {
                        setUploadType(v as "AADHAAR" | "PAN");
                        setSubmitFieldErrors({});
                        setSubmitAttempted(false);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AADHAAR">Aadhaar</SelectItem>
                        <SelectItem value="PAN">PAN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {uploadType === "PAN" ? (
                    <div>
                      <FieldLabel>PAN number</FieldLabel>
                      <Input
                        value={panNumber}
                        onChange={(e) => {
                          setPanNumber(sanitizePanInput(e.target.value));
                          setSubmitFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.panNumber;
                            return next;
                          });
                        }}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className={cn(
                          displaySubmitError("panNumber") && "border-red-600",
                        )}
                        aria-invalid={Boolean(displaySubmitError("panNumber"))}
                      />
                      <FormFieldError message={displaySubmitError("panNumber")} />
                    </div>
                  ) : null}
                </div>
                {uploadType === "AADHAAR" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["front", frontUploadId, frontRef],
                        ["back", backUploadId, backRef],
                      ] as const
                    ).map(([side, uploadId, ref]) => {
                      const err = displaySubmitError(side);
                      return (
                        <div key={side}>
                          <input
                            ref={ref}
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) void handleUpload(file, side);
                            }}
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => ref.current?.click()}
                            className={cn(
                              "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm hover:border-[#730321]",
                              err && "border-red-600 bg-red-50/50",
                            )}
                          >
                            <FileImage className="size-8 text-[#730321]" />
                            {uploadId
                              ? `Aadhaar ${side} uploaded`
                              : `Upload ${side}`}
                          </button>
                          <FormFieldError message={err} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <input
                      ref={panRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void handleUpload(file, "pan");
                      }}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => panRef.current?.click()}
                      className={cn(
                        "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm hover:border-[#730321]",
                        displaySubmitError("panUpload") &&
                          "border-red-600 bg-red-50/50",
                      )}
                    >
                      <FileImage className="size-8 text-[#730321]" />
                      {panUploadId ? "PAN image uploaded" : "Upload PAN card"}
                    </button>
                    <FormFieldError message={displaySubmitError("panUpload")} />
                  </div>
                )}
                <Button
                  disabled={busy || !submitReady}
                  onClick={async () => {
                    setSubmitAttempted(true);
                    const clientErrors = validateKycSubmit(submitFormState);
                    if (Object.keys(clientErrors).length) {
                      setSubmitFieldErrors(clientErrors);
                      toast.error("Fix the highlighted fields.");
                      return;
                    }
                    try {
                      await submitKycMutation({
                        id: customer.id,
                        type: uploadType,
                        number: uploadType === "PAN" ? panNumber.trim() : undefined,
                        frontUploadId:
                          uploadType === "AADHAAR"
                            ? (frontUploadId ?? undefined)
                            : (panUploadId ?? undefined),
                        backUploadId:
                          uploadType === "AADHAAR"
                            ? (backUploadId ?? undefined)
                            : undefined,
                      }).unwrap();
                      toast.success("KYC submitted for review");
                    } catch (err) {
                      toastApiError(err, "Could not submit KYC");
                    }
                  }}
                >
                  {busy && <Loader2 className="animate-spin" />}
                  Submit for review
                </Button>
              </div>
            ) : null}

            {(kyc?.documents?.length ?? 0) > 0 && !showUpload ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {kyc!.documents.map((doc) => (
                  <div
                    key={doc.side}
                    className="flex min-h-40 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border bg-muted/40 p-4"
                  >
                    {doc.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={doc.previewUrl}
                        alt={doc.label}
                        className="max-h-48 w-full rounded-lg object-contain"
                      />
                    ) : (
                      <FileImage className="size-10 text-[#730321]" />
                    )}
                    <span className="text-sm font-medium">{doc.label}</span>
                    {doc.previewUrl ? (
                      <a
                        href={doc.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#730321] underline"
                      >
                        Open full size
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">On file</span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {canReview ? (
              <div>
                <FieldLabel>Rejection remarks (required if rejecting)</FieldLabel>
                <Textarea
                  value={rejectRemarks}
                  onChange={(e) => {
                    setRejectRemarks(e.target.value);
                    setRejectFieldError(undefined);
                  }}
                  placeholder="Explain what is wrong with the document"
                  rows={3}
                  maxLength={KYC_REJECT_REMARKS_MAX}
                  className={cn(displayRejectError && "border-red-600")}
                  aria-invalid={Boolean(displayRejectError)}
                />
                <FormFieldError message={displayRejectError} />
              </div>
            ) : null}

            {isVerified ? (
              <p className="text-sm text-muted-foreground">
                This customer&apos;s KYC is verified. Further uploads are blocked
                until policy changes.
              </p>
            ) : null}
          </div>
        </DialogBody>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canReview ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="text-red-600"
                disabled={busy || !rejectReady}
                onClick={async () => {
                  const err = validateKycRejectRemarks(rejectRemarks);
                  if (err) {
                    setRejectFieldError(err);
                    toast.error("Fix the highlighted fields.");
                    return;
                  }
                  try {
                    await verifyKyc({
                      id: customer.id,
                      decision: "REJECTED",
                      remarks: rejectRemarks.trim(),
                    }).unwrap();
                    toast.success("KYC rejected");
                    onOpenChange(false);
                  } catch (e) {
                    toastApiError(e, "Could not reject KYC");
                  }
                }}
              >
                Reject
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  try {
                    await verifyKyc({
                      id: customer.id,
                      decision: "VERIFIED",
                    }).unwrap();
                    toast.success("KYC verified");
                    onOpenChange(false);
                  } catch (e) {
                    toastApiError(e, "Could not verify KYC");
                  }
                }}
              >
                {busy && <Loader2 className="animate-spin" />}
                Mark verified
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
