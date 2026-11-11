"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Gem, ShieldCheck, UserPlus, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/src/lib/api-error";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import { EnrolValidationPanel } from "@/src/components/common/enrol-validation-panel";
import { CustomerKycSubmitForm } from "@/src/components/customer/customer-kyc-submit-form";
import { AgentCard, AgentEmpty, AgentLoadingCards, AgentPageHeader, formatAgentMoney } from "@/src/components/agent/agent-ui";
import { PortalBackLink } from "@/src/components/common/portal-back-link";
import { uploadFileViaPresign } from "@/src/lib/upload-via-presign";
import {
  useCompleteAgentUploadMutation,
  useCreateAgentCustomerMutation,
  useEnrolAgentCustomerMutation,
  useGetAgentCustomerQuery,
  useGetAgentPlansQuery,
  useLazyCheckAgentCustomerMobileQuery,
  usePresignAgentUploadMutation,
  useSubmitAgentCustomerKycMutation,
  useValidateAgentEnrolmentMutation,
} from "@/src/store/api/agent-api";
import type { AgentPlan } from "@/src/types/agent";
import { useAgentCapabilities } from "./use-agent-capabilities";

function agentEnrolActionPath(actionPath: string) {
  const match = actionPath.match(/^\/customers\/([^/?#]+)\/kyc\/?$/);
  if (match) return `/agent/customers/${match[1]}/kyc`;
  return actionPath.startsWith("/agent/") ? actionPath : `/agent${actionPath.startsWith("/") ? "" : "/"}${actionPath}`;
}

const MOBILE_PATTERN = /^[6-9]\d{9}$/;

function CapabilityDisabled({ title }: { title: string }) {
  return (
    <AgentEmpty
      title={title}
      description="Your jeweller has not enabled this for collection agents. Ask the branch to do it for you."
    />
  );
}

export function AgentNewCustomerPage() {
  const router = useRouter();
  const { registerCustomers, enrolSchemes, kycMandatory, loading } = useAgentCapabilities();
  const [createCustomer, createState] = useCreateAgentCustomerMutation();
  const [checkMobile, mobileCheck] = useLazyCheckAgentCustomerMobileQuery();
  const [form, setForm] = useState({ name: "", mobile: "", address: "", email: "", passbookNumber: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const mobileDigits = form.mobile.replace(/\D/g, "").slice(-10);
  const errors = {
    name: form.name.trim().length < 2 ? "Enter the customer's full name." : undefined,
    mobile: !MOBILE_PATTERN.test(mobileDigits) ? "Enter a valid 10-digit mobile number." : undefined,
    address: form.address.trim().length < 3 ? "Enter the customer's address." : undefined,
    email: form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim()) ? "Enter a valid email or leave it blank." : undefined,
  };
  const mobileTaken = mobileCheck.data?.exists === true && mobileCheck.originalArgs === mobileDigits;
  const hasErrors = Object.values(errors).some(Boolean) || mobileTaken;

  if (loading) return <AgentLoadingCards />;
  if (!registerCustomers) return <CapabilityDisabled title="Customer registration is turned off" />;

  const show = (field: keyof typeof errors) => (touched[field] ? errors[field] : undefined);

  const submit = async () => {
    setTouched({ name: true, mobile: true, address: true, email: true });
    if (hasErrors) return;
    try {
      const customer = await createCustomer({
        name: form.name.trim(),
        mobile: mobileDigits,
        address: form.address.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.passbookNumber.trim() ? { passbookNumber: form.passbookNumber.trim() } : {}),
      }).unwrap();
      toast.success(`${customer.name || "Customer"} registered`);
      if (kycMandatory) {
        router.replace(`/agent/customers/${customer.id}/kyc`);
      } else {
        router.replace(enrolSchemes ? `/agent/customers/${customer.id}/enrol` : `/agent/customers/${customer.id}`);
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not register this customer."));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PortalBackLink fallbackHref="/agent/collect" variant="agent">
        <ArrowLeft className="size-4" />Back
      </PortalBackLink>
      <AgentPageHeader
        eyebrow="New customer"
        title="Register a customer"
        description={
          kycMandatory
            ? "The customer is added to your branch. Next you will upload KYC documents before enrolment."
            : "The customer is added to your branch. They can sign in to the app with this mobile number."
        }
      />
      <AgentCard className="space-y-4 p-5 sm:p-6">
        <Field label="Full name" error={show("name")}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onBlur={() => setTouched({ ...touched, name: true })} className="h-12 rounded-xl" autoFocus />
        </Field>
        <Field
          label="Mobile number"
          error={show("mobile") ?? (mobileTaken ? "A customer with this mobile already exists. Search for them instead." : undefined)}
        >
          <Input
            inputMode="numeric"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/[^\d+]/g, "") })}
            onBlur={() => {
              setTouched({ ...touched, mobile: true });
              if (MOBILE_PATTERN.test(mobileDigits)) void checkMobile(mobileDigits, true);
            }}
            className="h-12 rounded-xl"
            placeholder="10-digit mobile"
          />
        </Field>
        <Field label="Address" error={show("address")}>
          <Textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} onBlur={() => setTouched({ ...touched, address: true })} className="rounded-xl" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email (optional)" error={show("email")}>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onBlur={() => setTouched({ ...touched, email: true })} className="h-12 rounded-xl" />
          </Field>
          <Field label="Passbook no. (optional)">
            <Input value={form.passbookNumber} onChange={(e) => setForm({ ...form, passbookNumber: e.target.value })} className="h-12 rounded-xl" />
          </Field>
        </div>
        <Button onClick={() => void submit()} disabled={createState.isLoading} className="h-12 w-full rounded-xl text-base font-black">
          <UserPlus className="mr-2 size-5" />
          {createState.isLoading
            ? "Registering…"
            : kycMandatory
              ? "Register and continue to KYC"
              : enrolSchemes
                ? "Register and choose scheme"
                : "Register customer"}
        </Button>
      </AgentCard>
    </div>
  );
}

