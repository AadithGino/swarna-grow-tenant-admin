"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ClipboardCopy,
  CreditCard,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FieldLabel,
  PageHeader,
  Surface,
} from "@/src/components/common/page-parts";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { handleFormApiError } from "@/src/lib/form-api-error";
import { sanitizeIndianPhoneDigits } from "@/src/lib/customer-form";
import {
  livePlatformTenantFieldErrors,
  ownerMobileForPlatformApi,
  platformTenantCreateFormReady,
  platformTenantCreateStepReady,
  supportNumberForPlatformApi,
  validatePlatformTenantCreateForm,
  validatePlatformTenantCreateStep,
  type PlatformTenantCreateForm,
} from "@/src/lib/platform-tenant-create-form-validation";
import {
  useCreatePlatformTenantMutation,
  useGetPlatformPlansQuery,
} from "@/src/store/api/platform-api";

const steps = [
  { label: "Business", icon: Building2 },
  { label: "Owner", icon: UserRound },
  { label: "Plan", icon: CreditCard },
  { label: "Review", icon: Check },
] as const;

const initialForm = (): PlatformTenantCreateForm => ({
  businessName: "",
  displayName: "",
  city: "",
  address: "",
  supportNumber: "",
  ownerName: "",
  ownerMobile: "",
  ownerEmail: "",
  subscriptionPlanId: "splan_growth",
  billingCycle: "MONTHLY",
  trialDays: 14,
  skipPayment: true,
  createDefaultBranch: true,
  defaultBranchName: "Main Showroom",
  sendWelcomeMessage: true,
});

function mergeFieldMessage(
  apiOrSubmit: string | undefined,
  live: string | undefined,
): string | undefined {
  return apiOrSubmit ?? live;
}

