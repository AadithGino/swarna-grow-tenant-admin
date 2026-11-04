import { LIST_SEARCH_QUERY_MAX, validateListSearchQuery } from "@/src/lib/list-date-range";

export const WEBHOOK_PROVIDER_FILTERS = ["ALL", "PHONEPE"] as const;
export type WebhookProviderFilter = (typeof WEBHOOK_PROVIDER_FILTERS)[number];

export const MONITORING_TENANT_ID_MAX = 80;
export const MONITORING_TRACE_ID_MAX = 64;

const TENANT_ID_RE = /^[a-z][a-z0-9_]{3,79}$/i;
const TRACE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateWebhookProviderFilter(
  provider: string,
): string | undefined {
  if (!WEBHOOK_PROVIDER_FILTERS.includes(provider as WebhookProviderFilter)) {
    return "Choose a valid webhook provider filter.";
  }
  return undefined;
}

export function sanitizeMonitoringTenantIdInput(raw: string): string {
  return raw.trim().slice(0, MONITORING_TENANT_ID_MAX);
}

export function sanitizeMonitoringTraceIdInput(raw: string): string {
  return raw.trim().slice(0, MONITORING_TRACE_ID_MAX);
}

export function validateMonitoringTenantIdFilter(
  tenantId: string,
): string | undefined {
  const trimmed = tenantId.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MONITORING_TENANT_ID_MAX) {
    return `Tenant ID must be ${MONITORING_TENANT_ID_MAX} characters or fewer.`;
  }
  if (!TENANT_ID_RE.test(trimmed)) {
    return "Enter a valid tenant ID (e.g. tnt_…).";
  }
  return undefined;
}

export function validateMonitoringTraceIdFilter(
  traceId: string,
): string | undefined {
  const trimmed = traceId.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MONITORING_TRACE_ID_MAX) {
    return `Trace ID must be ${MONITORING_TRACE_ID_MAX} characters or fewer.`;
  }
  if (!TRACE_ID_RE.test(trimmed)) {
    return "Enter a full UUID trace ID.";
  }
  return undefined;
}

export function validateMonitoringClientSearchQuery(
  q: string,
): string | undefined {
  return validateListSearchQuery(q);
}

export { LIST_SEARCH_QUERY_MAX };