export function AgentCustomerKycPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { enrolSchemes, kycMandatory, loading } = useAgentCapabilities();
  const customer = useGetAgentCustomerQuery(customerId);
  const [presignUpload] = usePresignAgentUploadMutation();
  const [completeUpload] = useCompleteAgentUploadMutation();
  const [submitKyc, submitState] = useSubmitAgentCustomerKycMutation();

  const uploadViaPresign = useCallback(
    async (file: File, purpose: string) =>
      uploadFileViaPresign(
        file,
        (input) =>
          presignUpload({
            purpose: input.purpose,
            fileName: input.fileName,
            contentType: input.contentType,
            sizeBytes: input.sizeBytes,
          }).unwrap(),
        purpose,
        (id) => completeUpload(id).unwrap(),
      ),
    [completeUpload, presignUpload],
  );

  if (loading || customer.isLoading) return <AgentLoadingCards />;
  if (!customer.data) {
    return <AgentEmpty title="Customer unavailable" description="This customer is outside your branch or could not be loaded." />;
  }

  const status = customer.data.kyc?.status ?? "NOT_SUBMITTED";
  const verified = status === "VERIFIED";
  const submitted = status === "SUBMITTED";
  const canUpload = !verified && (status === "NOT_SUBMITTED" || status === "REJECTED");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PortalBackLink fallbackHref={`/agent/customers/${customerId}`} variant="agent">
        <ArrowLeft className="size-4" />
        Back
      </PortalBackLink>
      <AgentPageHeader
        eyebrow="KYC documents"
        title={customer.data.name}
        description={
          kycMandatory
            ? "KYC is required before enrolment. Upload documents here — the branch verifies them before you can enrol."
            : "Upload identity documents for this customer."
        }
      />

      {verified ? (
        <AgentCard className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-black">KYC verified</p>
              <p className="mt-1 text-emerald-800/80">You can enrol this customer into a scheme.</p>
            </div>
          </div>
          {enrolSchemes ? (
            <Button asChild className="h-12 w-full rounded-xl font-black">
              <Link href={`/agent/customers/${customerId}/enrol`}>Continue to enrol</Link>
            </Button>
          ) : null}
        </AgentCard>
      ) : null}

      {submitted ? (
        <AgentCard className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-black">KYC submitted — waiting for branch verification</p>
              <p className="mt-1 text-amber-900/75">
                Documents are with the showroom. Enrolment stays blocked until KYC is verified.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl font-black"
            onClick={() => router.replace(`/agent/customers/${customerId}`)}
          >
            Back to customer
          </Button>
        </AgentCard>
      ) : null}

      {canUpload ? (
        <AgentCard className="p-5 sm:p-6">
          <CustomerKycSubmitForm
            submitting={submitState.isLoading}
            uploadViaPresign={uploadViaPresign}
            onSubmit={async (payload) => {
              try {
                await submitKyc({
                  customerId,
                  type: payload.type as "AADHAAR" | "PAN",
                  ...(payload.number ? { number: payload.number, numberMasked: payload.numberMasked } : {}),
                  ...(payload.frontUploadId ? { frontUploadId: payload.frontUploadId } : {}),
                  ...(payload.backUploadId ? { backUploadId: payload.backUploadId } : {}),
                }).unwrap();
                toast.success("KYC submitted for branch verification");
              } catch (error) {
                toast.error(apiErrorMessage(error, "Could not submit KYC."));
                throw error;
              }
            }}
          />
        </AgentCard>
      ) : null}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-[#6f6568]">{label}</Label>
      {children}
      {error ? <p className="text-xs font-semibold text-[#c22b26]">{error}</p> : null}
    </div>
  );
}

