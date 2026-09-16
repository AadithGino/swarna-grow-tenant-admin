"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";
import { env } from "@/src/config/env";
import { SubscriptionInvoicesPanel } from "@/src/features/settings/subscription-invoices-panel";
import {
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
    customerSelfEnrolEnabled: true,
    customerSelfRegistrationEnabled: true,
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

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
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
  }, [profileQuery.data]);

  useEffect(() => {
    const b = brandingQuery.data;
    if (!b) return;
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
  }, [brandingQuery.data]);

  useEffect(() => {
    const o = operationsQuery.data;
    if (!o) return;
    setOpsForm({
      multiSchemePerCustomer: Boolean(o.multiSchemePerCustomer),
      kycMandatory: Boolean(o.kycMandatory),
      customerSelfEnrolEnabled: Boolean(o.customerSelfEnrolEnabled),
      customerSelfRegistrationEnabled: Boolean(
        o.customerSelfRegistrationEnabled,
      ),
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
  }, [operationsQuery.data]);

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
      />
    );
  }

  const profile = profileQuery.data;
  const subscription = subscriptionQuery.data;
  const usage = subscription.usage ?? {};
  const features = subscription.features ?? {};
  const plans = plansQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const pendingPlanChange = subscription.pendingUpgradeRequest as
    | {
        targetTier?: string;
        status?: string;
        note?: string | null;
      }
    | undefined;

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
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      businessName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Display name</FieldLabel>
                <Input
                  value={profileForm.displayName}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      displayName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Owner name</FieldLabel>
                <Input
                  value={profileForm.ownerName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, ownerName: e.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Tenant code</FieldLabel>
                <Input value={String(profile.tenantCode ?? "")} disabled />
              </div>
              <div>
                <FieldLabel>Owner mobile</FieldLabel>
                <Input
                  value={profileForm.ownerMobile}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      ownerMobile: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Owner email</FieldLabel>
                <Input
                  value={profileForm.ownerEmail}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      ownerEmail: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Support number</FieldLabel>
                <Input
                  value={profileForm.supportNumber}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      supportNumber: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>GSTIN (optional)</FieldLabel>
                <Input
                  value={profileForm.gstin}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, gstin: e.target.value })
                  }
                  placeholder="Printed on receipts only"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Address line</FieldLabel>
                <Input
                  value={profileForm.line1}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, line1: e.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>City</FieldLabel>
                <Input
                  value={profileForm.city}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, city: e.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>State</FieldLabel>
                <Input
                  value={profileForm.state}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, state: e.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Pincode</FieldLabel>
                <Input
                  value={profileForm.pincode}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, pincode: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-[#eaded9] px-6 py-4">
              <PermissionGate permission={ACTION.tenantSettingsWrite}>
                <Button
                  onClick={async () => {
                    await patchProfile({
                      businessName: profileForm.businessName,
                      displayName: profileForm.displayName,
                      ownerName: profileForm.ownerName,
                      ownerMobile: profileForm.ownerMobile,
                      ownerEmail: profileForm.ownerEmail,
                      supportNumber: profileForm.supportNumber,
                      gstin: profileForm.gstin || null,
                      address: {
                        line1: profileForm.line1,
                        city: profileForm.city,
                        state: profileForm.state,
                        pincode: profileForm.pincode,
                      },
                      expectedVersion: profile.audit?.version,
                    }).unwrap();
                    toast.success("Business profile saved");
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
                      onChange={(e) =>
                        setBrandingForm({
                          ...brandingForm,
                          appDisplayName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Primary colour</FieldLabel>
                      <div className="flex gap-3">
                        <Input
                          type="color"
                          value={brandingForm.primaryColor}
                          onChange={(e) =>
                            setBrandingForm({
                              ...brandingForm,
                              primaryColor: e.target.value,
                            })
                          }
                          className="h-11 w-16 p-1"
                        />
                        <Input
                          value={brandingForm.primaryColor}
                          onChange={(e) =>
                            setBrandingForm({
                              ...brandingForm,
                              primaryColor: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Secondary colour</FieldLabel>
                      <div className="flex gap-3">
                        <Input
                          type="color"
                          value={brandingForm.secondaryColor}
                          onChange={(e) =>
                            setBrandingForm({
                              ...brandingForm,
                              secondaryColor: e.target.value,
                            })
                          }
                          className="h-11 w-16 p-1"
                        />
                        <Input
                          value={brandingForm.secondaryColor}
                          onChange={(e) =>
                            setBrandingForm({
                              ...brandingForm,
                              secondaryColor: e.target.value,
                            })
                          }
                        />
                      </div>
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
                          const res = await patchBranding({
                            logoUploadId: presign.uploadId,
                            expectedVersion:
                              brandingQuery.data?.audit?.version,
                          }).unwrap();
                          if (res?.previewUrls) setPreviewUrls(res.previewUrls);
                          toast.success("Logo uploaded");
                        } catch {
                          toast.error("Could not upload logo");
                        } finally {
                          setLogoBusy(false);
                        }
                      }}
                    />
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
                      onClick={async () => {
                        const res = await patchBranding({
                          primaryColor: brandingForm.primaryColor,
                          secondaryColor: brandingForm.secondaryColor,
                          appDisplayName: brandingForm.appDisplayName,
                          expectedVersion:
                            brandingQuery.data?.audit?.version,
                        }).unwrap();
                        if (res?.previewUrls) setPreviewUrls(res.previewUrls);
                        toast.success("Branding saved — previews refreshed");
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
          <Surface
            title="Operational rules"
            description="Enforced on enrolment, payments, receipts and redemptions"
          >
            <div className="divide-y divide-[#eaded9]">
              {(
                [
                  [
                    "multiSchemePerCustomer",
                    "Allow multiple schemes per customer",
                    "When off, enrolment fails with ONE_SCHEME_POLICY",
                  ],
                  [
                    "kycMandatory",
                    "Require KYC before enrolment",
                    "Blocks enrol until KYC is submitted or verified",
                  ],
                  [
                    "customerSelfEnrolEnabled",
                    "Customer self-enrol",
                    "Lets the app enrol into published plans",
                  ],
                  [
                    "customerSelfRegistrationEnabled",
                    "Customer self-registration",
                    "Public signup into this tenant",
                  ],
                  [
                    "redemptionApprovalRequired",
                    "Redemption approval required",
                    "When off, branch manager can complete without admin",
                  ],
                ] as const
              ).map(([key, title, detail]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-5 p-5"
                >
                  <div>
                    <strong>{title}</strong>
                    <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                  </div>
                  <Switch
                    checked={Boolean(opsForm[key])}
                    onCheckedChange={(v) =>
                      setOpsForm({ ...opsForm, [key]: v === true })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-5 border-t border-[#eaded9] p-6 md:grid-cols-2">
              <div>
                <FieldLabel>Receipt prefix</FieldLabel>
                <Input
                  value={opsForm.receiptPrefix}
                  onChange={(e) =>
                    setOpsForm({ ...opsForm, receiptPrefix: e.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Gold purity</FieldLabel>
                <Input
                  value={opsForm.goldPurity}
                  onChange={(e) =>
                    setOpsForm({ ...opsForm, goldPurity: e.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Receipt number format</FieldLabel>
                <Input
                  value={opsForm.receiptNumberFormat}
                  onChange={(e) =>
                    setOpsForm({
                      ...opsForm,
                      receiptNumberFormat: e.target.value,
                    })
                  }
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <FieldLabel>Passbook number format</FieldLabel>
                <Input
                  value={opsForm.passbookNumberFormat}
                  onChange={(e) =>
                    setOpsForm({
                      ...opsForm,
                      passbookNumberFormat: e.target.value,
                    })
                  }
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <FieldLabel>Scheme number format</FieldLabel>
                <Input
                  value={opsForm.schemeNumberFormat}
                  onChange={(e) =>
                    setOpsForm({
                      ...opsForm,
                      schemeNumberFormat: e.target.value,
                    })
                  }
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <FieldLabel>Payment reversal window (hours)</FieldLabel>
                <Input
                  type="number"
                  value={opsForm.paymentReversalWindowHours}
                  onChange={(e) =>
                    setOpsForm({
                      ...opsForm,
                      paymentReversalWindowHours: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Weight rounding mode</FieldLabel>
                <Input
                  value={opsForm.weightRoundingMode}
                  onChange={(e) =>
                    setOpsForm({
                      ...opsForm,
                      weightRoundingMode: e.target.value,
                    })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Terms & conditions</FieldLabel>
                <Textarea
                  rows={4}
                  value={opsForm.termsAndConditions}
                  onChange={(e) =>
                    setOpsForm({
                      ...opsForm,
                      termsAndConditions: e.target.value,
                    })
                  }
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Sequence formats lock after the first document of that type is
                  issued (SEQUENCE_FORMAT_LOCKED).
                </p>
              </div>
            </div>
            <div className="flex justify-end border-t border-[#eaded9] px-6 py-4">
              <PermissionGate permission={ACTION.tenantSettingsWrite}>
                <Button
                  onClick={async () => {
                    await patchOperations({
                      ...opsForm,
                      kycAllowedTypes:
                        operationsQuery.data?.kycAllowedTypes ?? [
                          "AADHAAR",
                          "PAN",
                        ],
                      expectedVersion: operationsQuery.data?.audit?.version,
                    }).unwrap();
                    toast.success("Operations saved");
                  }}
                >
                  <Save />
                  Save operations
                </Button>
              </PermissionGate>
            </div>
          </Surface>
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
                          onOpenChange={(open) => {
                            if (open) setPlanRequestNote("");
                          }}
                          onSubmit={async () => {
                            await requestUpgrade({
                              targetTier: plan.tier,
                              billingCycle: "MONTHLY",
                              note: planRequestNote || undefined,
                            }).unwrap();
                            toast.success("Upgrade request submitted");
                            subscriptionQuery.refetch();
                          }}
                        >
                          <div>
                            <FieldLabel>Note (optional)</FieldLabel>
                            <Textarea
                              rows={3}
                              value={planRequestNote}
                              onChange={(e) =>
                                setPlanRequestNote(e.target.value)
                              }
                              placeholder="Need 5 showrooms before Diwali"
                            />
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
                          onOpenChange={(open) => {
                            if (open) setPlanRequestNote("");
                          }}
                          onSubmit={async () => {
                            await requestUpgrade({
                              targetTier: plan.tier,
                              billingCycle: "MONTHLY",
                              note: planRequestNote || undefined,
                            }).unwrap();
                            toast.success("Downgrade request submitted");
                            subscriptionQuery.refetch();
                          }}
                        >
                          <div>
                            <FieldLabel>Note (optional)</FieldLabel>
                            <Textarea
                              rows={3}
                              value={planRequestNote}
                              onChange={(e) =>
                                setPlanRequestNote(e.target.value)
                              }
                              placeholder="Reason for moving to a lower tier"
                            />
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