export function PlatformTenantCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const plans = useGetPlatformPlansQuery();
  const [create, result] = useCreatePlatformTenantMutation();
  const [created, setCreated] = useState<{
    tenant: { id: string; businessName: string; tenantCode: string };
    ownerUser: { mobile: string; temporaryPassword: string };
  } | null>(null);
  const [form, setForm] = useState<PlatformTenantCreateForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof PlatformTenantCreateForm, boolean>>
  >({});

  const set = <K extends keyof PlatformTenantCreateForm>(
    key: K,
    value: PlatformTenantCreateForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const liveErrors = useMemo(
    () => livePlatformTenantFieldErrors(form, touched),
    [form, touched],
  );

  const displayError = (field: keyof PlatformTenantCreateForm) =>
    mergeFieldMessage(fieldErrors[field as string], liveErrors[field as string]);

  const stepFieldKeys: (keyof PlatformTenantCreateForm)[][] = [
    ["businessName", "displayName", "city", "supportNumber", "address"],
    ["ownerName", "ownerMobile", "ownerEmail"],
    ["subscriptionPlanId", "billingCycle", "trialDays"],
    [],
  ];

  const markStepTouched = (stepIndex: number) => {
    const keys = stepFieldKeys[stepIndex] ?? [];
    setTouched((prev) => {
      const next = { ...prev };
      for (const key of keys) next[key] = true;
      return next;
    });
  };

  const goNext = () => {
    markStepTouched(step);
    const stepErrors = validatePlatformTenantCreateStep(step, form);
    if (Object.keys(stepErrors).length) {
      setFieldErrors((prev) => ({ ...prev, ...stepErrors }));
      toast.error("Fix the highlighted fields.");
      return;
    }
    setStep((v) => v + 1);
  };

  const submit = async () => {
    markStepTouched(0);
    markStepTouched(1);
    markStepTouched(2);
    const clientErrors = validatePlatformTenantCreateForm(form);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      toast.error("Fix the highlighted fields.");
      return;
    }
    try {
      const payload = {
        ...form,
        businessName: form.businessName.trim(),
        displayName: form.displayName.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        supportNumber: supportNumberForPlatformApi(form.supportNumber),
        ownerName: form.ownerName.trim(),
        ownerMobile: ownerMobileForPlatformApi(form.ownerMobile),
        ownerEmail: form.ownerEmail.trim(),
      };
      setCreated(await create(payload).unwrap());
      toast.success("Jeweller workspace created");
    } catch (error) {
      handleFormApiError(error, {
        setFieldErrors,
        fallback: "Unable to create jeweller",
      });
    }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-3xl">
        <Surface>
          <div className="p-8 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <Check className="size-8" />
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#9a6f2a]">
              Workspace created
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">
              {created.tenant.businessName}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Tenant code: <strong>{created.tenant.tenantCode}</strong>
            </p>
            <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left">
              <p className="font-semibold">One-time owner credentials</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Mobile</p>
                  <p className="font-mono font-semibold">
                    {created.ownerUser.mobile}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Temporary password
                  </p>
                  <p className="font-mono font-semibold">
                    {created.ownerUser.temporaryPassword}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${created.ownerUser.mobile}\n${created.ownerUser.temporaryPassword}`,
                  );
                  toast.success("Credentials copied");
                }}
              >
                <ClipboardCopy />
                Copy credentials
              </Button>
            </div>
            <p className="mt-4 text-sm text-red-700">
              Save these credentials now. The password is shown only once.
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/platform/tenants")}
              >
                Back to directory
              </Button>
              <Button
                onClick={() =>
                  router.push(`/platform/tenants/${created.tenant.id}`)
                }
              >
                Open setup workspace <ArrowRight />
              </Button>
            </div>
          </div>
        </Surface>
      </div>
    );
  }

  const continueDisabled = !platformTenantCreateStepReady(step, form);
  const createDisabled =
    result.isLoading || !platformTenantCreateFormReady(form);

  return (
    <>
      <PageHeader
        eyebrow="Guided onboarding"
        title="Add jeweller"
        description="Create the tenant, owner and default subscription. Integration credentials are configured after creation."
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft />
            Cancel
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <Surface className="h-fit">
          <div className="p-4">
            {steps.map(({ label, icon: Icon }, i) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                  i === step
                    ? "bg-[#f7e9c9] text-[#730321]"
                    : i < step
                      ? "text-emerald-700"
                      : "text-muted-foreground"
                }`}
              >
                <span
                  className={`grid size-8 place-items-center rounded-full border ${
                    i <= step ? "border-current bg-white" : ""
                  }`}
                >
                  {i < step ? (
                    <Check className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <span className="font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </Surface>
        <Surface
          title={steps[step].label}
          description={
            step === 3
              ? "Confirm the workspace details before creation."
              : "Complete all required fields."
          }
        >
          <div className="p-6">
            {step === 0 && (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel>Legal business name *</FieldLabel>
                  <Input
                    value={form.businessName}
                    onChange={(e) => {
                      setTouched((p) => ({ ...p, businessName: true }));
                      set("businessName", e.target.value);
                    }}
                    placeholder="Sree Gold Jewellery"
                    className={cn(
                      displayError("businessName") && "border-red-600",
                    )}
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
                      set("displayName", e.target.value);
                    }}
                    placeholder="Sree Gold"
                    className={cn(
                      displayError("displayName") && "border-red-600",
                    )}
                    aria-invalid={Boolean(displayError("displayName"))}
                  />
                  <FormFieldError message={displayError("displayName")} />
                </div>
                <div>
                  <FieldLabel>City *</FieldLabel>
                  <Input
                    value={form.city}
                    onChange={(e) => {
                      setTouched((p) => ({ ...p, city: true }));
                      set("city", e.target.value);
                    }}
                    placeholder="Kochi"
                    className={cn(displayError("city") && "border-red-600")}
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
                      set(
                        "supportNumber",
                        sanitizeIndianPhoneDigits(e.target.value),
                      );
                    }}
                    placeholder="9846543211"
                    className={cn(
                      displayError("supportNumber") && "border-red-600",
                    )}
                    aria-invalid={Boolean(displayError("supportNumber"))}
                  />
                  <FormFieldError message={displayError("supportNumber")} />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Business address</FieldLabel>
                  <Input
                    value={form.address}
                    onChange={(e) => {
                      setTouched((p) => ({ ...p, address: true }));
                      set("address", e.target.value);
                    }}
                    placeholder="42 MG Road, Kochi 682011"
                    className={cn(displayError("address") && "border-red-600")}
                    aria-invalid={Boolean(displayError("address"))}
                  />
                  <FormFieldError message={displayError("address")} />
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel>Owner name *</FieldLabel>
                  <Input
                    value={form.ownerName}
                    onChange={(e) => {
                      setTouched((p) => ({ ...p, ownerName: true }));
                      set("ownerName", e.target.value);
                    }}
                    placeholder="Mahesh Kumar"
                    className={cn(
                      displayError("ownerName") && "border-red-600",
                    )}
                    aria-invalid={Boolean(displayError("ownerName"))}
                  />
                  <FormFieldError message={displayError("ownerName")} />
                </div>
                <div>
                  <FieldLabel>Owner mobile *</FieldLabel>
                  <Input
                    inputMode="tel"
                    value={form.ownerMobile}
                    onChange={(e) => {
                      setTouched((p) => ({ ...p, ownerMobile: true }));
                      set(
                        "ownerMobile",
                        sanitizeIndianPhoneDigits(e.target.value),
                      );
                    }}
                    placeholder="9846543210"
                    className={cn(
                      displayError("ownerMobile") && "border-red-600",
                    )}
                    aria-invalid={Boolean(displayError("ownerMobile"))}
                  />
                  <FormFieldError message={displayError("ownerMobile")} />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Owner email *</FieldLabel>
                  <Input
                    type="email"
                    value={form.ownerEmail}
                    onChange={(e) => {
                      setTouched((p) => ({ ...p, ownerEmail: true }));
                      set("ownerEmail", e.target.value);
                    }}
                    placeholder="mahesh@example.com"
                    className={cn(
                      displayError("ownerEmail") && "border-red-600",
                    )}
                    aria-invalid={Boolean(displayError("ownerEmail"))}
                  />
                  <FormFieldError message={displayError("ownerEmail")} />
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {(plans.data ?? [])
                    .filter((p) => p.status === "ACTIVE")
                    .map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setTouched((p) => ({
                            ...p,
                            subscriptionPlanId: true,
                          }));
                          set("subscriptionPlanId", plan.id);
                        }}
                        className={`rounded-2xl border p-5 text-left transition ${
                          form.subscriptionPlanId === plan.id
                            ? "border-[#730321] bg-[#fff8e9] ring-2 ring-[#730321]/15"
                            : "hover:border-[#c9a4ad]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-lg font-bold">
                              {plan.displayName}
                            </p>
                            <p className="mt-1 text-2xl font-extrabold">
                              {plan.monthlyPrice.amountDisplay}
                              <span className="text-sm font-normal text-muted-foreground">
                                {" "}
                                / month
                              </span>
                            </p>
                          </div>
                          {form.subscriptionPlanId === plan.id && (
                            <Check className="text-[#730321]" />
                          )}
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {plan.limits.activeCustomers?.toLocaleString("en-IN") ??
                            "Unlimited"}{" "}
                          customers · {plan.limits.branches ?? "Unlimited"}{" "}
                          branches
                        </p>
                      </button>
                    ))}
                </div>
                <FormFieldError message={displayError("subscriptionPlanId")} />
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel>Billing cycle</FieldLabel>
                    <Select
                      value={form.billingCycle}
                      onValueChange={(v) => set("billingCycle", v)}
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
                  <div>
                    <FieldLabel>Trial days</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      max={90}
                      step={1}
                      value={form.trialDays}
                      onChange={(e) => {
                        setTouched((p) => ({ ...p, trialDays: true }));
                        set("trialDays", Number(e.target.value));
                      }}
                      className={cn(
                        displayError("trialDays") && "border-red-600",
                      )}
                      aria-invalid={Boolean(displayError("trialDays"))}
                    />
                    <FormFieldError message={displayError("trialDays")} />
                  </div>
                </div>
                <label className="flex items-center gap-3 rounded-xl border p-4">
                  <Checkbox
                    checked={form.skipPayment}
                    onCheckedChange={(v) => set("skipPayment", Boolean(v))}
                  />
                  <span>
                    <strong>Skip initial payment</strong>
                    <span className="block text-sm text-muted-foreground">
                      Activate the trial without collecting subscription payment
                      now.
                    </span>
                  </span>
                </label>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-5">
                <div className="grid gap-4 rounded-2xl bg-[#fbf7f4] p-5 md:grid-cols-2">
                  <Review label="Business" value={form.businessName} />
                  <Review label="Display name" value={form.displayName} />
                  <Review label="Owner" value={form.ownerName} />
                  <Review label="Login mobile" value={form.ownerMobile} />
                  <Review
                    label="Plan"
                    value={`${plans.data?.find((p) => p.id === form.subscriptionPlanId)?.displayName ?? "—"} · ${form.billingCycle}`}
                  />
                  <Review label="Trial" value={`${form.trialDays} days`} />
                </div>
                <label className="flex items-center gap-3">
                  <Checkbox
                    checked={form.sendWelcomeMessage}
                    onCheckedChange={(v) =>
                      set("sendWelcomeMessage", Boolean(v))
                    }
                  />
                  <span>Queue welcome message for the owner</span>
                </label>
                <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  A tenant code and temporary password are generated by the
                  server. You will see the password once after creation.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-between border-t bg-[#faf7f5] px-6 py-4">
            <Button
              variant="outline"
              disabled={step === 0 || result.isLoading}
              onClick={() => setStep((v) => v - 1)}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button disabled={continueDisabled} onClick={goNext}>
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button disabled={createDisabled} onClick={submit}>
                {result.isLoading ? "Creating…" : "Create jeweller"}
              </Button>
            )}
          </div>
        </Surface>
      </div>
    </>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-semibold">{value || "—"}</p>
    </div>
  );
}
