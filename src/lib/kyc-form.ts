export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const KYC_NUMBER_MIN = 4;
export const KYC_NUMBER_MAX = 32;
export const KYC_REJECT_REMARKS_MIN = 3;
export const KYC_REJECT_REMARKS_MAX = 500;

export type KycUploadType = "AADHAAR" | "PAN";

export type KycSubmitFormState = {
  type: KycUploadType;
  panNumber: string;
  frontUploadId: string | null;
  backUploadId: string | null;
  panUploadId: string | null;
};

export function sanitizePanInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

export function livePanNumberError(pan: string): string | undefined {
  const value = pan.trim();
  if (!value) return undefined;
  if (value.length < 10) {
    const left = 10 - value.length;
    return `${left} more character${left === 1 ? "" : "s"} needed.`;
  }
  if (!PAN_PATTERN.test(value)) {
    return "Enter a valid PAN (5 letters, 4 digits, 1 letter — e.g. ABCDE1234F).";
  }
  return undefined;
}

export function validatePanNumber(pan: string): string | undefined {
  const value = pan.trim();
  if (!value) return "PAN number is required.";
  if (value.length < KYC_NUMBER_MIN) {
    return `PAN must be at least ${KYC_NUMBER_MIN} characters.`;
  }
  if (value.length > KYC_NUMBER_MAX) {
    return `PAN must be ${KYC_NUMBER_MAX} characters or fewer.`;
  }
  if (!PAN_PATTERN.test(value)) {
    return "Enter a valid PAN (e.g. ABCDE1234F).";
  }
  return undefined;
}

export function liveKycSubmitFieldErrors(
  state: KycSubmitFormState,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (state.type === "PAN") {
    const panLive = livePanNumberError(state.panNumber);
    if (panLive) out.panNumber = panLive;
  }
  return out;
}

export function validateKycSubmit(
  state: KycSubmitFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (state.type === "AADHAAR") {
    if (!state.frontUploadId) {
      errors.front = "Upload the front of Aadhaar.";
    }
    if (!state.backUploadId) {
      errors.back = "Upload the back of Aadhaar.";
    }
  } else {
    const panErr = validatePanNumber(state.panNumber);
    if (panErr) errors.panNumber = panErr;
    if (!state.panUploadId) {
      errors.panUpload = "Upload PAN card image.";
    }
  }
  return errors;
}

export function kycSubmitReadyForSubmit(state: KycSubmitFormState): boolean {
  return Object.keys(validateKycSubmit(state)).length === 0;
}

export function liveKycRejectRemarksError(remarks: string): string | undefined {
  const trimmed = remarks.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < KYC_REJECT_REMARKS_MIN) {
    return `Remarks must be at least ${KYC_REJECT_REMARKS_MIN} characters.`;
  }
  if (remarks.length > KYC_REJECT_REMARKS_MAX) {
    return `Remarks must be ${KYC_REJECT_REMARKS_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateKycRejectRemarks(remarks: string): string | undefined {
  const trimmed = remarks.trim();
  if (!trimmed) {
    return "Rejection remarks are required.";
  }
  if (trimmed.length < KYC_REJECT_REMARKS_MIN) {
    return `Remarks must be at least ${KYC_REJECT_REMARKS_MIN} characters.`;
  }
  if (trimmed.length > KYC_REJECT_REMARKS_MAX) {
    return `Remarks must be ${KYC_REJECT_REMARKS_MAX} characters or fewer.`;
  }
  return undefined;
}

export function kycRejectRemarksReady(remarks: string): boolean {
  return validateKycRejectRemarks(remarks) === undefined;
}
