import type { TemplateDefinition, TenantTemplate } from "@/src/types/platform";

export const META_TEMPLATE_NAME_MIN = 3;
export const META_TEMPLATE_NAME_MAX = 512;
export const META_TEMPLATE_ID_MIN = 8;
export const META_TEMPLATE_ID_MAX = 32;
export const TEMPLATE_LANGUAGE_MAX = 10;
export const TEMPLATE_NOTES_MAX = 500;

export const TEMPLATE_APPROVAL_STATUSES = [
  "APPROVED",
  "PENDING",
  "REJECTED",
] as const;

export type TemplateApprovalStatus = (typeof TEMPLATE_APPROVAL_STATUSES)[number];

export type PlatformTenantTemplateForm = {
  templateName: string;
  templateId: string;
  languageCode: string;
  approvalStatus: TemplateApprovalStatus;
  notes: string;
};

export function defaultTemplateName(
  tenantCode: string,
  messageType: string,
): string {
  return `${tenantCode.toLowerCase()}_${messageType.toLowerCase()}_v1`;
}

export function platformTenantTemplateFormFromRegistration(
  tenantCode: string,
  definition: TemplateDefinition,
  current?: TenantTemplate,
): PlatformTenantTemplateForm {
  return {
    templateName:
      current?.templateName ??
      defaultTemplateName(tenantCode, definition.messageType),
    templateId: current?.templateId ?? "",
    languageCode: current?.languageCode ?? "en",
    approvalStatus: normalizeApprovalStatus(current?.approvalStatus),
    notes: current?.notes ?? "",
  };
}

export function normalizeApprovalStatus(
  value: string | undefined,
): TemplateApprovalStatus {
  if (value === "PENDING" || value === "REJECTED") return value;
  return "APPROVED";
}

export function sanitizeMetaTemplateNameInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, META_TEMPLATE_NAME_MAX);
}

export function sanitizeMetaTemplateIdInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, META_TEMPLATE_ID_MAX);
}

export function sanitizeTemplateLanguageInput(raw: string): string {
  return raw.trim().toLowerCase().slice(0, TEMPLATE_LANGUAGE_MAX);
}

function validateTemplateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Meta template name is required.";
  if (trimmed.length < META_TEMPLATE_NAME_MIN) {
    return `Template name must be at least ${META_TEMPLATE_NAME_MIN} characters.`;
  }
  if (name.length > META_TEMPLATE_NAME_MAX) {
    return `Template name must be ${META_TEMPLATE_NAME_MAX} characters or fewer.`;
  }
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return "Use lowercase letters, numbers, and underscores only.";
  }
  return undefined;
}

function validateTemplateId(id: string): string | undefined {
  const trimmed = id.trim();
  if (!trimmed) return "Meta template ID is required.";
  if (trimmed.length < META_TEMPLATE_ID_MIN) {
    return `Template ID must be at least ${META_TEMPLATE_ID_MIN} digits.`;
  }
  if (trimmed.length > META_TEMPLATE_ID_MAX) {
    return `Template ID must be ${META_TEMPLATE_ID_MAX} digits or fewer.`;
  }
  if (!/^\d+$/.test(trimmed)) {
    return "Template ID must contain digits only.";
  }
  return undefined;
}

function validateLanguageCode(code: string): string | undefined {
  const trimmed = code.trim().toLowerCase();
  if (!trimmed) return "Language code is required.";
  if (trimmed.length > TEMPLATE_LANGUAGE_MAX) {
    return `Language code must be ${TEMPLATE_LANGUAGE_MAX} characters or fewer.`;
  }
  if (!/^[a-z]{2}([_-][a-z]{2})?$/.test(trimmed)) {
    return "Use a valid language code (e.g. en or en_us).";
  }
  return undefined;
}

function validateNotes(notes: string): string | undefined {
  if (notes.length > TEMPLATE_NOTES_MAX) {
    return `Notes must be ${TEMPLATE_NOTES_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validatePlatformTenantTemplateForm(
  form: PlatformTenantTemplateForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const nameErr = validateTemplateName(form.templateName);
  if (nameErr) errors.templateName = nameErr;
  const idErr = validateTemplateId(form.templateId);
  if (idErr) errors.templateId = idErr;
  const langErr = validateLanguageCode(form.languageCode);
  if (langErr) errors.languageCode = langErr;
  const notesErr = validateNotes(form.notes);
  if (notesErr) errors.notes = notesErr;
  if (!TEMPLATE_APPROVAL_STATUSES.includes(form.approvalStatus)) {
    errors.approvalStatus = "Choose an approval status.";
  }
  return errors;
}

export function livePlatformTenantTemplateFieldErrors(
  form: PlatformTenantTemplateForm,
  touched: Partial<Record<keyof PlatformTenantTemplateForm, boolean>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (touched.templateName || form.templateName.trim()) {
    const e = validateTemplateName(form.templateName);
    if (e) errors.templateName = e;
  }
  if (touched.templateId || form.templateId.trim()) {
    const e = validateTemplateId(form.templateId);
    if (e) errors.templateId = e;
  }
  if (touched.languageCode || form.languageCode.trim()) {
    const e = validateLanguageCode(form.languageCode);
    if (e) errors.languageCode = e;
  }
  if (touched.notes && form.notes) {
    const e = validateNotes(form.notes);
    if (e) errors.notes = e;
  }
  return errors;
}

export function platformTenantTemplateFormReady(
  form: PlatformTenantTemplateForm,
): boolean {
  return Object.keys(validatePlatformTenantTemplateForm(form)).length === 0;
}

export function platformTenantTemplateFormUnchanged(
  form: PlatformTenantTemplateForm,
  baseline: PlatformTenantTemplateForm,
): boolean {
  return (
    form.templateName === baseline.templateName &&
    form.templateId === baseline.templateId &&
    form.languageCode === baseline.languageCode &&
    form.approvalStatus === baseline.approvalStatus &&
    form.notes === baseline.notes
  );
}

export function tenantTemplateRegistrationBodyForApi(
  form: PlatformTenantTemplateForm,
  definition: TemplateDefinition,
): Record<string, unknown> {
  return {
    templateName: form.templateName.trim(),
    templateId: form.templateId.trim(),
    languageCode: sanitizeTemplateLanguageInput(form.languageCode),
    approvalStatus: form.approvalStatus,
    notes: form.notes.trim(),
    variableOrder: definition.variables.map((v) => v.key),
    buttonUrlVariableKey: definition.hasUrlButton
      ? "paymentLinkToken"
      : undefined,
  };
}
