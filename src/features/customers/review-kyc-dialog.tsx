"use client";

import { useEffect, useRef, useState } from "react";
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
import { FieldLabel } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import type { Customer } from "@/src/types/domain";
import {
  usePresignUploadMutation,
  useSubmitCustomerKycMutation,
  useVerifyCustomerKycMutation,
} from "@/src/store/api/admin-api";
import { uploadFileViaPresign } from "@/src/lib/upload-via-presign";
import { cn } from "@/lib/utils";

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
  }, [open, customer.id]);

  const busy = verifyState.isLoading || submitState.isLoading || uploadBusy;
  const canReview = status === "SUBMITTED";
  const isVerified = status === "VERIFIED";
  const isRejected = status === "REJECTED";
  const showUpload =
    !isVerified && (status === "NOT_SUBMITTED" || isRejected);

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
      if (target === "front") setFrontUploadId(uploadId);
      if (target === "back") setBackUploadId(uploadId);
      if (target === "pan") setPanUploadId(uploadId);
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
                      onValueChange={(v) =>
                        setUploadType(v as "AADHAAR" | "PAN")
                      }
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
                        onChange={(e) =>
                          setPanNumber(e.target.value.toUpperCase())
                        }
                        placeholder="ABCDE1234F"
                      />
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
                    ).map(([side, uploadId, ref]) => (
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
                          className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm hover:border-[#730321]"
                        >
                          <FileImage className="size-8 text-[#730321]" />
                          {uploadId
                            ? `Aadhaar ${side} uploaded`
                            : `Upload ${side}`}
                        </button>
                      </div>
                    ))}
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
                      className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm hover:border-[#730321]"
                    >
                      <FileImage className="size-8 text-[#730321]" />
                      {panUploadId ? "PAN image uploaded" : "Upload PAN card"}
                    </button>
                  </div>
                )}
                <Button
                  disabled={busy}
                  onClick={async () => {
                    if (
                      uploadType === "AADHAAR" &&
                      (!frontUploadId || !backUploadId)
                    ) {
                      toast.error("Upload both sides of Aadhaar");
                      return;
                    }
                    if (uploadType === "PAN" && !panNumber.trim()) {
                      toast.error("Enter PAN number");
                      return;
                    }
                    if (uploadType === "PAN" && !panUploadId) {
                      toast.error("Upload PAN image");
                      return;
                    }
                    await submitKycMutation({
                      id: customer.id,
                      type: uploadType,
                      number: uploadType === "PAN" ? panNumber : undefined,
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
                  }}
                >
                  {busy && <Loader2 className="animate-spin" />}
                  Submit for review
                </Button>
              </div>
            ) : null}

            {kyc?.documents.length && !showUpload ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {kyc.documents.map((doc) => (
                  <div
                    key={doc.side}
                    className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border bg-muted/40 p-4"
                  >
                    <FileImage className="size-10 text-[#730321]" />
                    <span className="text-sm font-medium">{doc.label}</span>
                    {doc.previewUrl ? (
                      <a
                        href={doc.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#730321] underline"
                      >
                        View document
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        On file
                      </span>
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
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="Explain what is wrong with the document"
                  rows={3}
                />
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
                disabled={busy}
                onClick={async () => {
                  if (!rejectRemarks.trim()) {
                    toast.error("Rejection remarks are required");
                    return;
                  }
                  await verifyKyc({
                    id: customer.id,
                    decision: "REJECTED",
                    remarks: rejectRemarks,
                  }).unwrap();
                  toast.success("KYC rejected");
                  onOpenChange(false);
                }}
              >
                Reject
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  await verifyKyc({
                    id: customer.id,
                    decision: "VERIFIED",
                  }).unwrap();
                  toast.success("KYC verified");
                  onOpenChange(false);
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
