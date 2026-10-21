"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Building2, Check, ClipboardCopy, CreditCard, Edit3, Gauge, KeyRound, MessageCircleMore, Play, Power, Save, Send, Settings2, ShieldCheck, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { DataTable, type DataColumn } from "@/src/components/common/data-table";
import { FieldLabel, PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useDeleteTenantTemplateMutation, useGetPlatformTenantQuery, useGetTemplateDefinitionsQuery, useGetTenantTemplatesQuery, useGoLivePlatformTenantMutation, useReactivatePlatformTenantMutation, useResetOwnerCredentialsMutation, useSavePaymentIntegrationMutation, useSaveTenantTemplateMutation, useSaveWhatsappIntegrationMutation, useSuspendPlatformTenantMutation, useTestTenantTemplateMutation, useUpdatePlatformTenantMutation, useVerifyPaymentIntegrationMutation, useVerifyWhatsappIntegrationMutation } from "@/src/store/api/platform-api";
import {
  TenantSubscription,
  TenantUsage,
} from "@/src/features/platform/platform-tenant-subscription-usage-section";
import { toastApiError } from "@/src/lib/api-error";
import { sanitizeIndianPhoneDigits } from "@/src/lib/customer-form";
import { fieldLabel } from "@/src/lib/field-labels";
import { handleFormApiError } from "@/src/lib/form-api-error";
import {
  livePlatformTenantProfileFieldErrors,
  platformTenantProfileFormFromDetail,
  platformTenantProfileFormReady,
  profileSupportNumberForApi,
  sanitizeTenantCodeInput,
  validatePlatformTenantProfileForm,
  type PlatformTenantProfileForm,
} from "@/src/lib/platform-tenant-profile-form-validation";
import {
  emptyWhatsappIntegrationForm,
  livePlatformWhatsappIntegrationFieldErrors,
  platformWhatsappIntegrationFormReady,
  validatePlatformWhatsappIntegrationForm,
  validateWhatsappVerifyTestMobile,
  whatsappIntegrationBodyForApi,
  whatsappIntegrationFormHasInput,
  whatsappVerifyTestMobileForApi,
  type PlatformWhatsappIntegrationForm,
} from "@/src/lib/platform-whatsapp-integration-form-validation";
import { apiOrigin } from "@/src/config/env";
import {
  emptyPhonePeIntegrationForm,
  livePlatformPhonePeIntegrationFieldErrors,
  phonePeIntegrationBodyForApi,
  phonePeIntegrationFormHasInput,
  phonePeWebhookUrl,
  platformPhonePeIntegrationFormReady,
  sanitizePhonePeClientVersionInput,
  validatePlatformPhonePeIntegrationForm,
  type PhonePeIntegrationEnvironment,
  type PlatformPhonePeIntegrationForm,
} from "@/src/lib/platform-phonepe-integration-form-validation";
import {
  livePlatformTenantTemplateFieldErrors,
  platformTenantTemplateFormFromRegistration,
  platformTenantTemplateFormReady,
  platformTenantTemplateFormUnchanged,
  sanitizeMetaTemplateIdInput,
  sanitizeMetaTemplateNameInput,
  sanitizeTemplateLanguageInput,
  tenantTemplateRegistrationBodyForApi,
  validatePlatformTenantTemplateForm,
  type PlatformTenantTemplateForm,
  type TemplateApprovalStatus,
} from "@/src/lib/platform-tenant-template-form-validation";
import type { PlatformTenantDetail, TemplateDefinition, TenantTemplate } from "@/src/types/platform";
import { PlatformTenantDigitalMetalsSection } from "@/src/features/platform/platform-tenant-digital-metals-section";

const label = fieldLabel;

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN");
}

function boolLabel(value: boolean | undefined): string {
  return value ? "Yes" : "No";
}

