"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Building2,
  CreditCard,
  Palette,
  Save,
  Settings2,
  Sparkles,
  Store,
  Coins,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { PermissionGate } from "@/src/components/common/permission-gate";
import {
  FieldLabel,
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { ACTION } from "@/src/lib/action-permissions";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { handleFormApiError } from "@/src/lib/form-api-error";
import { sanitizeIndianPhoneDigits } from "@/src/lib/customer-form";
import { sanitizeBranchPincodeInput } from "@/src/lib/access-form-validation";
import {
  liveSettingsBrandingFieldErrors,
  liveSettingsOperationsFieldErrors,
  liveSettingsProfileFieldErrors,
  profileMobileForApi,
  profilePincodeForApi,
  settingsBrandingFormReady,
  settingsOperationsFormReady,
  settingsProfileFormReady,
  validatePlanRequestNote,
  validateSettingsBrandingForm,
  validateSettingsOperationsForm,
  validateSettingsProfileForm,
  validateTenantLogoFile,
} from "@/src/lib/settings-form-validation";
import { toastApiError } from "@/src/lib/api-error";
import { cn } from "@/lib/utils";
import { env } from "@/src/config/env";
import { CustomerPortalUrlField } from "@/src/features/settings/customer-portal-url-field";
import { SettingsOperationsPanel } from "@/src/features/settings/settings-operations-panel";
import { SubscriptionInvoicesPanel } from "@/src/features/settings/subscription-invoices-panel";
import {
  EcommerceCatalogNav,
  EcommerceRelatedLink,
  EcommerceSettingsHint,
  SettingsToggleRow,
} from "@/src/features/ecommerce/ecommerce-settings-ui";
import {
  useCompleteUploadMutation,
  useGetAvailablePlansQuery,
  useGetSettingsBrandingQuery,
  useGetSettingsOperationsQuery,
  useGetSettingsProfileQuery,
  useGetSubscriptionInvoicesQuery,
  useGetSubscriptionQuery,
  usePatchSettingsBrandingMutation,
  usePatchSettingsOperationsMutation,
  usePatchSettingsProfileMutation,
  usePresignUploadMutation,
  useRequestSubscriptionUpgradeMutation,
} from "@/src/store/api/admin-api";

type UsageMeter = {
  used: number;
  limit: number;
  percent: number;
  status: string;
  resetsOn?: string;
};

function formatBillingCycle(cycle?: string) {
  if (!cycle) return "";
  return cycle
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const USAGE_BAR: Record<string, string> = {
  OK: "bg-emerald-600",
  NEAR_LIMIT: "bg-amber-500",
  AT_LIMIT: "bg-[#730321]",
  EXCEEDED: "bg-red-600",
};

function UsageCard({
  label,
  meter,
  hint,
}: {
  label: string;
  meter: UsageMeter;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#eaded9] bg-gradient-to-br from-white to-[#faf6f4] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-extrabold text-[#1a1014]">
            {meter.used.toLocaleString("en-IN")}
            <span className="text-sm font-semibold text-muted-foreground">
              {" "}
              / {meter.limit.toLocaleString("en-IN")}
            </span>
          </p>
        </div>
        <StatusBadge
          status={
            meter.status === "OK"
              ? "ACTIVE"
              : meter.status === "NEAR_LIMIT"
                ? "PENDING"
                : "OVERDUE"
          }
        />
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#eadde0]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            USAGE_BAR[meter.status] ?? "bg-[#730321]",
          )}
          style={{ width: `${Math.min(100, meter.percent)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {hint ??
          `${Math.round(meter.percent)}% · ${meter.status.replaceAll("_", " ")}`}
      </p>
    </div>
  );
}

function FeaturePill({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold",
        on
          ? "bg-emerald-50 text-emerald-800"
          : "bg-[#f3eef0] text-muted-foreground",
      )}
    >
      {on ? "On" : "Off"} · {label}
    </span>
  );
}

export function SettingsPage({
  initialTab = "profile",
}: {
  initialTab?: "profile" | "branding" | "operations" | "subscription";
}) {
  const searchParams = useSearchParams();
  const flexibleUpgradeInterest =
    searchParams.get("interest") === "flexible";
  const profileQuery = useGetSettingsProfileQuery();
  const brandingQuery = useGetSettingsBrandingQuery();
  const operationsQuery = useGetSettingsOperationsQuery();
  const subscriptionQuery = useGetSubscriptionQuery();
  const plansQuery = useGetAvailablePlansQuery();
  const invoicesQuery = useGetSubscriptionInvoicesQuery();

  const [patchProfile] = usePatchSettingsProfileMutation();
  const [patchBranding] = usePatchSettingsBrandingMutation();
  const [patchOperations] = usePatchSettingsOperationsMutation();
  const [requestUpgrade] = useRequestSubscriptionUpgradeMutation();
  const [presignUpload, presignState] = usePresignUploadMutation();
  const [completeUpload] = useCompleteUploadMutation();
  const [logoBusy, setLogoBusy] = useState(false);

  const [profileForm, setProfileForm] = useState({
    businessName: "",
    displayName: "",
    ownerName: "",
    ownerMobile: "",
    ownerEmail: "",
    supportNumber: "",
    gstin: "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [brandingForm, setBrandingForm] = useState({
    primaryColor: "#730321",
    secondaryColor: "#C9A227",
    appDisplayName: "",
  });
  const [previewUrls, setPreviewUrls] = useState<{
    appIcon?: string;
    receiptHeader?: string;
    passbookImage?: string;
  }>({});
  const [previewTab, setPreviewTab] = useState<
    "appIcon" | "receiptHeader" | "passbookImage"
  >("passbookImage");

  const [opsForm, setOpsForm] = useState({
    multiSchemePerCustomer: true,
    kycMandatory: false,
    requireKycForRedemption: false,
    customerAppMaintenance: false,
    kycAllowedTypes: ["AADHAAR", "PAN"] as Array<"AADHAAR" | "PAN">,
    customerSelfEnrolEnabled: true,
    customerSelfRegistrationEnabled: true,
    customerLoginMode: "OTP_ONLY" as "OTP_ONLY" | "PASSWORD_ONLY",
    customerAppWriteEnabled: true,
    customerAppPaymentsEnabled: true,
    agentCanRegisterCustomers: false,
    agentCanEnrolSchemes: false,
    redemptionApprovalRequired: true,
    receiptPrefix: "",
    receiptNumberFormat: "",
    passbookNumberFormat: "",
    schemeNumberFormat: "",
    goldPurity: "22K",
    weightRoundingMode: "HALF_UP",
    paymentReversalWindowHours: 48,
    termsAndConditions: "",
  });

  const [planRequestNote, setPlanRequestNote] = useState("");
  const [planNoteTouched, setPlanNoteTouched] = useState(false);

  const [profileFieldErrors, setProfileFieldErrors] = useState<
    Record<string, string>
  >({});
  const [profileTouched, setProfileTouched] = useState<
    Record<string, boolean>
  >({});
  const [brandingFieldErrors, setBrandingFieldErrors] = useState<
    Record<string, string>
  >({});
  const [brandingTouched, setBrandingTouched] = useState<
    Record<string, boolean>
  >({});
  const [opsFieldErrors, setOpsFieldErrors] = useState<Record<string, string>>(
    {},
  );
  const [opsTouched, setOpsTouched] = useState<Record<string, boolean>>({});
  const [logoFieldError, setLogoFieldError] = useState<string | undefined>();

  const profileLiveErrors = useMemo(
    () => liveSettingsProfileFieldErrors(profileForm),
    [profileForm],
  );
  const brandingLiveErrors = useMemo(
    () => liveSettingsBrandingFieldErrors(brandingForm),
    [brandingForm],
  );
  const opsLiveErrors = useMemo(
    () => liveSettingsOperationsFieldErrors(opsForm),
    [opsForm],
  );

  const profileDisplayError = (field: keyof typeof profileForm) => {
    const show =
      profileTouched[field] ||
      (field === "businessName" && profileForm.businessName.trim()) ||
      (field === "ownerMobile" &&
        profileForm.ownerMobile.replace(/\D/g, "").length > 0);
    return (
      profileFieldErrors[field] ??
      (show ? profileLiveErrors[field] : undefined)
    );
  };

  const brandingDisplayError = (field: keyof typeof brandingForm) =>
    brandingFieldErrors[field] ??
    (brandingTouched[field] ? brandingLiveErrors[field] : undefined);

  const opsDisplayError = (field: keyof typeof opsForm) =>
    opsFieldErrors[field] ??
    (opsTouched[field] ? opsLiveErrors[field] : undefined);

  const planNoteError =
    planNoteTouched || planRequestNote
      ? validatePlanRequestNote(planRequestNote)
      : undefined;

  const profileDataSeed = profileQuery.data
    ? JSON.stringify({
        businessName: profileQuery.data.businessName,
        displayName: profileQuery.data.displayName,
        ownerName: profileQuery.data.ownerName,
        ownerMobile: profileQuery.data.ownerMobile,
        ownerEmail: profileQuery.data.ownerEmail,
        supportNumber: profileQuery.data.supportNumber,
        gstin: profileQuery.data.gstin,
        address: profileQuery.data.address,
      })
    : "";
  const [appliedProfileDataSeed, setAppliedProfileDataSeed] = useState("");
  if (profileQuery.data && appliedProfileDataSeed !== profileDataSeed) {
    const p = profileQuery.data;
    setAppliedProfileDataSeed(profileDataSeed);
    setProfileForm({
      businessName: String(p.businessName ?? ""),
      displayName: String(p.displayName ?? ""),
      ownerName: String(p.ownerName ?? ""),
      ownerMobile: String(p.ownerMobile ?? ""),
      ownerEmail: String(p.ownerEmail ?? ""),
      supportNumber: String(p.supportNumber ?? ""),
      gstin: String(p.gstin ?? ""),
      line1: String(p.address?.line1 ?? ""),
      city: String(p.address?.city ?? ""),
      state: String(p.address?.state ?? ""),
      pincode: String(p.address?.pincode ?? ""),
    });
  }

  const brandingDataSeed = brandingQuery.data
    ? JSON.stringify(brandingQuery.data)
    : "";
  const [appliedBrandingDataSeed, setAppliedBrandingDataSeed] = useState("");
  if (brandingQuery.data && appliedBrandingDataSeed !== brandingDataSeed) {
    const b = brandingQuery.data;
    setAppliedBrandingDataSeed(brandingDataSeed);
    setBrandingForm({
      primaryColor: b.primaryColor ?? "#730321",
      secondaryColor:
        (b as { accentColor?: string }).accentColor ??
        b.secondaryColor ??
        "#C9A227",
      appDisplayName:
        (b as { displayName?: string }).displayName ??
        b.appDisplayName ??
        "",
    });
    if (b.previewUrls) setPreviewUrls(b.previewUrls);
  }

  const operationsDataSeed = operationsQuery.data
    ? JSON.stringify(operationsQuery.data)
    : "";
  const [appliedOperationsDataSeed, setAppliedOperationsDataSeed] =
    useState("");
  if (operationsQuery.data && appliedOperationsDataSeed !== operationsDataSeed) {
    const o = operationsQuery.data;
    setAppliedOperationsDataSeed(operationsDataSeed);
    setOpsForm({
      multiSchemePerCustomer: Boolean(o.multiSchemePerCustomer),
      kycMandatory: Boolean(o.kycMandatory),
      requireKycForRedemption: Boolean(o.requireKycForRedemption),
      customerAppMaintenance: Boolean(o.customerAppMaintenance),
      kycAllowedTypes: Array.isArray(o.kycAllowedTypes)
        ? o.kycAllowedTypes.filter(
            (value: string): value is "AADHAAR" | "PAN" =>
              value === "AADHAAR" || value === "PAN",
          )
        : ["AADHAAR", "PAN"],
      customerSelfEnrolEnabled: Boolean(o.customerSelfEnrolEnabled),
      customerSelfRegistrationEnabled: Boolean(
        o.customerSelfRegistrationEnabled,
      ),
      customerLoginMode:
        o.customerLoginMode === "PASSWORD_ONLY" ? "PASSWORD_ONLY" : "OTP_ONLY",
      customerAppWriteEnabled: Boolean(o.customerAppWriteEnabled ?? true),
      customerAppPaymentsEnabled: Boolean(
        o.customerAppPaymentsEnabled ?? true,
      ),
      agentCanRegisterCustomers: o.agentCanRegisterCustomers === true,
      agentCanEnrolSchemes: o.agentCanEnrolSchemes === true,
      redemptionApprovalRequired: Boolean(o.redemptionApprovalRequired),
      receiptPrefix: String(o.receiptPrefix ?? ""),
      receiptNumberFormat: String(o.receiptNumberFormat ?? ""),
      passbookNumberFormat: String(o.passbookNumberFormat ?? ""),
      schemeNumberFormat: String(o.schemeNumberFormat ?? ""),
      goldPurity: String(o.goldPurity ?? "22K"),
      weightRoundingMode: String(o.weightRoundingMode ?? "HALF_UP"),
      paymentReversalWindowHours: Number(o.paymentReversalWindowHours ?? 48),
      termsAndConditions: String(o.termsAndConditions ?? ""),
    });
  }

  const loading =
    profileQuery.isLoading ||
    brandingQuery.isLoading ||
    operationsQuery.isLoading ||
    subscriptionQuery.isLoading;

  const error =
    profileQuery.isError ||
    brandingQuery.isError ||
    operationsQuery.isError ||
    subscriptionQuery.isError;

  const tabDefault = useMemo(() => {
    if (
      initialTab === "branding" ||
      initialTab === "operations" ||
      initialTab === "subscription"
    )
      return initialTab;
    return "profile";
  }, [initialTab]);

  if (loading) return <PageSkeleton cards={4} />;
  if (error || !profileQuery.data || !subscriptionQuery.data) {
    return (
      <QueryError
        onRetry={() => {
          profileQuery.refetch();
          brandingQuery.refetch();
          operationsQuery.refetch();
          subscriptionQuery.refetch();
        }}
        title="Settings could not be loaded"
        error={
          profileQuery.error ??
          brandingQuery.error ??
          operationsQuery.error ??
          subscriptionQuery.error
        }
      />
    );
  }

  const profile = profileQuery.data;
  const subscription = subscriptionQuery.data;
  const usage = subscription.usage ?? {};
  const features = subscription.features ?? {};
  const ecommerceAccess = (subscription.ecommerce ??
    operationsQuery.data?.ecommerce) as
    | { planEntitled?: boolean; enabled?: boolean; active?: boolean }
    | undefined;
  const ecommercePlanEntitled = ecommerceAccess?.planEntitled === true;
  const ecommerceStoreEnabled =
    operationsQuery.data?.ecommerceEnabled === true ||
    ecommerceAccess?.enabled === true;
  const ecommerceStoreActive = ecommerceAccess?.active === true;
  const digitalMetalsAccess = (subscription.digitalMetals ??
    operationsQuery.data?.digitalMetals) as
    | { planEntitled?: boolean; enabled?: boolean; active?: boolean }
    | undefined;
  const digitalMetalsPlanEntitled = digitalMetalsAccess?.planEntitled === true;
  const digitalMetalsModuleEnabled =
    operationsQuery.data?.digitalMetalsEnabled === true ||
    digitalMetalsAccess?.enabled === true;
  const digitalMetalsModuleActive = digitalMetalsAccess?.active === true;
  const plans = plansQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const pendingPlanChange = subscription.pendingUpgradeRequest as
    | {
        targetTier?: string;
        status?: string;
        note?: string | null;
      }
    | undefined;

  const saveEcommerceEnabled = async (enabled: boolean) => {
    try {
      await patchOperations({
        ecommerceEnabled: enabled,
        expectedVersion: operationsQuery.data?.audit?.version,
      }).unwrap();
      toast.success(
        enabled ? "Online store enabled" : "Online store disabled",
      );
    } catch (err) {
      handleFormApiError(err, {
        fallback: "Could not update online store setting",
      });
    }
  };

  const saveDigitalMetalsEnabled = async (enabled: boolean) => {
    try {
      await patchOperations({
        digitalMetalsEnabled: enabled,
        expectedVersion: operationsQuery.data?.audit?.version,
      }).unwrap();
      toast.success(
        enabled ? "Digital Gold & Silver enabled" : "Digital Gold & Silver disabled",
      );
    } catch (err) {
      handleFormApiError(err, {
        fallback: "Could not update digital metals setting",
      });
    }
  };

  const saveOperations = async () => {
    setOpsTouched({
      receiptPrefix: true,
      receiptNumberFormat: true,
      passbookNumberFormat: true,
      schemeNumberFormat: true,
      goldPurity: true,
      weightRoundingMode: true,
      paymentReversalWindowHours: true,
      termsAndConditions: true,
    });
    const clientErrors = validateSettingsOperationsForm(opsForm);
    if (Object.keys(clientErrors).length) {
      setOpsFieldErrors(clientErrors);
      toast.error("Fix the highlighted fields.");
      return;
    }
    try {
      await patchOperations({
        ...opsForm,
        expectedVersion: operationsQuery.data?.audit?.version,
      }).unwrap();
      toast.success("Operations saved");
      setOpsFieldErrors({});
    } catch (err) {
      handleFormApiError(err, {
        setFieldErrors: setOpsFieldErrors,
        fallback: "Could not save operations",
      });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Tenant configuration"
        title="Settings"
        description={`${profile.businessName} · ${profile.tenantCode} · ${subscription.currentPlan?.name ?? "—"} plan`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={CreditCard}
          label="Plan"
          value={subscription.currentPlan?.name ?? "—"}
          detail={`${subscription.daysRemaining ?? "—"} days left · ${subscription.status}`}
        />
        <StatCard
          icon={Building2}
          label="Active customers"
          value={(usage.activeCustomers?.used ?? 0).toLocaleString("en-IN")}
          detail={`of ${(usage.activeCustomers?.limit ?? 0).toLocaleString("en-IN")}`}
          tone="cream"
        />
        <StatCard
          icon={UsersRound}
          label="Staff seats"
          value={`${usage.staffSeats?.used ?? 0} / ${usage.staffSeats?.limit ?? 0}`}
          detail={
            usage.staffSeats?.status === "AT_LIMIT"
              ? "At staff limit"
              : "From subscription usage"
          }
        />
        <StatCard
          icon={Store}
          label="Branches"
          value={`${usage.branches?.used ?? 0} / ${usage.branches?.limit ?? 0}`}
          detail={
            usage.branches?.status === "AT_LIMIT"
              ? "At showroom limit"
              : "Showroom capacity"
          }
          tone="wine"
        />
        <StatCard
          icon={Sparkles}
          label="WhatsApp"
          value={`${Math.round(usage.whatsappMessages?.percent ?? 0)}%`}
          detail={
            usage.whatsappMessages?.resetsOn
              ? `Resets ${usage.whatsappMessages.resetsOn}`
              : "Monthly quota"
          }
          tone="gold"
        />
      </div>

      <Surface>
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-[#1a1014]">Setup shortcuts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Branches, staff and gold rate live on their own screens
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="bg-[#f3eef0]" asChild>
              <Link href="/staff-branches">
                <Store />
                Staff & branches
              </Link>
            </Button>
            <Button variant="secondary" className="bg-[#f3eef0]" asChild>
              <Link href="/gold-rates">
                <Coins />
                Gold rate
              </Link>
            </Button>
            <Button variant="secondary" className="bg-[#f3eef0]" asChild>
              <Link href="/schemes">Scheme plans</Link>
            </Button>
          </div>
        </div>
      </Surface>

      <PageTabs defaultValue={tabDefault} key={tabDefault}>
        <PageTabsBar sectionLabel="Settings">
          <PageTab value="profile">
            <Building2 />
            Business profile
          </PageTab>
          <PageTab value="branding">
            <Palette />
            Branding
          </PageTab>
          <PageTab value="operations">
            <Settings2 />
            Operations
          </PageTab>
          <PageTab value="subscription">
            <CreditCard />
            Subscription
          </PageTab>
        </PageTabsBar>

        <PageTabsPanel value="profile">
          <Surface
            title="Business profile"
            description="Shown on receipts, passbooks and customer communication"
          >
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <FieldLabel>Business name</FieldLabel>
                <Input
                  value={profileForm.businessName}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, businessName: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.businessName;
                      return next;
                    });
                    setProfileForm({
                      ...profileForm,
                      businessName: e.target.value,
                    });
                  }}
                  className={cn(
                    profileDisplayError("businessName") && "border-red-600",
                  )}
                  aria-invalid={Boolean(profileDisplayError("businessName"))}
                />
                <FormFieldError message={profileDisplayError("businessName")} />
              </div>
              <div>
                <FieldLabel>Display name</FieldLabel>
                <Input
                  value={profileForm.displayName}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, displayName: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.displayName;
                      return next;
                    });
                    setProfileForm({
                      ...profileForm,
                      displayName: e.target.value,
                    });
                  }}
                  className={cn(
                    profileDisplayError("displayName") && "border-red-600",
                  )}
                  aria-invalid={Boolean(profileDisplayError("displayName"))}
                />
                <FormFieldError message={profileDisplayError("displayName")} />
              </div>
              <div>
                <FieldLabel>Owner name</FieldLabel>
                <Input
                  value={profileForm.ownerName}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, ownerName: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.ownerName;
                      return next;
                    });
                    setProfileForm({ ...profileForm, ownerName: e.target.value });
                  }}
                  className={cn(
                    profileDisplayError("ownerName") && "border-red-600",
                  )}
                  aria-invalid={Boolean(profileDisplayError("ownerName"))}
                />
                <FormFieldError message={profileDisplayError("ownerName")} />
              </div>
              <div>
                <FieldLabel>Tenant code</FieldLabel>
                <Input value={String(profile.tenantCode ?? "")} disabled />
              </div>
              {profile.tenantCode ? (
                <CustomerPortalUrlField tenantCode={String(profile.tenantCode)} />
              ) : null}
              <div>
                <FieldLabel>Owner mobile</FieldLabel>
                <Input
                  inputMode="tel"
                  value={profileForm.ownerMobile}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, ownerMobile: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.ownerMobile;
                      return next;
                    });
                    setProfileForm({
                      ...profileForm,
                      ownerMobile: sanitizeIndianPhoneDigits(e.target.value),
                    });
                  }}
                  className={cn(
                    profileDisplayError("ownerMobile") && "border-red-600",
                  )}
                  aria-invalid={Boolean(profileDisplayError("ownerMobile"))}
                />
                <FormFieldError message={profileDisplayError("ownerMobile")} />
              </div>
              <div>
                <FieldLabel>Owner email</FieldLabel>
                <Input
                  type="email"
                  value={profileForm.ownerEmail}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, ownerEmail: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.ownerEmail;
                      return next;
                    });
                    setProfileForm({
                      ...profileForm,
                      ownerEmail: e.target.value,
                    });
                  }}
                  className={cn(
                    profileDisplayError("ownerEmail") && "border-red-600",
                  )}
                  aria-invalid={Boolean(profileDisplayError("ownerEmail"))}
                />
                <FormFieldError message={profileDisplayError("ownerEmail")} />
              </div>
              <div>
                <FieldLabel>Support number</FieldLabel>
                <Input
                  inputMode="tel"
                  value={profileForm.supportNumber}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, supportNumber: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.supportNumber;
                      return next;
                    });
                    setProfileForm({
                      ...profileForm,
                      supportNumber: sanitizeIndianPhoneDigits(e.target.value),
                    });
                  }}
                  className={cn(
                    profileDisplayError("supportNumber") && "border-red-600",
                  )}
                  aria-invalid={Boolean(profileDisplayError("supportNumber"))}
                />
                <FormFieldError message={profileDisplayError("supportNumber")} />
              </div>
              <div>
                <FieldLabel>GSTIN (optional)</FieldLabel>
                <Input
                  value={profileForm.gstin}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, gstin: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.gstin;
                      return next;
                    });
                    setProfileForm({
                      ...profileForm,
                      gstin: e.target.value.toUpperCase().slice(0, 15),
                    });
                  }}
                  placeholder="Printed on receipts only"
                  className={cn(profileDisplayError("gstin") && "border-red-600")}
                  aria-invalid={Boolean(profileDisplayError("gstin"))}
                />
                <FormFieldError message={profileDisplayError("gstin")} />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Address line</FieldLabel>
                <Input
                  value={profileForm.line1}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, line1: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.line1;
                      return next;
                    });
                    setProfileForm({ ...profileForm, line1: e.target.value });
                  }}
                  className={cn(profileDisplayError("line1") && "border-red-600")}
                  aria-invalid={Boolean(profileDisplayError("line1"))}
                />
                <FormFieldError message={profileDisplayError("line1")} />
              </div>
              <div>
                <FieldLabel>City</FieldLabel>
                <Input
                  value={profileForm.city}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, city: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.city;
                      return next;
                    });
                    setProfileForm({ ...profileForm, city: e.target.value });
                  }}
                  className={cn(profileDisplayError("city") && "border-red-600")}
                  aria-invalid={Boolean(profileDisplayError("city"))}
                />
                <FormFieldError message={profileDisplayError("city")} />
              </div>
              <div>
                <FieldLabel>State</FieldLabel>
                <Input
                  value={profileForm.state}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, state: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.state;
                      return next;
                    });
                    setProfileForm({ ...profileForm, state: e.target.value });
                  }}
                  className={cn(profileDisplayError("state") && "border-red-600")}
                  aria-invalid={Boolean(profileDisplayError("state"))}
                />
                <FormFieldError message={profileDisplayError("state")} />
              </div>
              <div>
                <FieldLabel>Pincode</FieldLabel>
                <Input
                  inputMode="numeric"
                  value={profileForm.pincode}
                  onChange={(e) => {
                    setProfileTouched((p) => ({ ...p, pincode: true }));
                    setProfileFieldErrors((p) => {
                      const next = { ...p };
                      delete next.pincode;
                      return next;
                    });
                    setProfileForm({
                      ...profileForm,
                      pincode: sanitizeBranchPincodeInput(e.target.value),
                    });
                  }}
                  className={cn(
                    profileDisplayError("pincode") && "border-red-600",
                  )}
                  aria-invalid={Boolean(profileDisplayError("pincode"))}
                />
                <FormFieldError message={profileDisplayError("pincode")} />
              </div>
            </div>
            <div className="flex justify-end border-t border-[#eaded9] px-6 py-4">
              <PermissionGate permission={ACTION.tenantSettingsWrite}>
                <Button
                  disabled={!settingsProfileFormReady(profileForm)}
                  onClick={async () => {
                    setProfileTouched({
                      businessName: true,
                      displayName: true,
                      ownerName: true,
                      ownerMobile: true,
                      ownerEmail: true,
                      supportNumber: true,
                      gstin: true,
                      line1: true,
                      city: true,
                      state: true,
                      pincode: true,
                    });
                    const clientErrors = validateSettingsProfileForm(profileForm);
                    if (Object.keys(clientErrors).length) {
                      setProfileFieldErrors(clientErrors);
                      toast.error("Fix the highlighted fields.");
                      return;
                    }
                    try {
                      await patchProfile({
                        businessName: profileForm.businessName.trim(),
                        displayName: profileForm.displayName.trim(),
                        ownerName: profileForm.ownerName.trim(),
                        ownerMobile: profileMobileForApi(profileForm.ownerMobile),
                        ownerEmail: profileForm.ownerEmail.trim() || undefined,
                        supportNumber:
                          profileMobileForApi(profileForm.supportNumber) ||
                          undefined,
                        gstin: profileForm.gstin.trim().toUpperCase() || null,
                        address: {
                          line1: profileForm.line1.trim(),
                          city: profileForm.city.trim(),
                          state: profileForm.state.trim(),
                          pincode: profilePincodeForApi(profileForm.pincode),
                        },
                        expectedVersion: profile.audit?.version,
                      }).unwrap();
                      toast.success("Business profile saved");
                      setProfileFieldErrors({});
                    } catch (err) {
                      handleFormApiError(err, {
                        setFieldErrors: setProfileFieldErrors,
                        fallback: "Could not save profile",
                      });
                    }
                  }}
                >
                  <Save />
                  Save profile
                </Button>
              </PermissionGate>
            </div>
          </Surface>
        </PageTabsPanel>

        <PageTabsPanel value="branding">
          <PermissionGate
            permission={ACTION.tenantBrandingWrite}
            fallback={
              <Surface title="Branding">
                <p className="p-6 text-sm text-muted-foreground">
                  You need tenant.branding.write to change logo and colours.
                </p>
              </Surface>
            }
          >
            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <Surface
                title="Brand colours & app name"
                description="Applied to the customer app, receipts and passbooks"
              >
                <div className="space-y-5 p-6">
                  <div>
                    <FieldLabel>App display name</FieldLabel>
                    <Input
                      value={brandingForm.appDisplayName}
                      onChange={(e) => {
                        setBrandingTouched((p) => ({
                          ...p,
                          appDisplayName: true,
                        }));
                        setBrandingFieldErrors((p) => {
                          const next = { ...p };
                          delete next.appDisplayName;
                          return next;
                        });
                        setBrandingForm({
                          ...brandingForm,
                          appDisplayName: e.target.value,
                        });
                      }}
                      className={cn(
                        brandingDisplayError("appDisplayName") &&
                          "border-red-600",
                      )}
                      aria-invalid={Boolean(
                        brandingDisplayError("appDisplayName"),
                      )}
                    />
                    <FormFieldError
                      message={brandingDisplayError("appDisplayName")}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Primary colour</FieldLabel>
                      <div className="flex gap-3">
                        <Input
                          type="color"
                          value={brandingForm.primaryColor}
                          onChange={(e) => {
                            setBrandingTouched((p) => ({
                              ...p,
                              primaryColor: true,
                            }));
                            setBrandingFieldErrors((p) => {
                              const next = { ...p };
                              delete next.primaryColor;
                              return next;
                            });
                            setBrandingForm({
                              ...brandingForm,
                              primaryColor: e.target.value,
                            });
                          }}
                          className="h-11 w-16 p-1"
                        />
                        <Input
                          value={brandingForm.primaryColor}
                          onChange={(e) => {
                            setBrandingTouched((p) => ({
                              ...p,
                              primaryColor: true,
                            }));
                            setBrandingFieldErrors((p) => {
                              const next = { ...p };
                              delete next.primaryColor;
                              return next;
                            });
                            setBrandingForm({
                              ...brandingForm,
                              primaryColor: e.target.value,
                            });
                          }}
                          className={cn(
                            brandingDisplayError("primaryColor") &&
                              "border-red-600",
                          )}
                          aria-invalid={Boolean(
                            brandingDisplayError("primaryColor"),
                          )}
                        />
                      </div>
                      <FormFieldError
                        message={brandingDisplayError("primaryColor")}
                      />
                    </div>
                    <div>
                      <FieldLabel>Secondary colour</FieldLabel>
                      <div className="flex gap-3">
                        <Input
                          type="color"
                          value={brandingForm.secondaryColor}
                          onChange={(e) => {
                            setBrandingTouched((p) => ({
                              ...p,
                              secondaryColor: true,
                            }));
                            setBrandingFieldErrors((p) => {
                              const next = { ...p };
                              delete next.secondaryColor;
                              return next;
                            });
                            setBrandingForm({
                              ...brandingForm,
                              secondaryColor: e.target.value,
                            });
                          }}
                          className="h-11 w-16 p-1"
                        />
                        <Input
                          value={brandingForm.secondaryColor}
                          onChange={(e) => {
                            setBrandingTouched((p) => ({
                              ...p,
                              secondaryColor: true,
                            }));
                            setBrandingFieldErrors((p) => {
                              const next = { ...p };
                              delete next.secondaryColor;
                              return next;
                            });
                            setBrandingForm({
                              ...brandingForm,
                              secondaryColor: e.target.value,
                            });
                          }}
                          className={cn(
                            brandingDisplayError("secondaryColor") &&
                              "border-red-600",
                          )}
                          aria-invalid={Boolean(
                            brandingDisplayError("secondaryColor"),
                          )}
                        />
                      </div>
                      <FormFieldError
                        message={brandingDisplayError("secondaryColor")}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Logo</FieldLabel>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={logoBusy || presignState.isLoading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        const fileErr = validateTenantLogoFile(file);
                        if (fileErr) {
                          setLogoFieldError(fileErr);
                          toast.error(fileErr);
                          return;
                        }
                        setLogoFieldError(undefined);
                        setLogoBusy(true);
                        try {
                          const presign = await presignUpload({
                            purpose: "TENANT_LOGO",
                            fileName: file.name,
                            contentType: file.type || "image/png",
                            sizeBytes: file.size,
                          }).unwrap();
                          if (presign.uploadUrl && !env.useMocks) {
                            const put = await fetch(presign.uploadUrl, {
                              method: presign.method || "PUT",
                              headers: {
                                ...(presign.headers ?? {}),
                                "Content-Type":
                                  file.type ||
                                  presign.headers?.["Content-Type"] ||
                                  "image/png",
                              },
                              body: file,
                            });
                            if (!put.ok) {
                              throw new Error("Upload to storage failed");
                            }
                          }
                          await completeUpload(presign.uploadId).unwrap();
                          const res = await patchBranding({
                            logoUploadId: presign.uploadId,
                            expectedVersion:
                              brandingQuery.data?.audit?.version,
                          }).unwrap();
                          if (res?.previewUrls) setPreviewUrls(res.previewUrls);
                          toast.success("Logo uploaded");
                        } catch (err) {
                          toastApiError(err, "Could not upload logo");
                        } finally {
                          setLogoBusy(false);
                        }
                      }}
                    />
                    <FormFieldError message={logoFieldError} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {logoBusy
                        ? "Uploading logo…"
                        : "PNG, JPEG or WebP up to 2 MB. Saved as logoUploadId."}
                    </p>
                  </div>
                  <div
                    className="flex h-20 items-center gap-4 rounded-2xl px-5 text-white"
                    style={{
                      background: `linear-gradient(135deg, ${brandingForm.primaryColor}, ${brandingForm.secondaryColor})`,
                    }}
                  >
                    <div className="text-sm font-bold uppercase tracking-wide opacity-80">
                      Live swatch
                    </div>
                    <div className="text-lg font-extrabold">
                      {brandingForm.appDisplayName || "App name"}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      disabled={!settingsBrandingFormReady(brandingForm)}
                      onClick={async () => {
                        setBrandingTouched({
                          primaryColor: true,
                          secondaryColor: true,
                          appDisplayName: true,
                        });
                        const clientErrors =
                          validateSettingsBrandingForm(brandingForm);
                        if (Object.keys(clientErrors).length) {
                          setBrandingFieldErrors(clientErrors);
                          toast.error("Fix the highlighted fields.");
                          return;
                        }
                        try {
                          const res = await patchBranding({
                            primaryColor: brandingForm.primaryColor.trim(),
                            secondaryColor:
                              brandingForm.secondaryColor.trim(),
                            appDisplayName:
                              brandingForm.appDisplayName.trim(),
                            expectedVersion:
                              brandingQuery.data?.audit?.version,
                          }).unwrap();
                          if (res?.previewUrls) setPreviewUrls(res.previewUrls);
                          toast.success("Branding saved — previews refreshed");
                          setBrandingFieldErrors({});
                        } catch (err) {
                          handleFormApiError(err, {
                            setFieldErrors: setBrandingFieldErrors,
                            fallback: "Could not save branding",
                          });
                        }
                      }}
                    >
                      <Save />
                      Save branding
                    </Button>
                  </div>
                </div>
              </Surface>

              <Surface
                title="Server-rendered previews"
                description="Colour choices often look fine in a swatch and wrong on a passbook"
              >
                <div className="p-5">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(
                      [
                        ["appIcon", "App icon"],
                        ["receiptHeader", "Receipt"],
                        ["passbookImage", "Passbook"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPreviewTab(key)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                          previewTab === key
                            ? "bg-[#730321] text-white"
                            : "bg-[#f3eef0] text-[#5c3d42] hover:bg-[#ebe3e6]",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-[#eaded9] bg-[#faf6f4] p-4">
                    {previewUrls[previewTab] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrls[previewTab]}
                        alt={`${previewTab} preview`}
                        className={cn(
                          "rounded-xl border bg-white shadow-sm",
                          previewTab === "appIcon" && "max-h-56",
                          previewTab === "receiptHeader" && "w-full max-w-md",
                          previewTab === "passbookImage" && "max-h-80",
                        )}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Save branding to refresh previewUrls
                      </p>
                    )}
                  </div>
                </div>
              </Surface>
            </div>
          </PermissionGate>
        </PageTabsPanel>

        <PageTabsPanel value="operations">
          <SettingsOperationsPanel
            form={opsForm}
            onFormChange={setOpsForm}
            displayError={opsDisplayError}
            onFieldTouch={(field) =>
              setOpsTouched((prev) => ({ ...prev, [field]: true }))
            }
            onFieldErrorClear={(field) =>
              setOpsFieldErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
              })
            }
            saveDisabled={!settingsOperationsFormReady(opsForm)}
            onSave={saveOperations}
            saveSlot={
              <PermissionGate permission={ACTION.tenantSettingsWrite}>
                <Button
                  className="h-11 shrink-0 gap-2 px-6"
                  disabled={!settingsOperationsFormReady(opsForm)}
                  onClick={() => void saveOperations()}
                >
                  <Save />
                  Save operations
                </Button>
              </PermissionGate>
            }
          />
        </PageTabsPanel>

        <PageTabsPanel value="subscription">
          <div className="grid gap-5">
            <Surface
              title={`${subscription.currentPlan?.name ?? "—"} plan`}
            description={`${subscription.currentPlan?.monthlyPrice?.amountDisplay ?? ""} · ${formatBillingCycle(String(subscription.currentPlan?.billingCycle ?? ""))} · renews ${subscription.currentPeriodEnd ?? "—"}`}
          >
            {pendingPlanChange?.targetTier ? (
              <div className="border-b border-[#eadbb5] bg-[#fff8e8] px-6 py-3 text-sm text-[#805817]">
                Plan change to{" "}
                <strong>{pendingPlanChange.targetTier}</strong> is pending
                platform review
                {pendingPlanChange.note
                  ? ` — “${pendingPlanChange.note}”`
                  : ""}
                .
              </div>
            ) : null}
            {flexibleUpgradeInterest && !features.flexibleScheme ? (
              <div className="border-b border-[#eaded9] bg-[#faf4f6] px-6 py-3 text-sm text-[#49121f]">
                Flexible scheme plans need a Growth (or higher) subscription.
                Submit an upgrade request below — billing stays request-only in
                V1 until the platform team approves.
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#eaded9] px-6 py-4">
                <StatusBadge
                  status={
                    subscription.status === "ACTIVE" ? "ACTIVE" : "PENDING"
                  }
                />
                <span className="text-sm text-muted-foreground">
                  {subscription.renewsAutomatically
                    ? "Auto-renew on"
                    : "Manual renewal"}
                </span>
                <span className="text-sm text-muted-foreground">
                  · {subscription.daysRemaining} days remaining
                </span>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                {usage.activeCustomers ? (
                  <UsageCard
                    label="Active customers"
                    meter={usage.activeCustomers}
                  />
                ) : null}
                {usage.branches ? (
                  <UsageCard label="Branches" meter={usage.branches} />
                ) : null}
                {usage.staffSeats ? (
                  <UsageCard label="Staff seats" meter={usage.staffSeats} />
                ) : null}
                {usage.schemePlans ? (
                  <UsageCard label="Scheme plans" meter={usage.schemePlans} />
                ) : null}
                {usage.whatsappMessages ? (
                  <UsageCard
                    label="WhatsApp messages"
                    meter={usage.whatsappMessages}
                    hint={
                      usage.whatsappMessages.resetsOn
                        ? `Resets ${usage.whatsappMessages.resetsOn}`
                        : undefined
                    }
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-[#eaded9] px-6 py-4">
                <FeaturePill on={!!features.multiBranch} label="Multi-branch" />
                <FeaturePill
                  on={!!features.flexibleScheme}
                  label="Flexible schemes"
                />
                <FeaturePill
                  on={!!features.goldWeightScheme}
                  label="Gold-weight"
                />
                <FeaturePill
                  on={!!features.prematureRedemption}
                  label="Premature exit"
                />
                <FeaturePill
                  on={!!features.customerSelfEnrol}
                  label="Self-enrol"
                />
                <FeaturePill on={!!features.customApp} label="Custom app" />
                <FeaturePill
                  on={!!features.advancedReports}
                  label="Advanced reports"
                />
                <FeaturePill on={!!features.ecommerce} label="Ecommerce" />
                <FeaturePill on={!!features.digitalMetals} label="Digital metals" />
              </div>
            </Surface>

            <Surface
              title="Online store"
              description="Enable the storefront on your plan, then finish catalog and checkout setup in the Online store sidebar."
            >
              <div className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#49121f]">
                      Plan includes ecommerce
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {ecommercePlanEntitled
                        ? "Your subscription entitles this jeweller to run an online store."
                        : "Upgrade to a plan with ecommerce before you can activate the store."}
                    </p>
                  </div>
                  <StatusBadge
                    status={ecommercePlanEntitled ? "ACTIVE" : "INACTIVE"}
                  />
                </div>
                <PermissionGate permission={ACTION.tenantSettingsWrite}>
                  <SettingsToggleRow
                    id="ecommerce-store-enabled"
                    title="Show online store to customers"
                    description={
                      ecommercePlanEntitled
                        ? "When on, published products in active categories are visible. Checkout and payments still need tax, fulfilment, and plan entitlements."
                        : "Not available on your current plan — request an upgrade below."
                    }
                    checked={ecommerceStoreEnabled}
                    disabled={!ecommercePlanEntitled}
                    onCheckedChange={(checked) => void saveEcommerceEnabled(checked)}
                  />
                </PermissionGate>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Live storefront:</span>
                  <StatusBadge
                    status={ecommerceStoreActive ? "ACTIVE" : "PENDING"}
                    label={ecommerceStoreActive ? "Active" : "Not live"}
                  />
                  {ecommerceStoreEnabled && !ecommerceStoreActive ? (
                    <span className="text-muted-foreground">
                      Enabled here but blocked by plan or provisioning
                    </span>
                  ) : null}
                </div>
                {ecommercePlanEntitled ? (
                  <>
                    <EcommerceSettingsHint icon={Store} title="After you turn the store on">
                      Set up products, gold rates, tax, and fulfilment. Use the quick links below or
                      the <strong>Online store</strong> section in the sidebar.
                    </EcommerceSettingsHint>
                    <EcommerceCatalogNav />
                    <p className="text-sm text-muted-foreground">
                      Checkout readiness:{" "}
                      <EcommerceRelatedLink href="/ecommerce/tax" label="Tax settings" /> →{" "}
                      <EcommerceRelatedLink
                        href="/ecommerce/fulfilment"
                        label="Fulfilment & checkout"
                      />
                    </p>
                  </>
                ) : null}
              </div>
            </Surface>

            <Surface
              title="Digital Gold & Silver"
              description="Independent from the online store. Disabling new trading does not remove access to existing holdings or open settlement obligations."
            >
              <div className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#49121f]">Plan includes digital metals</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {digitalMetalsPlanEntitled
                        ? "Your subscription entitles this jeweller to offer digital gold and silver."
                        : "Upgrade to a plan with digital metals before you can enable the module."}
                    </p>
                  </div>
                  <StatusBadge status={digitalMetalsPlanEntitled ? "ACTIVE" : "INACTIVE"} />
                </div>
                <PermissionGate permission={ACTION.tenantSettingsWrite}>
                  <SettingsToggleRow
                    id="digital-metals-enabled"
                    title="Enable Digital Gold & Silver"
                    description={
                      digitalMetalsPlanEntitled
                        ? "When on, staff with permission can open the workspace. Live buy/sell still requires tax profile and published customer terms."
                        : "Not available on your current plan — request an upgrade below."
                    }
                    checked={digitalMetalsModuleEnabled}
                    disabled={!digitalMetalsPlanEntitled}
                    onCheckedChange={(checked) => void saveDigitalMetalsEnabled(checked)}
                  />
                </PermissionGate>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Live trading:</span>
                  <StatusBadge
                    status={digitalMetalsModuleActive ? "ACTIVE" : "PENDING"}
                    label={digitalMetalsModuleActive ? "Active" : "Not live"}
                  />
                  {digitalMetalsModuleEnabled && !digitalMetalsModuleActive ? (
                    <span className="text-muted-foreground">
                      Enabled here but blocked by tax/terms readiness or an operational pause
                    </span>
                  ) : null}
                </div>
                {digitalMetalsPlanEntitled ? (
                  <p className="text-sm text-muted-foreground">
                    Open the{" "}
                    <EcommerceRelatedLink href="/digital-metals" label="Digital metals workspace" />{" "}
                    after enablement (Phase 1 shell — no balances yet).
                  </p>
                ) : null}
              </div>
            </Surface>

            <Surface
              title="Compare plans"
              description="Plan changes are request-only in V1 — the Swarna Grow platform team approves upgrades and downgrades (not self-serve checkout)."
            >
              <div className="grid gap-4 p-6 lg:grid-cols-3">
                {plans.map((plan) => (
                  <div
                    key={plan.tier}
                    className={cn(
                      "flex flex-col rounded-2xl border p-5",
                      plan.isCurrent
                        ? "border-[#730321] bg-[#faf4f6] shadow-[0_2px_8px_rgb(115_3_33/8%)]"
                        : "border-[#eaded9] bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-extrabold">{plan.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {plan.monthlyPrice?.amountDisplay}/mo
                        </p>
                      </div>
                      {plan.isCurrent ? (
                        <StatusBadge status="ACTIVE" />
                      ) : plan.isUpgrade ? (
                        <span className="text-xs font-bold text-[#730321]">
                          Upgrade
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          Downgrade
                        </span>
                      )}
                    </div>
                    {(plan.isCurrent
                      ? plan.includes
                      : plan.gains)?.length ? (
                      <ul className="mt-4 space-y-1 text-sm text-[#3d2a2e]">
                        {(plan.isCurrent ? plan.includes : plan.gains).map(
                          (g: string) => (
                            <li key={g}>
                              {plan.isCurrent ? "•" : "+"} {g}
                            </li>
                          ),
                        )}
                      </ul>
                    ) : null}
                    {plan.losses?.length ? (
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {plan.losses.map((g: string) => (
                          <li key={g}>− {g}</li>
                        ))}
                      </ul>
                    ) : null}
                    {plan.blockedReasons?.length ? (
                      <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-950">
                        {plan.blockedReasons.map(
                          (r: { limitKey: string; message: string }) => (
                            <p key={r.limitKey} className="mb-1 last:mb-0">
                              {r.message}
                            </p>
                          ),
                        )}
                      </div>
                    ) : null}
                    <div className="mt-auto pt-5">
                      {plan.isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current plan
                        </Button>
                      ) : plan.isUpgrade ? (
                        <ActionDialog
                          trigger={
                            <Button className="w-full">Request upgrade</Button>
                          }
                          title={`Upgrade to ${plan.name}`}
                          description="Creates a request for the platform team. Plan change is not self-serve in V1."
                          actionLabel="Submit request"
                          submitDisabled={Boolean(planNoteError)}
                          onOpenChange={(open) => {
                            if (open) {
                              setPlanRequestNote("");
                              setPlanNoteTouched(false);
                            }
                          }}
                          onSubmit={async () => {
                            setPlanNoteTouched(true);
                            const noteErr =
                              validatePlanRequestNote(planRequestNote);
                            if (noteErr) {
                              toast.error(noteErr);
                              return false;
                            }
                            try {
                              await requestUpgrade({
                                targetTier: plan.tier,
                                billingCycle: "MONTHLY",
                                note: planRequestNote.trim() || undefined,
                              }).unwrap();
                              toast.success("Upgrade request submitted");
                              subscriptionQuery.refetch();
                            } catch (err) {
                              toastApiError(err, "Could not submit request");
                              return false;
                            }
                          }}
                        >
                          <div>
                            <FieldLabel>Note (optional)</FieldLabel>
                            <Textarea
                              rows={3}
                              value={planRequestNote}
                              onChange={(e) => {
                                setPlanNoteTouched(true);
                                setPlanRequestNote(e.target.value);
                              }}
                              placeholder="Need 5 showrooms before Diwali"
                              className={cn(planNoteError && "border-red-600")}
                              aria-invalid={Boolean(planNoteError)}
                            />
                            <FormFieldError message={planNoteError} />
                          </div>
                        </ActionDialog>
                      ) : plan.blockedReasons?.length ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          Downgrade blocked
                        </Button>
                      ) : (
                        <ActionDialog
                          trigger={
                            <Button variant="outline" className="w-full">
                              Request downgrade
                            </Button>
                          }
                          title={`Downgrade to ${plan.name}`}
                          description="Creates a request for the platform team. Your plan will not change until it is approved."
                          actionLabel="Submit request"
                          submitDisabled={Boolean(planNoteError)}
                          onOpenChange={(open) => {
                            if (open) {
                              setPlanRequestNote("");
                              setPlanNoteTouched(false);
                            }
                          }}
                          onSubmit={async () => {
                            setPlanNoteTouched(true);
                            const noteErr =
                              validatePlanRequestNote(planRequestNote);
                            if (noteErr) {
                              toast.error(noteErr);
                              return false;
                            }
                            try {
                              await requestUpgrade({
                                targetTier: plan.tier,
                                billingCycle: "MONTHLY",
                                note: planRequestNote.trim() || undefined,
                              }).unwrap();
                              toast.success("Downgrade request submitted");
                              subscriptionQuery.refetch();
                            } catch (err) {
                              toastApiError(err, "Could not submit request");
                              return false;
                            }
                          }}
                        >
                          <div>
                            <FieldLabel>Note (optional)</FieldLabel>
                            <Textarea
                              rows={3}
                              value={planRequestNote}
                              onChange={(e) => {
                                setPlanNoteTouched(true);
                                setPlanRequestNote(e.target.value);
                              }}
                              placeholder="Reason for moving to a lower tier"
                              className={cn(planNoteError && "border-red-600")}
                              aria-invalid={Boolean(planNoteError)}
                            />
                            <FormFieldError message={planNoteError} />
                          </div>
                        </ActionDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Surface>

            <SubscriptionInvoicesPanel
              invoices={invoices}
              isLoading={invoicesQuery.isLoading}
              isError={invoicesQuery.isError}
              onRetry={() => invoicesQuery.refetch()}
            />
          </div>
        </PageTabsPanel>
      </PageTabs>
    </>
  );
}