function planAmountChoices(plan: AgentPlan): number[] | null {
  if (plan.amountMode === "JEWELLER_FIXED" && plan.fixedAmountPaise) return [plan.fixedAmountPaise];
  if (plan.amountMode === "JEWELLER_SLABS" && plan.slabsPaise.length) return plan.slabsPaise;
  return null;
}

function defaultAmountPaise(plan: AgentPlan) {
  const choices = planAmountChoices(plan);
  if (choices) return choices[0];
  return plan.minInstallmentPaise ?? plan.fixedAmountPaise;
}

export function AgentEnrolPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { enrolSchemes, loading } = useAgentCapabilities();
  const customer = useGetAgentCustomerQuery(customerId, { skip: !enrolSchemes });
  const plans = useGetAgentPlansQuery(undefined, { skip: !enrolSchemes });

  if (loading || customer.isLoading || plans.isLoading) return <AgentLoadingCards />;
  if (!enrolSchemes) return <CapabilityDisabled title="Scheme enrolment is turned off" />;
  if (!customer.data) return <AgentEmpty title="Customer unavailable" description="This customer is outside your branch or could not be loaded." />;
  if (!plans.data?.length) return <AgentEmpty title="No plans open at your branch" description="Ask the branch to activate a scheme plan for this showroom." />;

  return (
    <EnrolForm
      key={customerId}
      customerId={customerId}
      customerName={customer.data.name}
      plans={plans.data}
      onDone={(schemeId, needsFirstPayment) => {
        router.replace(needsFirstPayment ? `/agent/collect/${schemeId}` : `/agent/customers/${customerId}`);
      }}
    />
  );
}

