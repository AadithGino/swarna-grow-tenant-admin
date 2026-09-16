"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Gem, LoaderCircle, LockKeyhole, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestCustomerOtpMutation, useVerifyCustomerOtpMutation } from "@/src/store/api/customer-api";
import { customerSignedIn } from "@/src/store/slices/customer-session-slice";
import { useAppDispatch } from "@/src/store/hooks";
import { toast } from "sonner";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerPortalCapabilitiesFromTenant } from "@/src/lib/customer-portal-capabilities";

type Step = "mobile" | "otp";
type AuthMode = "login" | "signup";

export function CustomerLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tenantCode, tenantSlug, tenant, loading, notFound } = useCustomerTenant();
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("9847012345");
  const [otp, setOtp] = useState("123456");
  const [otpId, setOtpId] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [requestOtp, requestState] = useRequestCustomerOtpMutation();
  const [verifyOtp, verifyState] = useVerifyCustomerOtpMutation();
  const portalCaps = customerPortalCapabilitiesFromTenant(tenant);
  const registrationEnabled = portalCaps.customerSelfRegistration;
  const kycPortalEnabled = portalCaps.kycMandatory;

  useEffect(() => {
    if (!registrationEnabled && mode === "signup") {
      setMode("login");
      setStep("mobile");
      setOtpId("");
      setOtp("");
    }
  }, [registrationEnabled, mode]);

  useEffect(() => {
    if (!seconds) return;
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  const purpose = mode === "signup" ? "SIGNUP" : "LOGIN";

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setStep("mobile");
    setOtpId("");
    setOtp("");
    setSeconds(0);
  };

  const sendOtp = async () => {
    if (!tenantCode) return toast.error("Open your jeweller’s customer link (e.g. /customer/your-code/login).");
    if (!/^\d{10}$/.test(mobile)) return toast.error("Enter a valid 10-digit mobile number");
    try {
      const result = await requestOtp({
        tenantCode,
        mobile: `+91${mobile}`,
        purpose,
        deviceId: "customer-web",
      }).unwrap();
      setOtpId(result.otpId);
      setStep("otp");
      setSeconds(30);
      if (mode === "signup" && (result as { isRegistered?: boolean }).isRegistered) {
        toast.message("This number is already registered — we’ll sign you in after OTP.");
      } else {
        toast.success("OTP sent securely");
      }
    } catch (err: unknown) {
      const code = (err as { data?: { code?: string } })?.data?.code;
      if (code === "SELF_REGISTRATION_DISABLED") {
        toast.error("Online registration is not available. Contact your branch or sign in.");
        switchMode("login");
      } else if (code === "CUSTOMER_NOT_REGISTERED" && mode === "login") {
        if (registrationEnabled) {
          toast.error("No account on this number. Create an account instead.");
          switchMode("signup");
        } else {
          toast.error("No account found for this number. Contact your branch to register.");
        }
      } else {
        toast.error("We couldn’t send the OTP. Please try again.");
      }
    }
  };

  const verify = async () => {
    if (otp.length !== 6) return toast.error("Enter the 6-digit OTP");
    if (!otpId) return toast.error("Request a new OTP for this step, then try again.");
    try {
      const result = await verifyOtp({
        tenantCode,
        mobile: `+91${mobile}`,
        purpose,
        deviceId: "customer-web",
        otp,
        otpId,
      }).unwrap();
      const profileComplete = Boolean(result.profileComplete ?? result.customer.profileComplete);
      const caps = {
        ...customerPortalCapabilitiesFromTenant(result.tenant),
        ...result.tenantCapabilities,
      };
      dispatch(
        customerSignedIn({
          customerId: result.customer.id,
          tenantCode: result.tenant.tenantCode,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          profileComplete,
          kycMandatory: caps.kycMandatory,
          customerSelfRegistration: caps.customerSelfRegistration,
          customerSelfEnrol: caps.customerSelfEnrol,
          multiScheme: caps.multiScheme,
        }),
      );
      const slug = tenantSlug ?? result.tenant.tenantCode.toLowerCase().replace(/_/g, "-");
      if (!profileComplete) {
        toast.success(mode === "signup" ? "Welcome! Let’s finish your profile." : "Please complete your profile");
        router.replace(customerPath(slug, "onboarding"));
        return;
      }
      toast.success(`Welcome${result.customer.name ? `, ${result.customer.name.split(/\s+/)[0]}` : ""}`);
      router.replace(customerPath(slug));
    } catch (err: unknown) {
      const code = (err as { data?: { code?: string; message?: string } })?.data?.code;
      const message = (err as { data?: { message?: string } })?.data?.message;
      if (code === "OTP_PURPOSE_MISMATCH" && message) {
        toast.error(message);
        switchMode(mode === "signup" ? "login" : "signup");
        return;
      }
      if (code === "SELF_REGISTRATION_DISABLED") {
        toast.error("Online registration is not available. Contact your branch.");
        switchMode("login");
        return;
      }
      if (code === "CUSTOMER_MOBILE_EXISTS") {
        toast.error("This number is already registered. Use Sign in instead.");
        switchMode("login");
        return;
      }
      if (code === "OTP_INVALID") {
        toast.error("That OTP is wrong, expired, or already used. Tap Resend OTP and try again.");
      } else {
        toast.error("That OTP is incorrect or expired");
      }
    }
  };

  if (loading) {
    return (
      <div className="customer-theme grid min-h-screen place-items-center bg-[#fbf8f4]">
        <LoaderCircle className="size-10 animate-spin text-[#730321]" aria-label="Loading" />
      </div>
    );
  }

  if (notFound || !tenantCode) {
    return (
      <div className="customer-theme grid min-h-screen place-items-center bg-[#fbf8f4] px-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-black">Jewellery not found</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Use the link from your jeweller, for example{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/customer/your-jeweller-code/login</code>
          </p>
        </div>
      </div>
    );
  }

  const jewellerName = tenant?.appDisplayName ?? tenant?.displayName ?? tenantCode;

  return (
    <div className="customer-theme min-h-screen bg-[#fbf8f4] lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-[#4b0a18] p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-36 -top-40 size-[520px] rounded-full border border-white/10 bg-[radial-gradient(circle,#8c2940_0%,transparent_65%)]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-white text-[#730321]">
            <Gem />
          </span>
          <span>
            <b className="block text-xl tracking-[.14em]">SWARNA GROW</b>
            <small className="font-bold tracking-[.24em] text-[#eac35d]">GOLD SAVINGS</small>
          </span>
        </div>
        <div className="relative my-auto max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-[#f2d37e]">
            <CheckCircle2 className="size-4" /> Secure customer portal
          </span>
          <h1 className="mt-7 text-5xl font-black leading-[1.08] tracking-tight">
            Your jewellery savings,
            <br />
            <span className="text-[#e8c35e]">always within reach.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/65">
            {registrationEnabled
              ? kycPortalEnabled
                ? `Sign in or register with OTP, complete identity verification, and manage schemes with ${jewellerName}.`
                : `Sign in or register with OTP and manage your gold savings schemes with ${jewellerName}.`
              : `Sign in with OTP to manage your gold savings schemes with ${jewellerName}.`}
          </p>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          {registrationEnabled ? (
            <div className="mb-6 flex rounded-xl bg-[#eee8e5] p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === "login" ? "bg-white text-[#730321] shadow-sm" : "text-muted-foreground"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === "signup" ? "bg-white text-[#730321] shadow-sm" : "text-muted-foreground"}`}
              >
                Create account
              </button>
            </div>
          ) : null}
          <div className="rounded-[1.75rem] border bg-white p-6 shadow-[0_24px_70px_rgba(76,20,34,.10)] sm:p-9">
            {step === "otp" && (
              <button
                onClick={() => setStep("mobile")}
                className="mb-5 flex items-center gap-2 text-sm font-semibold text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
                Change number
              </button>
            )}
            <div className="grid size-12 place-items-center rounded-2xl bg-[#f8e9c7] text-[#730321]">
              {step === "mobile" ? <Smartphone /> : <LockKeyhole />}
            </div>
            <h2 className="mt-5 text-2xl font-black">
              {step === "mobile"
                ? mode === "login"
                  ? "Welcome back"
                  : "Create your account"
                : "Verify your mobile"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {step === "mobile"
                ? mode === "login"
                  ? `Enter the mobile number registered with ${jewellerName}.`
                  : `Register with your mobile to start saving with ${jewellerName}.`
                : `We sent a 6-digit code to +91 ${mobile.slice(0, 2)}••• ••${mobile.slice(-3)}.`}
            </p>
            {step === "mobile" ? (
              <div className="mt-7 space-y-2">
                <Label htmlFor="mobile">Mobile number</Label>
                <div className="flex h-12 overflow-hidden rounded-xl border bg-white focus-within:ring-2 focus-within:ring-[#9c5869]">
                  <span className="grid place-items-center border-r bg-[#faf6f3] px-3 text-sm font-bold">+91</span>
                  <Input
                    id="mobile"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    className="h-full border-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <Button
                  onClick={sendOtp}
                  disabled={requestState.isLoading}
                  className="mt-4 h-12 w-full rounded-xl bg-[#730321] text-base font-bold hover:bg-[#5a0219]"
                >
                  {requestState.isLoading ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <>
                      Send secure OTP
                      <ArrowRight className="ml-auto" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="mt-7">
                <Label htmlFor="otp">One-time password</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="mt-2 h-14 rounded-xl text-center text-xl font-black tracking-[.55em]"
                />
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {mode === "signup" ? "Create account" : "Sign in"} OTP · demo code: <b>123456</b>
                  {mode === "signup" ? (
                    <>
                      <br />
                      <span className="text-[11px]">Use the OTP from the last “Send secure OTP” on this tab.</span>
                    </>
                  ) : null}
                </p>
                <Button
                  onClick={verify}
                  disabled={verifyState.isLoading}
                  className="mt-5 h-12 w-full rounded-xl bg-[#730321] text-base font-bold hover:bg-[#5a0219]"
                >
                  {verifyState.isLoading ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <>
                      Verify & continue
                      <ArrowRight className="ml-auto" />
                    </>
                  )}
                </Button>
                <button
                  disabled={seconds > 0}
                  onClick={sendOtp}
                  className="mt-4 w-full text-center text-sm font-bold text-[#730321] disabled:text-muted-foreground"
                >
                  {seconds ? `Resend in ${seconds}s` : "Resend OTP"}
                </button>
              </div>
            )}
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            {registrationEnabled ? (
              mode === "login" ? (
                <>
                  New to {jewellerName}?{" "}
                  <button type="button" className="font-bold text-[#730321]" onClick={() => switchMode("signup")}>
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button type="button" className="font-bold text-[#730321]" onClick={() => switchMode("login")}>
                    Sign in
                  </button>
                </>
              )
            ) : (
              <>New customers should visit {jewellerName} or call the branch to register.</>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
