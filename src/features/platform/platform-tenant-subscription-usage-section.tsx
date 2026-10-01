"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  Flag,
  ReceiptIndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { DataTable, type DataColumn } from "@/src/components/common/data-table";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { handleFormApiError } from "@/src/lib/form-api-error";
import { fieldLabel } from "@/src/lib/field-labels";
import {
  createPlatformInvoiceBodyForApi,
  emptyCreatePlatformInvoiceForm,
  flagsRecordUnchanged,
  limitOverridesUnchanged,
  liveCreatePlatformInvoiceFieldErrors,
  sanitizeExtensionDaysInput,
  sanitizeLimitOverrideInput,
  validateChangePlanForm,
  validateCreatePlatformInvoiceForm,
  validateExtendSubscriptionForm,
  validateLimitOverridesRecord,
  validatePlatformFlagsReason,
  type CreatePlatformInvoiceForm,
  type PlatformBillingCycle,
  type SubscriptionExtensionType,
} from "@/src/lib/platform-tenant-subscription-form-validation";
import {
  useCancelTenantSubscriptionMutation,
  useChangeTenantPlanMutation,
  useCreateTenantInvoiceMutation,
  useExtendTenantSubscriptionMutation,
  useGetPlatformFlagsQuery,
  useGetPlatformPlansQuery,
  useGetPlatformUsageQuery,
  useGetTenantInvoicesQuery,
  useMarkPlatformInvoicePaidMutation,
  useSavePlatformFlagsMutation,
  useUpdateTenantLimitsMutation,
} from "@/src/store/api/platform-api";
import type { PlatformInvoice, PlatformTenantDetail } from "@/src/types/platform";

const label = fieldLabel;

function Info({
  label: text,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {text}
      </p>
      <p className="mt-1 break-words font-semibold">{value || "—"}</p>
    </div>
  );
}

function boolLabel(value: boolean | undefined): string {
  return value ? "Yes" : "No";
}

function defaultLimitOverrides(
  tenant: PlatformTenantDetail,
): Record<string, number> {
  const o = tenant.subscription.limitOverrides ?? {};
  if (Object.keys(o).length) {
    return Object.fromEntries(
      Object.entries(o).map(([k, v]) => [k, Number(v ?? 0)]),
    );
  }
  return {
    activeCustomers: 8000,
    branches: 12,
    whatsappMessagesPerMonth: 50000,
  };
}

