"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Gem, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerKycSubmitForm } from "@/src/components/customer/customer-kyc-submit-form";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerKycEnabled } from "@/src/lib/customer-kyc-enabled";
import { useCompleteCustomerProfileMutation, useSubmitCustomerKycMutation } from "@/src/store/api/customer-api";
import { customerProfileCompleted } from "@/src/store/slices/customer-session-slice";
import { useAppDispatch } from "@/src/store/hooks";
import { toast } from "sonner";

type Step = "profile" | "kyc" | "done";

export function CustomerOnboardingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tenantSlug, tenant } = useCustomerTenant();
  const kycEnabled = useCustomerKycEnabled();
  const [step, setStep] = useState<Step>("profile");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [completeProfile, completeState] = useCompleteCustomerProfileMutation();
  const [submitKyc, kycState] = useSubmitCustomerKycMutation();

  const jewellerName = tenant?.displayName ?? tenant?.appDisplayName ?? "your jeweller";
  const finish = () => {
    router.replace(customerPath(tenantSlug));
  };

  const saveProfile = async () => {
    if (name.trim().length < 2) return toast.error("Enter your full name");
    try {
      await completeProfile({
        name: name.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(dateOfBirth ? { dateOfBirth } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
      }).unwrap();
      dispatch(customerProfileCompleted());
      toast.success("Profile saved");
      if (kycEnabled) {
        setStep("kyc");
      } else {
        finish();
      }
    } catch {
      toast.error("Could not save profile");
    }
  };

  const onKycSubmit = async (payload: Parameters<Parameters<typeof CustomerKycSubmitForm>[0]["onSubmit"]>[0]) => {
    try {
      await submitKyc(payload).unwrap();
      toast.success("Documents submitted for review");
      setStep("done");
    } catch {
      toast.error("Could not submit documents");
    }
  };

  return (
    <div className="customer-theme min-h-screen bg-[#fbf8f4] px-5 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#730321] text-white">
            <Gem className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold tracking-[.14em] text-[#9a6f2a]">NEW CUSTOMER</p>
            <h1 className="text-xl font-black">Set up your account</h1>
          </div>
        </div>
        {kycEnabled ? (
          <div className="mb-6 flex gap-2 text-[10px] font-bold uppercase tracking-wide">
            <span className={step === "profile" ? "text-[#730321]" : "text-muted-foreground"}>1 · Profile</span>
            <span className="text-muted-foreground">/</span>
            <span className={step === "kyc" ? "text-[#730321]" : "text-muted-foreground"}>2 · Identity</span>
            <span className="text-muted-foreground">/</span>
            <span className={step === "done" ? "text-[#730321]" : "text-muted-foreground"}>3 · Done</span>
          </div>
        ) : (
          <div className="mb-6 text-[10px] font-bold uppercase tracking-wide text-[#730321]">1 · Profile</div>
        )}
        <section className="rounded-[1.6rem] border bg-white p-6 shadow-sm sm:p-8">
          {step === "profile" ? (
            <>
              <h2 className="text-lg font-black">Tell us about you</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This information is shared with {jewellerName} for your passbook and scheme records.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="name">Full name *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-2" />
                </div>
              </div>
              <Button
                onClick={saveProfile}
                disabled={completeState.isLoading}
                className="mt-6 h-12 w-full rounded-xl bg-[#730321] font-bold"
              >
                {completeState.isLoading ? <LoaderCircle className="animate-spin" /> : kycEnabled ? "Continue" : "Finish setup"}
              </Button>
            </>
          ) : null}
          {kycEnabled && step === "kyc" ? (
            <>
              <div className="flex items-start gap-3 rounded-2xl bg-[#fff8e7] p-4 text-sm">
                <ShieldCheck className="size-5 shrink-0 text-[#8b6517]" />
                <p>
                  Upload identity documents for {jewellerName} to verify. This step is required before you can enrol in
                  schemes.
                </p>
              </div>
              <div className="mt-6">
                <CustomerKycSubmitForm onSubmit={onKycSubmit} submitting={kycState.isLoading} />
              </div>
            </>
          ) : null}
          {kycEnabled && step === "done" ? (
            <div className="text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-8" />
              </span>
              <h2 className="mt-5 text-xl font-black">You&apos;re all set</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your documents are with {jewellerName} for review. You can explore plans once verification is complete.
              </p>
              <Button onClick={finish} className="mt-6 h-12 w-full rounded-xl bg-[#730321] font-bold">
                Go to home
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
