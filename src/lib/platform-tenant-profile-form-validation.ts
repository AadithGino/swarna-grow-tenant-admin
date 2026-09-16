import { sanitizeIndianPhoneDigits } from "@/src/lib/customer-form";
import { validatePlatformLoginEmail } from "@/src/lib/platform-login-form-validation";
import type { PlatformTenantDetail } from "@/src/types/platform";
import { sanitizeBranchCodeInput } from "@/src/lib/access-form-validation";
import { validateGstinOptional } from "@/src/lib/settings-form-validation";
import {
  validateBusinessName as validateLegalBusinessName,
  validateDisplayName as validateTenantDisplayName,
  validateCity as validateTenantCity,
  validateOptionalAddress,
  validateOptionalSupportNumber,
  supportNumberForPlatformApi,
} from "@/src/lib/platform-tenant-create-form-validation";

export const TENANT_CODE_MIN = 2;
export const TENANT_CODE_MAX = 12;
const TENANT_CODE_RE = /^[A-Z0-9]{2,12}$/;

export function platformTenantProfileFormFromDetail(
  tenant: PlatformTenantDetail,
): PlatformTenantProfileForm {
  return {
    businessName: tenant.businessName,
    displayName: tenant.displayName,
    ownerEmail: tenant.ownerEmail ?? tenant.owner.email ?? "",
    supportNumber: sanitizeIndianPhoneDigits(tenant.supportNumber ?? ""),
    gstin: tenant.gstin ?? "",
    city: tenant.city ?? "",
    address: tenant.address ?? "",
    tenantCode: tenant.tenantCode,
  };
}

export type PlatformTenantProfileForm = {
  businessName: string;
  displayName: string;
  ownerEmail: string;
  supportNumber: string;
  gstin: string;
  city: string;
  address: string;
  tenantCode: string;
};

export function sanitizeTenantCodeInput(raw: string): string {
  return sanitizeBranchCodeInput(raw).slice(0, TENANT_CODE_MAX);
}

export function validateTenantCode(
  code: string,
  options?: { required?: boolean },
): string | undefined {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return options?.required ? "Tenant code is required." : undefined;
  }
  if (!TENANT_CODE_RE.test(trimmed)) {
    return `Use ${TENANT_CODE_MIN}–${TENANT_CODE_MAX} uppercase letters or numbers.`;
  }
  return undefined;
}

export function validatePlatformTenantProfileForm(
  form: PlatformTenantProfileForm,
  options?: { tenantCodeEditable?: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const bn = validateLegalBusinessName(form.businessName);
  if (bn) errors.businessName = bn;
  const dn = validateTenantDisplayName(form.displayName);
  if (dn) errors.displayName = dn;
  const cityErr = validateTenantCity(form.city);
  if (cityErr) errors.city = cityErr;
  const emailErr = validatePlatformLoginEmail(form.ownerEmail);
  if (emailErr) errors.ownerEmail = emailErr;
  const gstErr = validateGstinOptional(form.gstin);
  if (gstErr) errors.gstin = gstErr;
  const addrErr = validateOptionalAddress(form.address);
  if (addrErr) errors.address = addrErr;
  const supportErr = validateOptionalSupportNumber(form.supportNumber);
  if (supportErr) errors.supportNumber = supportErr;
  if (options?.tenantCodeEditable) {
    const codeErr = validateTenantCode(form.tenantCode, { required: true });
    if (codeErr) errors.tenantCode = codeErr;
  }
  return errors;
}

export function livePlatformTenantProfileFieldErrors(
  form: PlatformTenantProfileForm,
  touched: Partial<Record<keyof PlatformTenantProfileForm, boolean>>,
  options?: { tenantCodeEditable?: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (touched.businessName || form.businessName.trim()) {
    const e = validateLegalBusinessName(form.businessName);
    if (e) errors.businessName = e;
  }
  if (touched.displayName || form.displayName.trim()) {
    const e = validateTenantDisplayName(form.displayName);
    if (e) errors.displayName = e;
  }
  if (touched.city || form.city.trim()) {
    const e = validateTenantCity(form.city);
    if (e) errors.city = e;
  }
  if (touched.ownerEmail || form.ownerEmail.trim()) {
    const e = validatePlatformLoginEmail(form.ownerEmail);
    if (e) errors.ownerEmail = e;
  }
  if (touched.gstin && form.gstin.trim()) {
    const e = validateGstinOptional(form.gstin);
    if (e) errors.gstin = e;
  }
  if (touched.address && form.address) {
    const e = validateOptionalAddress(form.address);
    if (e) errors.address = e;
  }
  if (touched.supportNumber || form.supportNumber.replace(/\D/g, "")) {
    const e = validateOptionalSupportNumber(form.supportNumber);
    if (e) errors.supportNumber = e;
  }
  if (options?.tenantCodeEditable && (touched.tenantCode || form.tenantCode.trim())) {
    const e = validateTenantCode(form.tenantCode, { required: true });
    if (e) errors.tenantCode = e;
  }
  return errors;
}

export function platformTenantProfileFormReady(
  form: PlatformTenantProfileForm,
  options?: { tenantCodeEditable?: boolean },
): boolean {
  return (
    Object.keys(validatePlatformTenantProfileForm(form, options)).length === 0
  );
}

export function profileSupportNumberForApi(raw: string): string | undefined {
  return supportNumberForPlatformApi(raw);
}
