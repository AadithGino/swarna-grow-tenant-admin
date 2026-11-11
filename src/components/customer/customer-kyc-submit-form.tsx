"use client";

import { useMemo, useRef, useState } from "react";
import { FileImage, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  kycSubmitReadyForSubmit,
  liveKycSubmitFieldErrors,
  sanitizePanInput,
  validateKycSubmit,
  type KycSubmitFormState,
  type KycUploadType,
} from "@/src/lib/kyc-form";
import { uploadFileViaPresign } from "@/src/lib/upload-via-presign";
import {
  useCompleteCustomerUploadMutation,
  usePresignCustomerUploadMutation,
} from "@/src/store/api/customer-api";
import { toast } from "sonner";

type PresignInput = {
  purpose: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

type Props = {
  onSubmit: (payload: {
    type: string;
    number?: string;
    numberMasked?: string;
    frontUploadId?: string;
    backUploadId?: string;
  }) => Promise<void>;
  submitting?: boolean;
  /** Override upload transport (agent/staff portal uses /staff/uploads). */
  uploadViaPresign?: (
    file: File,
    purpose: string,
  ) => Promise<string>;
};

export function CustomerKycSubmitForm({ onSubmit, submitting, uploadViaPresign }: Props) {
  const [presignUpload] = usePresignCustomerUploadMutation();
  const [completeUpload] = useCompleteCustomerUploadMutation();
  const [uploadType, setUploadType] = useState<KycUploadType>("AADHAAR");
  const [panNumber, setPanNumber] = useState("");
  const [frontUploadId, setFrontUploadId] = useState<string | null>(null);
  const [backUploadId, setBackUploadId] = useState<string | null>(null);
  const [panUploadId, setPanUploadId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);

  const formState: KycSubmitFormState = useMemo(
    () => ({ type: uploadType, panNumber, frontUploadId, backUploadId, panUploadId }),
    [uploadType, panNumber, frontUploadId, backUploadId, panUploadId],
  );
  const errors = useMemo(() => (attempted ? validateKycSubmit(formState) : liveKycSubmitFieldErrors(formState)), [attempted, formState]);
  const ready = kycSubmitReadyForSubmit(formState);

  const handleUpload = async (file: File, target: "front" | "back" | "pan") => {
    setUploadBusy(true);
    try {
      const uploadId = uploadViaPresign
        ? await uploadViaPresign(file, "KYC_DOCUMENT")
        : await uploadFileViaPresign(
            file,
            (input: PresignInput) =>
              presignUpload({
                purpose: input.purpose,
                fileName: input.fileName,
                contentType: input.contentType,
                sizeBytes: input.sizeBytes,
              }).unwrap(),
            "KYC_DOCUMENT",
            (id) => completeUpload(id).unwrap(),
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
  };

  const submit = async () => {
    setAttempted(true);
    const validation = validateKycSubmit(formState);
    if (Object.keys(validation).length) return;
    const pan = panNumber.trim();
    await onSubmit({
      type: uploadType,
      ...(uploadType === "PAN"
        ? {
            number: pan,
            numberMasked: `${pan.slice(0, 2)}XXXXX${pan.slice(-1)}`,
            frontUploadId: panUploadId ?? undefined,
          }
        : { frontUploadId: frontUploadId ?? undefined, backUploadId: backUploadId ?? undefined }),
    });
  };

  const busy = submitting || uploadBusy;

  return (
    <div className="space-y-5">
      <div>
        <Label>Document type</Label>
        <Select value={uploadType} onValueChange={(v) => setUploadType(v as KycUploadType)}>
          <SelectTrigger className="mt-2">
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
          <Label>PAN number</Label>
          <Input
            value={panNumber}
            onChange={(e) => setPanNumber(sanitizePanInput(e.target.value))}
            placeholder="ABCDE1234F"
            maxLength={10}
            className={cn("mt-2", errors.panNumber && "border-red-600")}
          />
          {errors.panNumber ? <p className="mt-1 text-xs text-red-600">{errors.panNumber}</p> : null}
        </div>
      ) : null}
      {uploadType === "AADHAAR" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["front", frontUploadId, frontRef, "Front"],
              ["back", backUploadId, backRef, "Back"],
            ] as const
          ).map(([side, uploadId, ref, label]) => (
            <div key={side}>
              <input
                ref={ref}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
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
                  "flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm",
                  errors[side] && "border-red-600 bg-red-50/40",
                )}
              >
                <FileImage className="size-7 text-[#730321]" />
                {uploadId ? `${label} uploaded` : `Upload ${label.toLowerCase()}`}
              </button>
              {errors[side] ? <p className="mt-1 text-xs text-red-600">{errors[side]}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <div>
          <input
            ref={panRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
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
              "flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm",
              errors.panUpload && "border-red-600 bg-red-50/40",
            )}
          >
            <FileImage className="size-7 text-[#730321]" />
            {panUploadId ? "PAN card uploaded" : "Upload PAN card"}
          </button>
          {errors.panUpload ? <p className="mt-1 text-xs text-red-600">{errors.panUpload}</p> : null}
        </div>
      )}
      <Button disabled={busy || !ready} onClick={submit} className="h-12 w-full rounded-xl bg-[#730321] font-bold">
        {busy ? <LoaderCircle className="animate-spin" /> : "Submit for verification"}
      </Button>
    </div>
  );
}
