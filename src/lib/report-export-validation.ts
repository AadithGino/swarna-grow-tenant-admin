import { validateListDateRange } from "@/src/lib/list-date-range";

export const EXPORT_FORMATS = ["CSV", "XLSX", "PDF"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function validateExportFormat(format: string): string | undefined {
  if (!EXPORT_FORMATS.includes(format as ExportFormat)) {
    return "Choose CSV, Excel, or PDF.";
  }
  return undefined;
}

export function validateReportExportRequest(input: {
  reportKey: string;
  format: string;
  from: string;
  to: string;
  customerId?: string;
  requireCustomer?: boolean;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const formatErr = validateExportFormat(input.format);
  if (formatErr) errors.format = formatErr;

  const rangeErr = validateListDateRange(input.from, input.to);
  if (rangeErr) errors.dateRange = rangeErr;

  if (input.requireCustomer && !input.customerId?.trim()) {
    errors.customerId = "Select a customer for the ledger export.";
  }

  if (!input.reportKey?.trim()) {
    errors.reportKey = "Select a report type.";
  }

  return errors;
}

export function reportExportReady(input: {
  reportKey: string;
  format: string;
  from: string;
  to: string;
  customerId?: string;
  requireCustomer?: boolean;
}): boolean {
  return Object.keys(validateReportExportRequest(input)).length === 0;
}