export function PlatformTenantDetailPage({ tenantId, initialTab = "overview" }: { tenantId: string; initialTab?: string }) {
  const query = useGetPlatformTenantQuery(tenantId); const [suspend] = useSuspendPlatformTenantMutation(); const [reactivate] = useReactivatePlatformTenantMutation(); const [goLive] = useGoLivePlatformTenantMutation(); const [resetCredentials] = useResetOwnerCredentialsMutation(); const [credentials, setCredentials] = useState<any>(null); const [reason, setReason] = useState("");
  if (query.isLoading) return <PageSkeleton cards={4}/>; if (query.isError || !query.data) return <QueryError error={query.error} onRetry={query.refetch}/>; const tenant = query.data;
  const perform = async (fn: () => Promise<any>, success: string) => { try { await fn(); toast.success(success); } catch (e) { toastApiError(e, "Action failed"); throw e; } };
  return <><div><Button variant="ghost" asChild className="-ml-3 mb-3"><Link href="/platform/tenants"><ArrowLeft/>Back to jewellers</Link></Button><PageHeader eyebrow={`${tenant.tenantCode} · Platform tenant`} title={tenant.businessName} description={`${tenant.city} · ${tenant.owner.name} · ${tenant.owner.mobile}`} actions={<><StatusBadge status={tenant.status}/><EditTenantDialog tenant={tenant}/><ActionDialog trigger={<Button variant="outline"><KeyRound/>Owner credentials</Button>} title="Reset owner credentials" description="A new one-time password invalidates the previous temporary credential." actionLabel="Generate password" onSubmit={async () => { const data = await resetCredentials(tenant.id).unwrap(); setCredentials(data); toast.success("New owner password generated"); }}><p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Only generate credentials when the owner cannot complete password setup.</p></ActionDialog>{tenant.status === "SUSPENDED" ? <Button onClick={() => perform(() => reactivate(tenant.id).unwrap(), "Jeweller reactivated")}><Power/>Reactivate</Button> : <ActionDialog trigger={<Button variant="outline" className="text-red-700"><Power/>Suspend</Button>} title="Suspend jeweller" description="Writes and outbound reminder jobs stop. Read-only access remains available." actionLabel="Suspend jeweller" onSubmit={() => perform(() => suspend({ tenantId: tenant.id, reason, notifyOwner: true }).unwrap(), "Jeweller suspended")}><FieldLabel>Reason</FieldLabel><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Subscription or compliance reason"/></ActionDialog>}{tenant.status === "PENDING_SETUP" && <Button disabled={!tenant.provisioning.readyToGoLive} onClick={() => perform(() => goLive(tenant.id).unwrap(), "Jeweller is now live")}><Play/>Go live</Button>}</>}/></div>
    {credentials && <Surface className="border-amber-300 bg-amber-50"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><KeyRound className="size-7 text-amber-700"/><div className="flex-1"><p className="font-bold">New one-time password</p><p className="mt-1 font-mono text-lg">{credentials.temporaryPassword}</p><p className="text-sm text-amber-800">This value is shown once and must be shared securely.</p></div><Button variant="outline" onClick={() => { navigator.clipboard.writeText(credentials.temporaryPassword); toast.success("Password copied"); }}><ClipboardCopy/>Copy</Button><Button variant="ghost" onClick={() => setCredentials(null)}>Dismiss</Button></div></Surface>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard icon={CreditCard} label="Subscription" value={tenant.subscription.tier} detail={`${tenant.subscription.status} · ${tenant.subscription.billingCycle}`}/><StatCard icon={Gauge} label="Active customers" value={tenant.usage.activeCustomers.toLocaleString("en-IN")} detail={`${(tenant.usageDetail?.activeCustomers?.percentage ?? 0).toFixed(1)}% of limit`} tone="gold"/><StatCard icon={Building2} label="Branches" value={tenant.usage.branches} detail={`${tenant.usageDetail?.branches?.limit ?? "Unlimited"} allowed`} tone="cream"/><StatCard icon={MessageCircleMore} label="Templates" value={`${tenant.templates.configured}/${tenant.templates.required}`} detail={tenant.templates.missing.length ? `${tenant.templates.missing.length} required missing` : "Required set complete"} tone={tenant.templates.missing.length ? "red" : "green"}/><StatCard icon={ShieldCheck} label="Provisioning" value={tenant.provisioning.readyToGoLive ? "Ready" : "Incomplete"} detail={tenant.goLiveAt ? `Live since ${new Date(tenant.goLiveAt).toLocaleDateString("en-IN")}` : "Not live yet"} tone={tenant.provisioning.readyToGoLive ? "green" : "red"}/></div>
    <Tabs defaultValue={initialTab}><TabsList variant="detail"><TabsTrigger value="overview"><Building2/>Overview</TabsTrigger><TabsTrigger value="setup"><Settings2/>Provisioning</TabsTrigger><TabsTrigger value="templates"><MessageCircleMore/>Templates</TabsTrigger><TabsTrigger value="subscription"><CreditCard/>Subscription & invoices</TabsTrigger><TabsTrigger value="usage"><Gauge/>Usage & flags</TabsTrigger><TabsTrigger value="digital-metals">Digital metals</TabsTrigger></TabsList><TabsContent value="overview"><TenantOverview tenant={tenant}/></TabsContent><TabsContent value="setup"><TenantSetup tenant={tenant}/></TabsContent><TabsContent value="templates"><TenantTemplates tenant={tenant}/></TabsContent><TabsContent value="subscription"><TenantSubscription tenant={tenant}/></TabsContent><TabsContent value="usage"><TenantUsage tenant={tenant}/></TabsContent><TabsContent value="digital-metals"><PlatformTenantDigitalMetalsSection tenantId={tenant.id}/></TabsContent></Tabs>
  </>;
}

function profileFormUnchanged(
  form: PlatformTenantProfileForm,
  baseline: PlatformTenantProfileForm,
): boolean {
  return (
    form.businessName === baseline.businessName &&
    form.displayName === baseline.displayName &&
    form.ownerEmail === baseline.ownerEmail &&
    form.supportNumber === baseline.supportNumber &&
    form.gstin === baseline.gstin &&
    form.city === baseline.city &&
    form.address === baseline.address &&
    form.tenantCode === baseline.tenantCode
  );
}

function EditTenantDialog({ tenant }: { tenant: PlatformTenantDetail }) {
  const [update] = useUpdatePlatformTenantMutation();
  const tenantCodeEditable = !tenant.goLiveAt;
  const [baseline, setBaseline] = useState<PlatformTenantProfileForm>(() =>
    platformTenantProfileFormFromDetail(tenant),
  );
  const [form, setForm] = useState<PlatformTenantProfileForm>(() =>
    platformTenantProfileFormFromDetail(tenant),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof PlatformTenantProfileForm, boolean>>
  >({});

  const tenantProfileSeed = `${tenant.id}-${tenant.status}-${tenant.displayName}`;
  const [appliedTenantProfileSeed, setAppliedTenantProfileSeed] = useState("");
  if (appliedTenantProfileSeed !== tenantProfileSeed) {
    const next = platformTenantProfileFormFromDetail(tenant);
    setAppliedTenantProfileSeed(tenantProfileSeed);
    setBaseline(next);
    setForm(next);
    setFieldErrors({});
    setTouched({});
  }

  const liveErrors = useMemo(
    () =>
      livePlatformTenantProfileFieldErrors(form, touched, {
        tenantCodeEditable,
      }),
    [form, touched, tenantCodeEditable],
  );

  const displayError = (field: keyof PlatformTenantProfileForm) =>
    fieldErrors[field] ?? liveErrors[field];

  const setField = <K extends keyof PlatformTenantProfileForm>(
    key: K,
    value: PlatformTenantProfileForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const markAllTouched = () => {
    setTouched({
      businessName: true,
      displayName: true,
      ownerEmail: true,
      supportNumber: true,
      gstin: true,
      city: true,
      address: true,
      tenantCode: true,
    });
  };

  const submitDisabled =
    !platformTenantProfileFormReady(form, { tenantCodeEditable }) ||
    profileFormUnchanged(form, baseline);

  const inputClass = (field: keyof PlatformTenantProfileForm) =>
    cn(displayError(field) && "border-red-600");

  return (
    <ActionDialog
      trigger={
        <Button variant="outline">
          <Edit3 />
          Edit profile
        </Button>
      }
      title="Edit jeweller profile"
      description="Updates business identity. Tenant code is locked after go-live."
      actionLabel="Save changes"
      className="sm:max-w-2xl"
      submitDisabled={submitDisabled}
      suppressDefaultErrorToast
      onError={(err) => {
        handleFormApiError(err, {
          setFieldErrors,
          fieldAliases: {
            email: "ownerEmail",
            name: "businessName",
            code: "tenantCode",
          },
          fallback: "Could not update jeweller profile",
        });
      }}
      onSubmit={async () => {
        markAllTouched();
        const clientErrors = validatePlatformTenantProfileForm(form, {
          tenantCodeEditable,
        });
        if (Object.keys(clientErrors).length) {
          setFieldErrors(clientErrors);
          toast.error("Fix the highlighted fields.");
          return false;
        }

        const body: Record<string, unknown> = {
          expectedVersion: tenant.audit.version,
          businessName: form.businessName.trim(),
          displayName: form.displayName.trim(),
          ownerEmail: form.ownerEmail.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
        };
        const support = profileSupportNumberForApi(form.supportNumber);
        if (support) body.supportNumber = support;
        const gst = form.gstin.trim().toUpperCase();
        if (gst) body.gstin = gst;
        if (tenantCodeEditable) {
          body.tenantCode = form.tenantCode.trim().toUpperCase();
        }

        await update({ tenantId: tenant.id, body }).unwrap();
        toast.success("Jeweller profile updated");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Legal business name *</FieldLabel>
          <Input
            value={form.businessName}
            onChange={(e) => {
              setTouched((p) => ({ ...p, businessName: true }));
              setField("businessName", e.target.value);
            }}
            className={inputClass("businessName")}
            aria-invalid={Boolean(displayError("businessName"))}
          />
          <FormFieldError message={displayError("businessName")} />
        </div>
        <div>
          <FieldLabel>Display name *</FieldLabel>
          <Input
            value={form.displayName}
            onChange={(e) => {
              setTouched((p) => ({ ...p, displayName: true }));
              setField("displayName", e.target.value);
            }}
            className={inputClass("displayName")}
            aria-invalid={Boolean(displayError("displayName"))}
          />
          <FormFieldError message={displayError("displayName")} />
        </div>
        <div>
          <FieldLabel>Tenant code{tenantCodeEditable ? " *" : ""}</FieldLabel>
          <Input
            value={form.tenantCode}
            disabled={!tenantCodeEditable}
            onChange={(e) => {
              setTouched((p) => ({ ...p, tenantCode: true }));
              setField("tenantCode", sanitizeTenantCodeInput(e.target.value));
            }}
            className={inputClass("tenantCode")}
            aria-invalid={Boolean(displayError("tenantCode"))}
          />
          <FormFieldError message={displayError("tenantCode")} />
        </div>
        <div>
          <FieldLabel>Owner email *</FieldLabel>
          <Input
            type="email"
            value={form.ownerEmail}
            onChange={(e) => {
              setTouched((p) => ({ ...p, ownerEmail: true }));
              setField("ownerEmail", e.target.value);
            }}
            className={inputClass("ownerEmail")}
            aria-invalid={Boolean(displayError("ownerEmail"))}
          />
          <FormFieldError message={displayError("ownerEmail")} />
        </div>
        <div>
          <FieldLabel>City *</FieldLabel>
          <Input
            value={form.city}
            onChange={(e) => {
              setTouched((p) => ({ ...p, city: true }));
              setField("city", e.target.value);
            }}
            className={inputClass("city")}
            aria-invalid={Boolean(displayError("city"))}
          />
          <FormFieldError message={displayError("city")} />
        </div>
        <div>
          <FieldLabel>Support number</FieldLabel>
          <Input
            inputMode="tel"
            value={form.supportNumber}
            onChange={(e) => {
              setTouched((p) => ({ ...p, supportNumber: true }));
              setField(
                "supportNumber",
                sanitizeIndianPhoneDigits(e.target.value),
              );
            }}
            className={inputClass("supportNumber")}
            aria-invalid={Boolean(displayError("supportNumber"))}
          />
          <FormFieldError message={displayError("supportNumber")} />
        </div>
        <div>
          <FieldLabel>GSTIN</FieldLabel>
          <Input
            value={form.gstin}
            onChange={(e) => {
              setTouched((p) => ({ ...p, gstin: true }));
              setField("gstin", e.target.value.toUpperCase().slice(0, 15));
            }}
            className={inputClass("gstin")}
            aria-invalid={Boolean(displayError("gstin"))}
          />
          <FormFieldError message={displayError("gstin")} />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Business address</FieldLabel>
          <Input
            value={form.address}
            onChange={(e) => {
              setTouched((p) => ({ ...p, address: true }));
              setField("address", e.target.value);
            }}
            className={inputClass("address")}
            aria-invalid={Boolean(displayError("address"))}
          />
          <FormFieldError message={displayError("address")} />
        </div>
      </div>
    </ActionDialog>
  );
}

function TenantOverview({ tenant }: { tenant: PlatformTenantDetail }) {
  const branding = tenant.branding ?? {};
  const branchCols = useMemo<DataColumn<{ id: string; name: string; code: string; status: string }>[]>(
    () => [
      { key: "name", header: "Branch", render: (r) => r.name },
      { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
      { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    ],
    [],
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Surface title="Business profile" description="Identity and ownership">
          <div className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Tenant ID" value={tenant.id} />
            <Info label="Tenant code" value={tenant.tenantCode} />
            <Info label="Business name" value={tenant.businessName} />
            <Info label="Display name" value={tenant.displayName} />
            <Info label="City" value={tenant.city ?? ""} />
            <Info label="GSTIN" value={tenant.gstin ?? ""} />
            <Info label="Owner" value={tenant.owner.name} />
            <Info label="Owner mobile" value={tenant.owner.mobile} />
            <Info label="Owner email" value={tenant.owner.email || tenant.ownerEmail || ""} />
            <Info label="Support number" value={tenant.supportNumber ?? ""} />
            <Info label="Address" value={tenant.address ?? ""} wide />
            <Info label="Created" value={formatWhen(tenant.audit.createdAt)} />
            <Info label="Go live" value={tenant.goLiveAt ? formatWhen(tenant.goLiveAt) : "Not live"} />
            <Info label="Record version" value={String(tenant.audit.version)} />
          </div>
        </Surface>
        <div className="space-y-5">
          <Surface title="Provisioning checklist">
            <div className="space-y-3 p-4">
              <CheckRow label="Meta WhatsApp" done={tenant.provisioning.whatsappConfigured} />
              <CheckRow label="PhonePe gateway" done={tenant.provisioning.paymentGatewayConfigured} />
              <CheckRow label="Required templates" done={!tenant.templates.missing.length} />
              <CheckRow label="Go-live" done={tenant.status === "ACTIVE"} />
            </div>
            {tenant.templates.missing.length > 0 && (
              <div className="border-t px-4 pb-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Missing template types</p>
                <div className="flex flex-wrap gap-2">
                  {tenant.templates.missing.map((type) => (
                    <code key={type} className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      {type}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </Surface>
          <Surface title="Tenant footprint">
            <div className="grid grid-cols-2 gap-3 p-4">
              <Info label="Total schemes" value={tenant.stats.totalSchemes.toLocaleString("en-IN")} />
              <Info label="Active schemes" value={tenant.stats.activeSchemes.toLocaleString("en-IN")} />
              <Info label="WhatsApp (month)" value={tenant.usage.whatsappUsedThisMonth.toLocaleString("en-IN")} />
              <Info label="Staff" value={String(tenant.usage.staff)} />
            </div>
          </Surface>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Surface title="Branding" description="Customer-facing identity">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Info label="Brand display name" value={branding.displayName ?? tenant.displayName} />
            <Info label="Logo URL" value={branding.logoUrl ?? ""} />
            <Info label="Primary colour" value={branding.primaryColor ?? ""} />
            <Info label="Accent colour" value={branding.accentColor ?? ""} />
          </div>
        </Surface>
        <Surface title="Operations settings" description="Tenant-level behaviour flags">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {Object.entries(tenant.settings ?? {}).map(([key, value]) => (
              <Info
                key={key}
                label={label(key)}
                value={typeof value === "boolean" ? boolLabel(value) : String(value ?? "—")}
              />
            ))}
          </div>
        </Surface>
      </div>
      <Surface title="Branches" description="Active locations on this tenant">
        <DataTable rows={tenant.branches} columns={branchCols} emptyTitle="No branches yet" />
      </Surface>
    </div>
  );
}

function CheckRow({ label: text, done }: { label: string; done: boolean }) { return <div className="flex items-center gap-3 rounded-xl border p-3"><span className={`grid size-8 place-items-center rounded-full ${done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{done ? <Check className="size-4"/> : <Activity className="size-4"/>}</span><span className="flex-1 font-medium">{text}</span><StatusBadge status={done ? "COMPLETED" : "PENDING"}/></div>; }
function Info({ label: text, value, wide }: { label: string; value: string; wide?: boolean }) { return <div className={wide ? "sm:col-span-2" : ""}><p className="text-xs uppercase tracking-wide text-muted-foreground">{text}</p><p className="mt-1 break-words font-semibold">{value || "—"}</p></div>; }

function TenantSetup({ tenant }: { tenant: PlatformTenantDetail }) { return <div className="grid gap-5 xl:grid-cols-2"><WhatsappCard tenant={tenant}/><PhonePeCard tenant={tenant}/></div>; }
function whatsappFormFromTenant(
  tenant: PlatformTenantDetail,
): PlatformWhatsappIntegrationForm {
  const wa = tenant.integrations.whatsapp;
  const form = emptyWhatsappIntegrationForm();
  if (wa?.configured && wa.phoneNumberDisplay) {
    form.phoneNumberId = String(wa.phoneNumberDisplay).replace(/\D/g, "");
  }
  return form;
}

function WhatsappCard({ tenant }: { tenant: PlatformTenantDetail }) {
  const [save, saveState] = useSaveWhatsappIntegrationMutation();
  const [verify, verifyState] = useVerifyWhatsappIntegrationMutation();
  const wa = tenant.integrations.whatsapp;
  const waProvider =
    typeof wa.provider === "string" ? wa.provider : "META_CLOUD";
  const waLastVerified =
    typeof wa.lastVerifiedAt === "string" ? wa.lastVerifiedAt : null;
  const waPhoneDisplay =
    typeof wa.phoneNumberDisplay === "string" ? wa.phoneNumberDisplay : null;
  const waTokenMasked =
    typeof wa.accessTokenMasked === "string" ? wa.accessTokenMasked : null;
  const [form, setForm] = useState<PlatformWhatsappIntegrationForm>(() =>
    whatsappFormFromTenant(tenant),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof PlatformWhatsappIntegrationForm, boolean>>
  >({});
  const [testMobile, setTestMobile] = useState(() =>
    sanitizeIndianPhoneDigits(tenant.owner.mobile),
  );
  const [verifyMobileError, setVerifyMobileError] = useState<string | undefined>();

  const whatsappSeed = `${tenant.id}|${tenant.owner.mobile}|${waLastVerified ?? ""}`;
  const [appliedWhatsappSeed, setAppliedWhatsappSeed] = useState("");
  if (appliedWhatsappSeed !== whatsappSeed) {
    setAppliedWhatsappSeed(whatsappSeed);
    setForm(whatsappFormFromTenant(tenant));
    setFieldErrors({});
    setTouched({});
    setTestMobile(sanitizeIndianPhoneDigits(tenant.owner.mobile));
    setVerifyMobileError(undefined);
  }

  const liveErrors = useMemo(
    () => livePlatformWhatsappIntegrationFieldErrors(form, touched),
    [form, touched],
  );

  const displayError = (field: keyof PlatformWhatsappIntegrationForm) =>
    fieldErrors[field] ?? liveErrors[field];

  const setField = <K extends keyof PlatformWhatsappIntegrationForm>(
    key: K,
    value: PlatformWhatsappIntegrationForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const markAllTouched = () => {
    setTouched({
      phoneNumberId: true,
      businessAccountId: true,
      accessToken: true,
      appSecret: true,
      verifyToken: true,
      callbackUrlOverride: true,
      environment: true,
    });
  };

  const saveReady = platformWhatsappIntegrationFormReady(form);
  const saveDisabled =
    saveState.isLoading || !saveReady || !whatsappIntegrationFormHasInput(form);

  const inputClass = (field: keyof PlatformWhatsappIntegrationForm) =>
    cn(displayError(field) && "border-red-600");

  const sanitizeMetaId = (raw: string) => raw.replace(/\D/g, "");

  return (
    <Surface
      title="Meta WhatsApp Cloud API"
      description="Write-only credentials and webhook verification"
      action={<StatusBadge status={wa.verificationStatus} />}
    >
      <div className="space-y-4 p-5">
        <div className="rounded-xl border bg-[#fbf7f4] p-4 text-sm">
          <p>
            <strong>Current:</strong>{" "}
            {wa.configured
              ? `${waPhoneDisplay ?? "Configured"} · ${waTokenMasked ?? "Token saved"}`
              : "Not configured"}
          </p>
          <p className="mt-1 text-muted-foreground">
            Last verified: {formatWhen(waLastVerified)} · Provider {waProvider}
          </p>
          <p className="mt-1 text-muted-foreground">
            Secrets are never returned after save. Re-enter access token and app
            secret whenever you save changes.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Phone number ID *</FieldLabel>
            <Input
              inputMode="numeric"
              value={form.phoneNumberId}
              onChange={(e) => {
                setTouched((p) => ({ ...p, phoneNumberId: true }));
                setField("phoneNumberId", sanitizeMetaId(e.target.value));
              }}
              className={inputClass("phoneNumberId")}
              aria-invalid={Boolean(displayError("phoneNumberId"))}
            />
            <FormFieldError message={displayError("phoneNumberId")} />
          </div>
          <div>
            <FieldLabel>Business account ID</FieldLabel>
            <Input
              inputMode="numeric"
              value={form.businessAccountId}
              onChange={(e) => {
                setTouched((p) => ({ ...p, businessAccountId: true }));
                setField("businessAccountId", sanitizeMetaId(e.target.value));
              }}
              className={inputClass("businessAccountId")}
              aria-invalid={Boolean(displayError("businessAccountId"))}
            />
            <FormFieldError message={displayError("businessAccountId")} />
          </div>
          <div>
            <FieldLabel>Access token *</FieldLabel>
            <Input
              type="password"
              autoComplete="off"
              value={form.accessToken}
              onChange={(e) => {
                setTouched((p) => ({ ...p, accessToken: true }));
                setField("accessToken", e.target.value);
              }}
              className={inputClass("accessToken")}
              aria-invalid={Boolean(displayError("accessToken"))}
            />
            <FormFieldError message={displayError("accessToken")} />
          </div>
          <div>
            <FieldLabel>App secret *</FieldLabel>
            <Input
              type="password"
              autoComplete="off"
              value={form.appSecret}
              onChange={(e) => {
                setTouched((p) => ({ ...p, appSecret: true }));
                setField("appSecret", e.target.value);
              }}
              className={inputClass("appSecret")}
              aria-invalid={Boolean(displayError("appSecret"))}
            />
            <FormFieldError message={displayError("appSecret")} />
          </div>
          <div>
            <FieldLabel>Verify token</FieldLabel>
            <Input
              type="password"
              autoComplete="off"
              value={form.verifyToken}
              onChange={(e) => {
                setTouched((p) => ({ ...p, verifyToken: true }));
                setField("verifyToken", e.target.value);
              }}
              className={inputClass("verifyToken")}
              aria-invalid={Boolean(displayError("verifyToken"))}
            />
            <FormFieldError message={displayError("verifyToken")} />
          </div>
          <div>
            <FieldLabel>Environment</FieldLabel>
            <Select
              value={form.environment}
              onValueChange={(v) =>
                setField("environment", v as PlatformWhatsappIntegrationForm["environment"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRODUCTION">Production</SelectItem>
                <SelectItem value="SANDBOX">Sandbox</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Callback URL override</FieldLabel>
            <Input
              type="url"
              placeholder="https://api.example.com/webhooks/whatsapp"
              value={form.callbackUrlOverride}
              onChange={(e) => {
                setTouched((p) => ({ ...p, callbackUrlOverride: true }));
                setField("callbackUrlOverride", e.target.value);
              }}
              className={inputClass("callbackUrlOverride")}
              aria-invalid={Boolean(displayError("callbackUrlOverride"))}
            />
            <FormFieldError message={displayError("callbackUrlOverride")} />
          </div>
        </div>
        <div className="rounded-xl border border-dashed p-4">
          <FieldLabel>Test message mobile</FieldLabel>
          <Input
            inputMode="tel"
            value={testMobile}
            disabled={!wa.configured}
            onChange={(e) => {
              setVerifyMobileError(undefined);
              setTestMobile(sanitizeIndianPhoneDigits(e.target.value));
            }}
            placeholder="Owner mobile for verification"
            className={cn(verifyMobileError && "border-red-600")}
            aria-invalid={Boolean(verifyMobileError)}
          />
          <FormFieldError message={verifyMobileError} />
          <p className="mt-2 text-xs text-muted-foreground">
            Sends a test WhatsApp message after credentials are saved.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={!wa.configured || verifyState.isLoading}
            onClick={async () => {
              const mobileErr = validateWhatsappVerifyTestMobile(testMobile);
              if (mobileErr) {
                setVerifyMobileError(mobileErr);
                toast.error("Fix the test mobile number.");
                return;
              }
              try {
                await verify({
                  tenantId: tenant.id,
                  testMobile: whatsappVerifyTestMobileForApi(testMobile),
                }).unwrap();
                toast.success("WhatsApp test delivered and verified");
              } catch (err) {
                handleFormApiError(err, {
                  fallback: "Verification failed",
                });
              }
            }}
          >
            <Send />
            Verify with test message
          </Button>
          <Button
            disabled={saveDisabled}
            onClick={async () => {
              markAllTouched();
              const clientErrors = validatePlatformWhatsappIntegrationForm(form);
              if (Object.keys(clientErrors).length) {
                setFieldErrors(clientErrors);
                toast.error("Fix the highlighted fields.");
                return;
              }
              try {
                await save({
                  tenantId: tenant.id,
                  body: whatsappIntegrationBodyForApi(form),
                }).unwrap();
                toast.success("Meta credentials saved");
                setForm((prev) => ({
                  ...prev,
                  accessToken: "",
                  appSecret: "",
                  verifyToken: "",
                }));
                setTouched({});
              } catch (err) {
                handleFormApiError(err, {
                  setFieldErrors,
                  fallback: "Could not save WhatsApp credentials",
                });
              }
            }}
          >
            <Save />
            Save credentials
          </Button>
        </div>
      </div>
    </Surface>
  );
}
function phonePeFormFromTenant(
  tenant: PlatformTenantDetail,
): PlatformPhonePeIntegrationForm {
  const pg = tenant.integrations.paymentGateway;
  const env: PhonePeIntegrationEnvironment =
    pg.environment === "SANDBOX" ? "SANDBOX" : "PRODUCTION";
  return emptyPhonePeIntegrationForm(pg.configured ? env : "PRODUCTION");
}

function PhonePeCard({ tenant }: { tenant: PlatformTenantDetail }) {
  const [save, saveState] = useSavePaymentIntegrationMutation();
  const [verify, verifyState] = useVerifyPaymentIntegrationMutation();
  const pg = tenant.integrations.paymentGateway;
  const pgProvider =
    typeof pg.provider === "string" ? pg.provider : "PHONEPE";
  const pgLastVerified =
    typeof pg.lastVerifiedAt === "string" ? pg.lastVerifiedAt : null;
  const pgClientMasked =
    typeof pg.clientIdMasked === "string" ? pg.clientIdMasked : null;
  const pgEnvironment =
    typeof pg.environment === "string" ? pg.environment : "PRODUCTION";
  const webhookUrl = phonePeWebhookUrl(apiOrigin(), tenant.id);
  const [baseline, setBaseline] = useState<PlatformPhonePeIntegrationForm>(() =>
    phonePeFormFromTenant(tenant),
  );
  const [form, setForm] = useState<PlatformPhonePeIntegrationForm>(() =>
    phonePeFormFromTenant(tenant),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof PlatformPhonePeIntegrationForm, boolean>>
  >({});

  const phonePeSeed = `${tenant.id}|${pgLastVerified ?? ""}|${pgEnvironment}`;
  const [appliedPhonePeSeed, setAppliedPhonePeSeed] = useState("");
  if (appliedPhonePeSeed !== phonePeSeed) {
    const next = phonePeFormFromTenant(tenant);
    setAppliedPhonePeSeed(phonePeSeed);
    setBaseline(next);
    setForm(next);
    setFieldErrors({});
    setTouched({});
  }

  const liveErrors = useMemo(
    () => livePlatformPhonePeIntegrationFieldErrors(form, touched),
    [form, touched],
  );

  const displayError = (field: keyof PlatformPhonePeIntegrationForm) =>
    fieldErrors[field] ?? liveErrors[field];

  const setField = <K extends keyof PlatformPhonePeIntegrationForm>(
    key: K,
    value: PlatformPhonePeIntegrationForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const markAllTouched = () => {
    setTouched({
      clientId: true,
      clientSecret: true,
      clientVersion: true,
      webhookUsername: true,
      webhookPassword: true,
      environment: true,
    });
  };

  const saveReady = platformPhonePeIntegrationFormReady(form);
  const saveDisabled =
    saveState.isLoading ||
    !saveReady ||
    !phonePeIntegrationFormHasInput(form, baseline);

  const inputClass = (field: keyof PlatformPhonePeIntegrationForm) =>
    cn(displayError(field) && "border-red-600");

  return (
    <Surface
      title="PhonePe payment gateway"
      description="SDK credentials, webhook auth, and connection health"
      action={<StatusBadge status={pg.verificationStatus} />}
    >
      <div className="space-y-4 p-5">
        <div className="rounded-xl border bg-[#fbf7f4] p-4 text-sm">
          <p>
            <strong>Current:</strong>{" "}
            {pg.configured
              ? `${pgClientMasked ?? "Configured"} · ${pgEnvironment}`
              : "Not configured"}
          </p>
          <p className="mt-1 text-muted-foreground">
            Last verified: {formatWhen(pgLastVerified)} · Provider {pgProvider}
            {pg.clientCredentialsConfigured === false && pg.configured
              ? " · Client secret pending"
              : ""}
          </p>
          <p className="mt-1 text-muted-foreground">
            Client secret and webhook password are write-only and encrypted at
            rest. Re-enter all credentials whenever you save changes.
          </p>
        </div>
        <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm">
          <p className="font-medium">Webhook URL (configure once in PhonePe dashboard)</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-background px-2 py-1 text-xs">
              {webhookUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(webhookUrl);
                  toast.success("Webhook URL copied");
                } catch {
                  toast.error("Could not copy webhook URL");
                }
              }}
            >
              <ClipboardCopy className="size-4" />
              Copy
            </Button>
          </div>
          <p className="mt-2 text-muted-foreground">
            Use the same webhook username and password below in PhonePe →
            Webhooks. PhonePe sends an Authorization header; the backend
            validates it against these values.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Client ID *</FieldLabel>
            <Input
              value={form.clientId}
              onChange={(e) => {
                setTouched((p) => ({ ...p, clientId: true }));
                setField("clientId", e.target.value);
              }}
              className={inputClass("clientId")}
              aria-invalid={Boolean(displayError("clientId"))}
            />
            <FormFieldError message={displayError("clientId")} />
          </div>
          <div>
            <FieldLabel>Client secret *</FieldLabel>
            <Input
              type="password"
              autoComplete="off"
              value={form.clientSecret}
              onChange={(e) => {
                setTouched((p) => ({ ...p, clientSecret: true }));
                setField("clientSecret", e.target.value);
              }}
              className={inputClass("clientSecret")}
              aria-invalid={Boolean(displayError("clientSecret"))}
            />
            <FormFieldError message={displayError("clientSecret")} />
          </div>
          <div>
            <FieldLabel>Client version *</FieldLabel>
            <Input
              inputMode="numeric"
              value={String(form.clientVersion)}
              onChange={(e) => {
                setTouched((p) => ({ ...p, clientVersion: true }));
                setField(
                  "clientVersion",
                  sanitizePhonePeClientVersionInput(e.target.value),
                );
              }}
              className={inputClass("clientVersion")}
              aria-invalid={Boolean(displayError("clientVersion"))}
            />
            <FormFieldError message={displayError("clientVersion")} />
          </div>
          <div>
            <FieldLabel>Environment</FieldLabel>
            <Select
              value={form.environment}
              onValueChange={(v) =>
                setField("environment", v as PhonePeIntegrationEnvironment)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRODUCTION">Production</SelectItem>
                <SelectItem value="SANDBOX">Sandbox</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Webhook username *</FieldLabel>
            <Input
              value={form.webhookUsername}
              onChange={(e) => {
                setTouched((p) => ({ ...p, webhookUsername: true }));
                setField("webhookUsername", e.target.value);
              }}
              className={inputClass("webhookUsername")}
              aria-invalid={Boolean(displayError("webhookUsername"))}
            />
            <FormFieldError message={displayError("webhookUsername")} />
          </div>
          <div>
            <FieldLabel>Webhook password *</FieldLabel>
            <Input
              type="password"
              autoComplete="off"
              value={form.webhookPassword}
              onChange={(e) => {
                setTouched((p) => ({ ...p, webhookPassword: true }));
                setField("webhookPassword", e.target.value);
              }}
              className={inputClass("webhookPassword")}
              aria-invalid={Boolean(displayError("webhookPassword"))}
            />
            <FormFieldError message={displayError("webhookPassword")} />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={!pg.configured || verifyState.isLoading}
            onClick={async () => {
              try {
                await verify(tenant.id).unwrap();
                toast.success("PhonePe credentials verified");
              } catch (err) {
                handleFormApiError(err, {
                  fallback: "Verification failed",
                });
              }
            }}
          >
            <Webhook />
            Verify connection
          </Button>
          <Button
            disabled={saveDisabled}
            onClick={async () => {
              markAllTouched();
              const clientErrors = validatePlatformPhonePeIntegrationForm(form);
              if (Object.keys(clientErrors).length) {
                setFieldErrors(clientErrors);
                toast.error("Fix the highlighted fields.");
                return;
              }
              try {
                await save({
                  tenantId: tenant.id,
                  body: phonePeIntegrationBodyForApi(form),
                }).unwrap();
                toast.success("PhonePe credentials saved");
                setForm((prev) => ({
                  ...prev,
                  clientSecret: "",
                  webhookPassword: "",
                }));
                setTouched({});
              } catch (err) {
                handleFormApiError(err, {
                  setFieldErrors,
                  fallback: "Could not save PhonePe credentials",
                });
              }
            }}
          >
            <Save />
            Save credentials
          </Button>
        </div>
      </div>
    </Surface>
  );
}

function TenantTemplates({ tenant }: { tenant: PlatformTenantDetail }) { const defs = useGetTemplateDefinitionsQuery(); const templates = useGetTenantTemplatesQuery(tenant.id); const [selected, setSelected] = useState<TemplateDefinition | null>(null); if (defs.isLoading || templates.isLoading) return <PageSkeleton cards={3}/>; const registered = new Map((templates.data ?? []).map((row) => [row.messageType, row])); return <><Surface title="WhatsApp template registry" description="Eight required Meta templates plus the recommended payment-success text fallback"><div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{(defs.data ?? []).map((def) => { const row = registered.get(def.messageType); return <button type="button" key={def.messageType} onClick={() => setSelected(def)} className="rounded-2xl border p-4 text-left hover:border-[#b78491] hover:shadow-sm"><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#f7ecee] text-[#730321]"><MessageCircleMore className="size-5"/></span><StatusBadge status={row ? row.approvalStatus : "PENDING"}/></div><p className="mt-4 font-bold">{def.label}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{def.messageType}</p><p className="mt-3 text-sm text-muted-foreground">{def.variables.length} variables · {def.required ? "Required" : "Optional fallback"}</p><p className={`mt-3 text-sm font-medium ${row ? "text-emerald-700" : "text-amber-700"}`}>{row ? row.templateName : "Registration missing"}</p>{row && <p className="mt-1 font-mono text-xs text-muted-foreground">ID {row.templateId} · v{row.version}{row.active ? "" : " · inactive"}</p>}</button>; })}</div></Surface>{selected && <TemplateDialog tenant={tenant} definition={selected} current={registered.get(selected.messageType)} open onOpenChange={(v) => !v && setSelected(null)}/>}</>; }
function TemplateDialog({
  tenant,
  definition,
  current,
  open,
  onOpenChange,
}: {
  tenant: PlatformTenantDetail;
  definition: TemplateDefinition;
  current?: TenantTemplate;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [save, saveState] = useSaveTenantTemplateMutation();
  const [del] = useDeleteTenantTemplateMutation();
  const [test, testState] = useTestTenantTemplateMutation();
  const [baseline, setBaseline] = useState<PlatformTenantTemplateForm>(() =>
    platformTenantTemplateFormFromRegistration(
      tenant.tenantCode,
      definition,
      current,
    ),
  );
  const [form, setForm] = useState<PlatformTenantTemplateForm>(() =>
    platformTenantTemplateFormFromRegistration(
      tenant.tenantCode,
      definition,
      current,
    ),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof PlatformTenantTemplateForm, boolean>>
  >({});
  const [testMobile, setTestMobile] = useState(() =>
    sanitizeIndianPhoneDigits(tenant.owner.mobile),
  );
  const [verifyMobileError, setVerifyMobileError] = useState<string | undefined>();

  const templateDialogSeed = open
    ? `${tenant.tenantCode}|${tenant.owner.mobile}|${definition.messageType}|${current?.id ?? ""}`
    : "";
  const [appliedTemplateDialogSeed, setAppliedTemplateDialogSeed] = useState("");
  if (open && appliedTemplateDialogSeed !== templateDialogSeed) {
    const next = platformTenantTemplateFormFromRegistration(
      tenant.tenantCode,
      definition,
      current,
    );
    setAppliedTemplateDialogSeed(templateDialogSeed);
    setBaseline(next);
    setForm(next);
    setFieldErrors({});
    setTouched({});
    setTestMobile(sanitizeIndianPhoneDigits(tenant.owner.mobile));
    setVerifyMobileError(undefined);
  }
  if (!open && appliedTemplateDialogSeed) {
    setAppliedTemplateDialogSeed("");
  }

  const liveErrors = useMemo(
    () => livePlatformTenantTemplateFieldErrors(form, touched),
    [form, touched],
  );

  const displayError = (field: keyof PlatformTenantTemplateForm) =>
    fieldErrors[field] ?? liveErrors[field];

  const setField = <K extends keyof PlatformTenantTemplateForm>(
    key: K,
    value: PlatformTenantTemplateForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const markAllTouched = () => {
    setTouched({
      templateName: true,
      templateId: true,
      languageCode: true,
      approvalStatus: true,
      notes: true,
    });
  };

  const submitDisabled =
    saveState.isLoading ||
    !platformTenantTemplateFormReady(form) ||
    (current != null && platformTenantTemplateFormUnchanged(form, baseline));

  const inputClass = (field: keyof PlatformTenantTemplateForm) =>
    cn(displayError(field) && "border-red-600");

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={definition.label}
      description={`${definition.required ? "Required" : "Optional"} · ${definition.messageType}`}
      actionLabel={current ? "Update registration" : "Register template"}
      submitDisabled={submitDisabled}
      suppressDefaultErrorToast
      onError={(err) => {
        handleFormApiError(err, {
          setFieldErrors,
          fieldAliases: {
            providerTemplateName: "templateName",
            providerTemplateId: "templateId",
            language: "languageCode",
          },
          fallback: "Could not save template registration",
        });
      }}
      onSubmit={async () => {
        markAllTouched();
        const clientErrors = validatePlatformTenantTemplateForm(form);
        if (Object.keys(clientErrors).length) {
          setFieldErrors(clientErrors);
          toast.error("Fix the highlighted fields.");
          return false;
        }
        await save({
          tenantId: tenant.id,
          messageType: definition.messageType,
          body: tenantTemplateRegistrationBodyForApi(form, definition),
        }).unwrap();
        toast.success("Template registration saved");
      }}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-[#fbf7f4] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Canonical variable order
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {definition.variables.map((v) => (
              <code key={v.key} className="rounded bg-white px-2 py-1 text-xs">
                {v.index}. {v.key}
              </code>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Meta template name *</FieldLabel>
          <Input
            value={form.templateName}
            onChange={(e) => {
              setTouched((p) => ({ ...p, templateName: true }));
              setField(
                "templateName",
                sanitizeMetaTemplateNameInput(e.target.value),
              );
            }}
            className={inputClass("templateName")}
            aria-invalid={Boolean(displayError("templateName"))}
          />
          <FormFieldError message={displayError("templateName")} />
        </div>
        <div>
          <FieldLabel>Meta template ID *</FieldLabel>
          <Input
            inputMode="numeric"
            value={form.templateId}
            onChange={(e) => {
              setTouched((p) => ({ ...p, templateId: true }));
              setField("templateId", sanitizeMetaTemplateIdInput(e.target.value));
            }}
            className={inputClass("templateId")}
            aria-invalid={Boolean(displayError("templateId"))}
          />
          <FormFieldError message={displayError("templateId")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Language *</FieldLabel>
            <Input
              value={form.languageCode}
              onChange={(e) => {
                setTouched((p) => ({ ...p, languageCode: true }));
                setField(
                  "languageCode",
                  sanitizeTemplateLanguageInput(e.target.value),
                );
              }}
              placeholder="en"
              className={inputClass("languageCode")}
              aria-invalid={Boolean(displayError("languageCode"))}
            />
            <FormFieldError message={displayError("languageCode")} />
          </div>
          <div>
            <FieldLabel>Approval status</FieldLabel>
            <Select
              value={form.approvalStatus}
              onValueChange={(v) =>
                setField("approvalStatus", v as TemplateApprovalStatus)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <FieldLabel>Notes</FieldLabel>
          <Input
            value={form.notes}
            onChange={(e) => {
              setTouched((p) => ({ ...p, notes: true }));
              setField("notes", e.target.value.slice(0, 500));
            }}
            className={inputClass("notes")}
            aria-invalid={Boolean(displayError("notes"))}
          />
          <FormFieldError message={displayError("notes")} />
        </div>
        {current && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <FieldLabel>Test message mobile</FieldLabel>
              <Input
                inputMode="tel"
                value={testMobile}
                onChange={(e) => {
                  setVerifyMobileError(undefined);
                  setTestMobile(sanitizeIndianPhoneDigits(e.target.value));
                }}
                className={cn(verifyMobileError && "border-red-600")}
                aria-invalid={Boolean(verifyMobileError)}
              />
              <FormFieldError message={verifyMobileError} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={testState.isLoading}
                onClick={async () => {
                  const mobileErr = validateWhatsappVerifyTestMobile(testMobile);
                  if (mobileErr) {
                    setVerifyMobileError(mobileErr);
                    toast.error("Fix the test mobile number.");
                    return;
                  }
                  try {
                    await test({
                      tenantId: tenant.id,
                      messageType: definition.messageType,
                      testMobile: whatsappVerifyTestMobileForApi(testMobile),
                    }).unwrap();
                    toast.success("Test template queued");
                  } catch (err) {
                    handleFormApiError(err, {
                      fallback: "Could not queue test message",
                    });
                  }
                }}
              >
                <Send />
                Send test
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-red-700"
                onClick={async () => {
                  try {
                    await del({
                      tenantId: tenant.id,
                      messageType: definition.messageType,
                    }).unwrap();
                    toast.success("Template registration removed");
                    onOpenChange(false);
                  } catch (err) {
                    handleFormApiError(err, {
                      fallback: "Could not delete registration",
                    });
                  }
                }}
              >
                <Trash2 />
                Delete registration
              </Button>
            </div>
          </div>
        )}
      </div>
    </ActionDialog>
  );
}