function EnrolForm({
  customerId,
  customerName,
  plans,
  onDone,
}: {
  customerId: string;
  customerName: string;
  plans: AgentPlan[];
  onDone: (schemeId: string, needsFirstPayment: boolean) => void;
}) {
  const [planId, setPlanId] = useState(plans[0].id);
  const plan = plans.find((row) => row.id === planId) ?? plans[0];
  const [amountByPlan, setAmountByPlan] = useState<Record<string, string>>({});
  const [modeByPlan, setModeByPlan] = useState<Record<string, "COLLECT_NOW" | "START_NEXT_CYCLE">>({});
  const [validate, validation] = useValidateAgentEnrolmentMutation();
  const [enrol, enrolState] = useEnrolAgentCustomerMutation();

  const choices = planAmountChoices(plan);
  const fallbackAmount = defaultAmountPaise(plan);
  const amountText = amountByPlan[plan.id] ?? (fallbackAmount != null ? String(fallbackAmount / 100) : "");
  const amountPaise = amountText.trim() ? Math.round(Number(amountText) * 100) : undefined;
  const firstInstallmentMode = plan.firstInstallmentModeEditable
    ? modeByPlan[plan.id] ?? plan.firstInstallmentModeDefault
    : plan.firstInstallmentModeDefault;

  const request = useMemo(
    () => ({
      customerId,
      planId: plan.id,
      firstInstallmentMode,
      ...(amountPaise && Number.isSafeInteger(amountPaise) && amountPaise > 0 ? { installmentAmountPaise: amountPaise } : {}),
    }),
    [customerId, plan.id, firstInstallmentMode, amountPaise],
  );
  const debouncedRequest = useDebouncedValue(request, 350);

  useEffect(() => {
    void validate(debouncedRequest);
  }, [debouncedRequest, validate]);

  const preview = validation.originalArgs === request ? validation.data : undefined;
  const blocked = Boolean(preview?.blockers?.length) || !preview;

  const submit = async () => {
    try {
      const scheme = await enrol(request).unwrap();
      const needsFirstPayment = firstInstallmentMode === "COLLECT_NOW" || scheme.status === "PENDING_PAYMENT";
      toast.success(needsFirstPayment ? "Enrolled. Collect the first installment now." : "Enrolled successfully");
      onDone(scheme.id, needsFirstPayment);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not enrol this customer."));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PortalBackLink fallbackHref={`/agent/customers/${customerId}`} variant="agent">
        <ArrowLeft className="size-4" />Back
      </PortalBackLink>
      <AgentPageHeader eyebrow="Enrol in scheme" title={customerName} description="Plans open at your branch. The enrolment is checked again before it is created." />
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <AgentCard className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-[#6f6568]">Plan</Label>
            <div className="grid gap-2">
              {plans.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setPlanId(row.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                    row.id === plan.id ? "border-[#730321] bg-[#fbf1f3]" : "border-[#eaded7] bg-white hover:border-[#d7bb7b]",
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff3d7] text-[#9a690b]">
                    {row.valueBasis === "GOLD_WEIGHT" ? <Gem className="size-5" /> : <WalletCards className="size-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black">{row.name}</span>
                    <span className="block text-xs text-[#81777a]">
                      {row.durationMonths} months · {row.valueBasis === "GOLD_WEIGHT" ? "Gold weight" : "Cash"} · {row.paymentPattern === "FLEXIBLE" ? "Flexible" : "Fixed"}
                    </span>
                  </span>
                  {row.id === plan.id ? <CheckCircle2 className="size-5 text-[#730321]" /> : null}
                </button>
              ))}
            </div>
          </div>

          {choices && choices.length > 1 ? (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#6f6568]">Monthly installment</Label>
              <Select value={amountText} onValueChange={(value) => setAmountByPlan({ ...amountByPlan, [plan.id]: value })}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {choices.map((paise) => (
                    <SelectItem key={paise} value={String(paise / 100)}>{formatAgentMoney(paise)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : choices ? (
            <p className="rounded-xl bg-[#faf6f3] px-4 py-3 text-sm">
              Installment <span className="font-black">{formatAgentMoney(choices[0])}</span>
            </p>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#6f6568]">
                {plan.paymentPattern === "FLEXIBLE" ? "Reference amount (₹)" : "Monthly installment (₹)"}
              </Label>
              <Input
                inputMode="numeric"
                value={amountText}
                onChange={(e) => setAmountByPlan({ ...amountByPlan, [plan.id]: e.target.value.replace(/[^\d.]/g, "") })}
                className="h-12 rounded-xl"
              />
              {plan.minInstallmentPaise || plan.maxInstallmentPaise ? (
                <p className="text-xs text-[#81777a]">
                  {plan.minInstallmentPaise ? `Min ${formatAgentMoney(plan.minInstallmentPaise)}` : ""}
                  {plan.minInstallmentPaise && plan.maxInstallmentPaise ? " · " : ""}
                  {plan.maxInstallmentPaise ? `Max ${formatAgentMoney(plan.maxInstallmentPaise)}` : ""}
                  {plan.multipleOfPaise ? ` · multiples of ${formatAgentMoney(plan.multipleOfPaise)}` : ""}
                </p>
              ) : null}
            </div>
          )}

          {plan.firstInstallmentModeEditable ? (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#6f6568]">First installment</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["COLLECT_NOW", "Collect now"],
                    ["START_NEXT_CYCLE", "Start next month"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setModeByPlan({ ...modeByPlan, [plan.id]: value })}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-bold",
                      firstInstallmentMode === value ? "border-[#730321] bg-[#fbf1f3] text-[#730321]" : "border-[#eaded7] text-[#6f6568]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#81777a]">
              {firstInstallmentMode === "COLLECT_NOW"
                ? "This plan collects the first installment at enrolment."
                : "The first installment is due next month."}
            </p>
          )}
        </AgentCard>

        <div className="space-y-4">
          <EnrolValidationPanel
            validation={preview}
            loading={!preview && validation.isLoading}
            resolveActionPath={agentEnrolActionPath}
          />
          <Button onClick={() => void submit()} disabled={blocked || enrolState.isLoading} className="h-12 w-full rounded-xl text-base font-black">
            {enrolState.isLoading ? "Enrolling…" : firstInstallmentMode === "COLLECT_NOW" ? "Enrol and collect first installment" : "Enrol customer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