function CreatePlatformInvoiceDialog({ tenantId }: { tenantId: string }) {
  const [create] = useCreateTenantInvoiceMutation();
  const [form, setForm] = useState<CreatePlatformInvoiceForm>(
    emptyCreatePlatformInvoiceForm,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof CreatePlatformInvoiceForm, boolean>>
  >({});

  const liveErrors = useMemo(
    () => liveCreatePlatformInvoiceFieldErrors(form, touched),
    [form, touched],
  );

  const displayError = (field: keyof CreatePlatformInvoiceForm) =>
    fieldErrors[field] ?? liveErrors[field];

  const setField = <K extends keyof CreatePlatformInvoiceForm>(
    key: K,
    value: CreatePlatformInvoiceForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const resetForm = () => {
    setForm(emptyCreatePlatformInvoiceForm());
    setFieldErrors({});
    setTouched({});
  };

  const submitDisabled =
    Object.keys(validateCreatePlatformInvoiceForm(form)).length > 0;

  return (
    <ActionDialog
      trigger={
        <Button>
          <ReceiptIndianRupee />
          Create invoice
        </Button>
      }
      title="Create manual invoice"
      actionLabel="Create invoice"
      submitDisabled={submitDisabled}
      suppressDefaultErrorToast
      onOpenChange={(open) => {
        if (open) resetForm();
      }}
      onError={(err) => {
        handleFormApiError(err, {
          setFieldErrors,
          fallback: "Could not create invoice",
        });
      }}
      onSubmit={async () => {
        setTouched({
          amountRupees: true,
          dueDate: true,
          description: true,
          taxPercent: true,
        });
        const clientErrors = validateCreatePlatformInvoiceForm(form);
        if (Object.keys(clientErrors).length) {
          setFieldErrors(clientErrors);
          toast.error("Fix the highlighted fields.");
          return false;
        }
        await create({
          tenantId,
          body: createPlatformInvoiceBodyForApi(form),
        }).unwrap();
        toast.success("Invoice created");
      }}
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Subtotal amount (₹) *</FieldLabel>
          <Input
            inputMode="numeric"
            value={String(form.amountRupees)}
            onChange={(e) => {
              setTouched((p) => ({ ...p, amountRupees: true }));
              const digits = e.target.value.replace(/\D/g, "");
              setField(
                "amountRupees",
                digits ? Number(digits) : 0,
              );
            }}
            className={cn(displayError("amountRupees") && "border-red-600")}
            aria-invalid={Boolean(displayError("amountRupees"))}
          />
          <FormFieldError message={displayError("amountRupees")} />
        </div>
        <div>
          <FieldLabel>Due date *</FieldLabel>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => {
              setTouched((p) => ({ ...p, dueDate: true }));
              setField("dueDate", e.target.value);
            }}
            className={cn(displayError("dueDate") && "border-red-600")}
            aria-invalid={Boolean(displayError("dueDate"))}
          />
          <FormFieldError message={displayError("dueDate")} />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <Input
            value={form.description}
            onChange={(e) => {
              setTouched((p) => ({ ...p, description: true }));
              setField("description", e.target.value.slice(0, 200));
            }}
          />
        </div>
        <div>
          <FieldLabel>Tax percent *</FieldLabel>
          <Input
            inputMode="numeric"
            value={String(form.taxPercent)}
            onChange={(e) => {
              setTouched((p) => ({ ...p, taxPercent: true }));
              const digits = e.target.value.replace(/\D/g, "");
              setField("taxPercent", digits ? Number(digits) : 0);
            }}
            className={cn(displayError("taxPercent") && "border-red-600")}
            aria-invalid={Boolean(displayError("taxPercent"))}
          />
          <FormFieldError message={displayError("taxPercent")} />
        </div>
      </div>
    </ActionDialog>
  );
}

export function TenantSubscription({
  tenant,
}: {
  tenant: PlatformTenantDetail;
}) {
  const plans = useGetPlatformPlansQuery();
  const invoices = useGetTenantInvoicesQuery(tenant.id);
  const [changePlan, changePlanState] = useChangeTenantPlanMutation();
  const [extend, extendState] = useExtendTenantSubscriptionMutation();
  const [cancel] = useCancelTenantSubscriptionMutation();
  const [markPaid] = useMarkPlatformInvoicePaidMutation();

  const [planId, setPlanId] = useState("");
  const [cycle, setCycle] = useState<PlatformBillingCycle>("MONTHLY");
  const [planErrors, setPlanErrors] = useState<Record<string, string>>({});

  const [extensionType, setExtensionType] =
    useState<SubscriptionExtensionType>("SUBSCRIPTION");
  const [days, setDays] = useState(14);
  const [extendErrors, setExtendErrors] = useState<Record<string, string>>({});
  const [extendDaysTouched, setExtendDaysTouched] = useState(false);

  const invoiceCols = useMemo<DataColumn<PlatformInvoice>[]>(
    () => [
      {
        key: "number",
        header: "Invoice",
        render: (r) => (
          <div>
            <p className="font-semibold">{r.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">Due {r.dueDate}</p>
          </div>
        ),
      },
      {
        key: "subtotal",
        header: "Subtotal",
        render: (r) => r.subtotal.amountDisplay,
      },
      { key: "tax", header: "Tax", render: (r) => r.tax.amountDisplay },
      {
        key: "amount",
        header: "Total",
        render: (r) => r.total.amountDisplay,
      },
      {
        key: "status",
        header: "Status",
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: "paid",
        header: "Paid at",
        render: (r) =>
          r.paidAt ? new Date(r.paidAt).toLocaleDateString("en-IN") : "—",
      },
      {
        key: "actions",
        header: "",
        render: (r) => (
          <div className="flex gap-2">
            {r.status === "UNPAID" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async (e) => {
                  e.stopPropagation();
                  await markPaid(r.id).unwrap();
                  toast.success("Invoice marked paid");
                }}
              >
                Mark paid
              </Button>
            ) : null}
            {r.pdfUrl && r.pdfUrl !== "#" ? (
              <Button size="sm" variant="ghost" asChild>
                <a href={r.pdfUrl} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  PDF
                </a>
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [markPaid],
  );

  const changePlanReady =
    Object.keys(validateChangePlanForm({ planId, billingCycle: cycle }))
      .length === 0;

  const extendReady =
    Object.keys(
      validateExtendSubscriptionForm({ extensionType, days }),
    ).length === 0;

  const extendDaysLiveError =
    extendDaysTouched && validateExtendSubscriptionForm({ extensionType, days }).days;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-3">
        <Surface title="Current subscription">
          <div className="space-y-4 p-5">
            <Info label="Tier" value={tenant.subscription.tier} />
            <Info label="Status" value={tenant.subscription.status} />
            <Info label="Billing cycle" value={tenant.subscription.billingCycle} />
            <Info
              label="Period start"
              value={tenant.subscription.currentPeriodStart ?? "—"}
            />
            <Info label="Period ends" value={tenant.subscription.currentPeriodEnd} />
            <Info
              label="Days remaining"
              value={String(tenant.subscription.daysRemaining ?? "—")}
            />
          </div>
          {tenant.subscription.features &&
            Object.keys(tenant.subscription.features).length > 0 && (
              <div className="border-t p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Plan features
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(tenant.subscription.features).map(
                    ([key, on]) => (
                      <div
                        key={key}
                        className="flex justify-between gap-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {label(key)}
                        </span>
                        <strong>{boolLabel(on)}</strong>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          {tenant.subscription.limitOverrides &&
            Object.keys(tenant.subscription.limitOverrides).length > 0 && (
              <div className="border-t p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Limit overrides
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(tenant.subscription.limitOverrides).map(
                    ([key, val]) => (
                      <div
                        key={key}
                        className="flex justify-between gap-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {label(key)}
                        </span>
                        <strong>{val?.toLocaleString("en-IN") ?? "—"}</strong>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
        </Surface>
        <Surface title="Change plan">
          <div className="space-y-4 p-5">
            <div>
              <FieldLabel>Target plan *</FieldLabel>
              <Select
                value={planId}
                onValueChange={(v) => {
                  setPlanId(v);
                  setPlanErrors((p) => {
                    const next = { ...p };
                    delete next.planId;
                    return next;
                  });
                }}
              >
                <SelectTrigger
                  className={cn(planErrors.planId && "border-red-600")}
                >
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {(plans.data ?? [])
                    .filter((p) => p.status === "ACTIVE")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormFieldError message={planErrors.planId} />
            </div>
            <div>
              <FieldLabel>Billing cycle</FieldLabel>
              <Select
                value={cycle}
                onValueChange={(v) => setCycle(v as PlatformBillingCycle)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={changePlanState.isLoading || !changePlanReady}
              onClick={async () => {
                const clientErrors = validateChangePlanForm({
                  planId,
                  billingCycle: cycle,
                });
                if (Object.keys(clientErrors).length) {
                  setPlanErrors(clientErrors);
                  toast.error("Fix the highlighted fields.");
                  return;
                }
                try {
                  await changePlan({
                    tenantId: tenant.id,
                    body: {
                      subscriptionPlanId: planId,
                      billingCycle: cycle,
                      effectiveFrom: "IMMEDIATE",
                      generateInvoice: true,
                      reason: "Changed by platform admin",
                    },
                  }).unwrap();
                  toast.success("Subscription plan changed");
                } catch (err) {
                  handleFormApiError(err, {
                    setFieldErrors: setPlanErrors,
                    fieldAliases: { subscriptionPlanId: "planId" },
                    fallback: "Could not change plan",
                  });
                }
              }}
            >
              Change plan
            </Button>
          </div>
        </Surface>
        <Surface title="Extend access">
          <div className="space-y-4 p-5">
            <div>
              <FieldLabel>Extension type</FieldLabel>
              <Select
                value={extensionType}
                onValueChange={(v) =>
                  setExtensionType(v as SubscriptionExtensionType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBSCRIPTION">Paid period</SelectItem>
                  <SelectItem value="GRACE">Grace window</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Days *</FieldLabel>
              <Input
                inputMode="numeric"
                value={String(days)}
                onChange={(e) => {
                  setExtendDaysTouched(true);
                  setDays(sanitizeExtensionDaysInput(e.target.value));
                  setExtendErrors((p) => {
                    const next = { ...p };
                    delete next.days;
                    return next;
                  });
                }}
                className={cn(
                  (extendErrors.days || extendDaysLiveError) && "border-red-600",
                )}
                aria-invalid={Boolean(extendErrors.days || extendDaysLiveError)}
              />
              <FormFieldError
                message={extendErrors.days ?? extendDaysLiveError}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={extendState.isLoading || !extendReady}
              onClick={async () => {
                setExtendDaysTouched(true);
                const clientErrors = validateExtendSubscriptionForm({
                  extensionType,
                  days,
                });
                if (Object.keys(clientErrors).length) {
                  setExtendErrors(clientErrors);
                  toast.error("Fix the highlighted fields.");
                  return;
                }
                try {
                  await extend({
                    tenantId: tenant.id,
                    body: {
                      extensionType,
                      days,
                      reason: "Approved by platform operations",
                    },
                  }).unwrap();
                  toast.success("Subscription extended");
                } catch (err) {
                  handleFormApiError(err, {
                    fallback: "Could not extend subscription",
                  });
                }
              }}
            >
              Extend access
            </Button>
          </div>
        </Surface>
      </div>
      <Surface
        title="Invoices"
        description="Platform subscription billing"
        action={<CreatePlatformInvoiceDialog tenantId={tenant.id} />}
      >
        <DataTable
          rows={invoices.data ?? []}
          columns={invoiceCols}
          emptyTitle="No invoices yet"
        />
      </Surface>
      <Surface
        className="border-red-200"
        title="Danger zone"
        description="Cancellation stops renewal and moves the tenant subscription to CANCELLED"
      >
        <div className="flex items-center justify-between gap-4 p-5">
          <p className="text-sm text-muted-foreground">
            The tenant remains readable through the paid period. This action is
            audited.
          </p>
          <ActionDialog
            trigger={
              <Button variant="outline" className="text-red-700">
                Cancel subscription
              </Button>
            }
            title="Cancel subscription"
            description="This cannot be reversed through the tenant portal."
            actionLabel="Cancel subscription"
            suppressDefaultErrorToast
            onError={(err) => {
              handleFormApiError(err, {
                fallback: "Could not cancel subscription",
              });
            }}
            onSubmit={async () => {
              await cancel({
                tenantId: tenant.id,
                reason: "Cancelled by platform admin",
              }).unwrap();
              toast.success("Subscription cancelled");
            }}
          >
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Confirm only after the commercial request has been verified.
            </p>
          </ActionDialog>
        </div>
      </Surface>
    </div>
  );
}

export function TenantUsage({ tenant }: { tenant: PlatformTenantDetail }) {
  const usage = useGetPlatformUsageQuery(tenant.id);
  const flags = useGetPlatformFlagsQuery(tenant.id);
  const [saveFlags, saveFlagsState] = useSavePlatformFlagsMutation();
  const [updateLimits, updateLimitsState] = useUpdateTenantLimitsMutation();

  const [local, setLocal] = useState<Record<string, boolean>>(
    tenant.flags ?? {},
  );
  const [flagsBaseline, setFlagsBaseline] = useState<Record<string, boolean>>(
    tenant.flags ?? {},
  );
  const [flagsReason, setFlagsReason] = useState("Updated by platform admin");
  const [flagsReasonError, setFlagsReasonError] = useState<string | undefined>();

  const [limits, setLimits] = useState<Record<string, number>>(() =>
    defaultLimitOverrides(tenant),
  );
  const [limitsBaseline, setLimitsBaseline] = useState<Record<string, number>>(
    () => defaultLimitOverrides(tenant),
  );
  const [limitErrors, setLimitErrors] = useState<Record<string, string>>({});
  const flagsDataSeed = flags.data?.flags
    ? JSON.stringify(flags.data.flags)
    : "";
  const [appliedFlagsDataSeed, setAppliedFlagsDataSeed] = useState("");
  if (flags.data?.flags && appliedFlagsDataSeed !== flagsDataSeed) {
    setAppliedFlagsDataSeed(flagsDataSeed);
    setLocal(flags.data.flags);
    setFlagsBaseline(flags.data.flags);
  }

  const limitsDataSeed = JSON.stringify(tenant.subscription.limitOverrides ?? {});
  const [appliedLimitsDataSeed, setAppliedLimitsDataSeed] = useState("");
  if (
    Object.keys(tenant.subscription.limitOverrides ?? {}).length &&
    appliedLimitsDataSeed !== limitsDataSeed
  ) {
    const next = defaultLimitOverrides(tenant);
    setAppliedLimitsDataSeed(limitsDataSeed);
    setLimits(next);
    setLimitsBaseline(next);
  }

  if (usage.isLoading || flags.isLoading) return <PageSkeleton cards={4} />;

  const flagsUnchanged = flagsRecordUnchanged(local, flagsBaseline);
  const limitsUnchanged = limitOverridesUnchanged(limits, limitsBaseline);

  const limitDisplayError = (key: string) => limitErrors[key];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <Surface
        title="Plan usage"
        description="Live consumption against subscription limits (scheme plan templates, not customer enrollments)"
      >
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {Object.entries(usage.data ?? {}).map(([key, metric]: [string, any]) => (
            <div key={key} className="rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{label(key)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {metric.used.toLocaleString("en-IN")} of{" "}
                    {metric.limit?.toLocaleString("en-IN") ?? "unlimited"}
                  </p>
                  {metric.resetDate && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Resets {metric.resetDate}
                    </p>
                  )}
                </div>
                <strong>{Number(metric.percentage).toFixed(0)}%</strong>
              </div>
              <Progress
                value={Math.min(100, Number(metric.percentage))}
                className="mt-4"
              />
              {Number(metric.percentage) >= 90 && (
                <p className="mt-2 text-xs font-medium text-red-700">
                  Approaching or at limit
                </p>
              )}
            </div>
          ))}
        </div>
      </Surface>
      <div className="space-y-5">
        <Surface
          title="Platform feature flags"
          description="Flags can disable plan features but cannot grant beyond the tier"
        >
          <div className="space-y-3 p-5">
            {Object.entries(local).map(([key, value]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
              >
                <span>
                  <strong>{label(key)}</strong>
                  <span className="block text-xs text-muted-foreground">
                    Effective:{" "}
                    {flags.data?.effectiveFlags?.[key] ? "Enabled" : "Disabled"}
                  </span>
                </span>
                <Checkbox
                  checked={value}
                  onCheckedChange={(v) =>
                    setLocal((p) => ({ ...p, [key]: Boolean(v) }))
                  }
                />
              </label>
            ))}
            <div>
              <FieldLabel>Change reason</FieldLabel>
              <Input
                value={flagsReason}
                onChange={(e) => {
                  setFlagsReasonError(undefined);
                  setFlagsReason(e.target.value.slice(0, 500));
                }}
                className={cn(flagsReasonError && "border-red-600")}
              />
              <FormFieldError message={flagsReasonError} />
            </div>
            <Button
              className="w-full"
              disabled={
                saveFlagsState.isLoading ||
                flagsUnchanged ||
                Boolean(validatePlatformFlagsReason(flagsReason))
              }
              onClick={async () => {
                const reasonErr = validatePlatformFlagsReason(flagsReason);
                if (reasonErr) {
                  setFlagsReasonError(reasonErr);
                  return;
                }
                try {
                  await saveFlags({
                    tenantId: tenant.id,
                    body: {
                      flags: local,
                      reason: flagsReason.trim() || "Updated by platform admin",
                    },
                  }).unwrap();
                  toast.success("Feature flags saved");
                  setFlagsBaseline({ ...local });
                } catch (err) {
                  handleFormApiError(err, {
                    fallback: "Could not save feature flags",
                  });
                }
              }}
            >
              <Flag />
              Save flags
            </Button>
          </div>
        </Surface>
        {tenant.subscription.tier === "CUSTOM" && (
          <Surface title="Custom limit overrides">
            <div className="space-y-4 p-5">
              {Object.entries(limits).map(([key, value]) => (
                <div key={key}>
                  <FieldLabel>{label(key)}</FieldLabel>
                  <Input
                    inputMode="numeric"
                    value={String(value)}
                    onChange={(e) => {
                      setLimits((p) => ({
                        ...p,
                        [key]: sanitizeLimitOverrideInput(e.target.value),
                      }));
                      setLimitErrors((p) => {
                        const next = { ...p };
                        delete next[key];
                        return next;
                      });
                    }}
                    className={cn(limitDisplayError(key) && "border-red-600")}
                    aria-invalid={Boolean(limitDisplayError(key))}
                  />
                  <FormFieldError message={limitDisplayError(key)} />
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full"
                disabled={
                  updateLimitsState.isLoading ||
                  limitsUnchanged ||
                  Object.keys(validateLimitOverridesRecord(limits)).length > 0
                }
                onClick={async () => {
                  const clientErrors = validateLimitOverridesRecord(limits);
                  if (Object.keys(clientErrors).length) {
                    setLimitErrors(clientErrors);
                    toast.error("Fix the highlighted limits.");
                    return;
                  }
                  try {
                    await updateLimits({
                      tenantId: tenant.id,
                      body: {
                        limitOverrides: limits,
                        featureOverrides: {},
                        reason: "Negotiated enterprise terms",
                        expectedVersion: tenant.audit.version,
                      },
                    }).unwrap();
                    toast.success("Custom limits updated");
                    setLimitsBaseline({ ...limits });
                  } catch (err) {
                    handleFormApiError(err, {
                      setFieldErrors: setLimitErrors,
                      fallback: "Could not update limits",
                    });
                  }
                }}
              >
                Save overrides
              </Button>
            </div>
          </Surface>
        )}
      </div>
    </div>
  );
}
