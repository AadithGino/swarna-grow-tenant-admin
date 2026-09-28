"use client";

import { Fragment, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  LoaderCircle,
  Lock,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadFileViaPresign } from "@/src/lib/upload-via-presign";
import {
  useCompleteCustomerUploadMutation,
  usePresignCustomerUploadMutation,
} from "@/src/store/api/customer-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  onSubmit: (payload: {
    type: string;
    frontUploadId?: string;
    backUploadId?: string;
  }) => Promise<void>;
  submitting?: boolean;
  disabled?: boolean;
  allowedTypes?: string[];
};

function IdCardGraphic() {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f5f0ec] text-[#b0a9b3]">
      <CreditCard className="size-5" strokeWidth={1.75} />
    </span>
  );
}

function DocumentUploadCard({
  title,
  hint,
  uploadId,
  onUpload,
  busy,
}: {
  title: string;
  hint: string;
  uploadId: string | null;
  onUpload: (file: File) => void;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-[#f0e6ea] bg-white p-4 shadow-[0_8px_28px_rgba(var(--customer-primary-rgb,115,3,33),0.07),0_1px_0_rgba(var(--customer-primary-rgb,115,3,33),0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#171722]">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#777280]">{hint}</p>
          {uploadId ? (
            <p className="mt-2 text-[11px] font-semibold text-emerald-700">Uploaded · ready</p>
          ) : null}
        </div>
        <IdCardGraphic />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onUpload(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="mt-4 h-11 w-full rounded-full border-[var(--customer-primary,#730321)] bg-[#faf6f3] font-bold text-[var(--customer-primary,#730321)] hover:bg-[#f6f0eb]"
      >
        <Upload className="mr-2 size-4" strokeWidth={2.25} />
        Upload
      </Button>
    </div>
  );
}

export function CustomerKycVerificationForm({ onSubmit, submitting, disabled, allowedTypes = ["AADHAAR", "PAN"] }: Props) {
  const [presignUpload] = usePresignCustomerUploadMutation();
  const [completeUpload] = useCompleteCustomerUploadMutation();
  const [panUploadId, setPanUploadId] = useState<string | null>(null);
  const [aadhaarFrontUploadId, setAadhaarFrontUploadId] = useState<string | null>(null);
  const [aadhaarBackUploadId, setAadhaarBackUploadId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const supportedTypes = allowedTypes.filter((type) => type === "AADHAAR" || type === "PAN");
  const [selectedType, setSelectedType] = useState(supportedTypes[0] ?? "AADHAAR");

  const busy = submitting || uploadBusy || disabled;
  const ready = selectedType === "PAN"
    ? Boolean(panUploadId)
    : Boolean(aadhaarFrontUploadId && aadhaarBackUploadId);

  const handleUpload = async (file: File, target: "pan" | "aadhaarFront" | "aadhaarBack") => {
    setUploadBusy(true);
    try {
      const uploadId = await uploadFileViaPresign(
        file,
        (input) => presignUpload(input).unwrap(),
        "KYC_DOCUMENT",
        (id) => completeUpload(id).unwrap(),
      );
      if (target === "pan") setPanUploadId(uploadId);
      if (target === "aadhaarFront") setAadhaarFrontUploadId(uploadId);
      if (target === "aadhaarBack") setAadhaarBackUploadId(uploadId);
      toast.success("Document uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadBusy(false);
    }
  };

  const submit = async () => {
    if (!ready) return;
    await onSubmit({
      type: selectedType,
      frontUploadId: selectedType === "PAN" ? panUploadId ?? undefined : aadhaarFrontUploadId ?? undefined,
      backUploadId: selectedType === "AADHAAR" ? aadhaarBackUploadId ?? undefined : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {supportedTypes.length > 1 ? (
        <div>
          <label className="text-xs font-bold text-[#706b77]">Identity document</label>
          <Select value={selectedType} onValueChange={(value) => setSelectedType(value as "AADHAAR" | "PAN")} disabled={busy}>
            <SelectTrigger className="mt-2 h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {supportedTypes.map((type) => <SelectItem key={type} value={type}>{type === "AADHAAR" ? "Aadhaar" : "PAN"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {selectedType === "PAN" ? (
        <DocumentUploadCard
          title="PAN card"
          hint="Upload a clear image or PDF of your PAN card."
          uploadId={panUploadId}
          busy={busy}
          onUpload={(file) => void handleUpload(file, "pan")}
        />
      ) : (
        <>
          <DocumentUploadCard
            title="Aadhaar front"
            hint="Upload a clear image of the front side."
            uploadId={aadhaarFrontUploadId}
            busy={busy}
            onUpload={(file) => void handleUpload(file, "aadhaarFront")}
          />
          <DocumentUploadCard
            title="Aadhaar back"
            hint="Upload a clear image of the back side."
            uploadId={aadhaarBackUploadId}
            busy={busy}
            onUpload={(file) => void handleUpload(file, "aadhaarBack")}
          />
        </>
      )}

      <p className="flex items-start gap-2 px-0.5 pt-1 text-[11px] leading-relaxed text-[#706b77]">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-[#8a8490]" strokeWidth={2} />
        Documents are encrypted and used only for verification.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-[10px] font-semibold text-[#706b77]">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-3.5 text-[#c9a227]" strokeWidth={2.25} />
          Pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-emerald-600" strokeWidth={2.25} />
          Verified
        </span>
        <span className="inline-flex items-center gap-1.5">
          <XCircle className="size-3.5 text-red-600" strokeWidth={2.25} />
          Rejected
        </span>
      </div>

      <Button
        disabled={busy || !ready}
        onClick={submit}
        className={cn(
          "h-12 w-full rounded-full text-base font-black",
          ready && !busy
            ? "text-white"
            : "cursor-not-allowed bg-[#d8d2cc] text-[#8a8490] hover:bg-[#d8d2cc]",
        )}
        style={ready && !busy ? { background: "var(--customer-primary, #730321)" } : undefined}
      >
        {busy ? <LoaderCircle className="animate-spin" /> : "Submit for verification"}
      </Button>
    </div>
  );
}

export function KycStatusHero({
  status,
}: {
  status?: string;
  statusLabel?: string;
}) {
  const isVerified = status === "VERIFIED";
  const isRejected = status === "REJECTED";
  const isPending = status === "SUBMITTED" || status === "PENDING";
  const isNotSubmitted = !isVerified && !isRejected && !isPending;

  const title = isVerified
    ? "Verified"
    : isRejected
      ? "Rejected"
      : isPending
        ? "Under review"
        : "Not submitted";

  const subtitle = isVerified
    ? "Your identity is verified. Contact your branch to update documents."
    : isRejected
      ? "Please upload corrected documents."
      : isPending
        ? "Your jeweller is reviewing your documents."
        : "Verify your identity before enrolling in a new plan.";

  return (
    <div
      className="flex gap-3 rounded-2xl p-4"
      style={{ background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.08)" }}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[var(--customer-primary,#730321)]">
        <FileText className="size-5" strokeWidth={2} />
      </span>
      <div className="text-sm leading-relaxed text-[#706b77]">
        {isNotSubmitted ? (
          <>
            <span className="font-black text-[var(--customer-primary,#730321)]">{title}: </span>
            {subtitle}
          </>
        ) : (
          <>
            <span className="font-black text-[#171722]">{title}: </span>
            {subtitle}
          </>
        )}
      </div>
    </div>
  );
}

export function KycStepper({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Identity" },
    { n: 2, label: "Documents" },
    { n: 3, label: "Review" },
  ] as const;

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => (
        <Fragment key={step.n}>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full text-[11px] font-black",
                activeStep >= step.n
                  ? "bg-[var(--customer-primary,#730321)] text-white"
                  : "bg-[#ece6e1] text-[#8a8490]",
              )}
            >
              {step.n}
            </span>
            <span
              className={cn(
                "text-[11px] font-bold",
                activeStep >= step.n ? "text-[var(--customer-primary,#730321)]" : "text-[#8a8490]",
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <span
              className={cn(
                "mx-2 h-0.5 min-w-[1.25rem] flex-1 rounded-full",
                activeStep > step.n
                  ? "bg-[var(--customer-primary,#730321)]"
                  : "bg-[#ece6e1]",
              )}
              aria-hidden
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
