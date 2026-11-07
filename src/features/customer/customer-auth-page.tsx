"use client";

import { useEffect, useState } from "react";
import { useClientMounted } from "@/src/hooks/use-client-mounted";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginCustomerPasswordMutation, useRequestCustomerOtpMutation, useVerifyCustomerOtpMutation } from "@/src/store/api/customer-api";
import {
  persistCustomerTokens,
  realmHasStoredSession,
} from "@/src/lib/auth-token-storage";
import { safeAuthReturnPath } from "@/src/lib/auth-return-path";
import { resetCustomerScopedStateIfAccountSwitch } from "@/src/lib/customer-identity-switch";
import { customerSignedIn } from "@/src/store/slices/customer-session-slice";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { toast } from "sonner";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { env } from "@/src/config/env";
import { customerPortalCapabilitiesFromTenant } from "@/src/lib/customer-portal-capabilities";
import { CustomerBrand } from "@/src/components/customer/customer-ui";
import type { OtpRequestMetaPick, TenantOtpInputSlice } from "@/src/lib/customer-auth-otp-form-meta";
import {
  customerAuthOtpLengthFromContext,
  customerAuthOtpSmsRegionFromContext,
} from "@/src/lib/customer-auth-otp-form-meta";
import {
  customerOtpIncompleteMessage,
  customerOtpPattern,
  customerOtpSmsRegionLabel,
} from "@/src/lib/customer-otp-ui";

type Step = "mobile" | "otp";
type AuthMode = "login" | "signup";

/** Same OTP field derivation as the login page (AUD-09); exported for regression tests. */
export function deriveCustomerAuthOtpFormState(
  tenant: TenantOtpInputSlice | null | undefined,
  requestMeta: OtpRequestMetaPick | null,
) {
  return {
    otpLength: customerAuthOtpLengthFromContext(tenant, requestMeta),
    smsRegion: customerOtpSmsRegionLabel(customerAuthOtpSmsRegionFromContext(tenant, requestMeta)),
  };
}

export function CustomerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { tenantCode, tenantSlug, tenant, loading, notFound } = useCustomerTenant();
  const authenticated = useAppSelector((s) => s.customerSession.authenticated);
  const mounted = useClientMounted();
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpId, setOtpId] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [requestOtpMeta, setRequestOtpMeta] = useState<{ otpLength?: number; authCountryCode?: string } | null>(null);
  const [password, setPassword] = useState("");
  const [requestOtp, requestState] = useRequestCustomerOtpMutation();
  const [verifyOtp, verifyState] = useVerifyCustomerOtpMutation();
  const [loginPassword, loginPasswordState] = useLoginCustomerPasswordMutation();
  const portalCaps = customerPortalCapabilitiesFromTenant(tenant);
  const { otpLength, smsRegion } = deriveCustomerAuthOtpFormState(tenant, requestOtpMeta);
  const registrationEnabled = portalCaps.customerSelfRegistration;
  const kycPortalEnabled = portalCaps.kycMandatory;
  const passwordOnlyLogin = portalCaps.customerLoginMode === "PASSWORD_ONLY";

  const homePath = safeAuthReturnPath(
    searchParams.get("next"),
    customerPath(tenantSlug),
  );

  const sessionTenantId = useAppSelector((s) => s.customerSession.tenantId);
  const urlTenantId = tenant?.id;

  useEffect(() => {
    if (!mounted) return;
    if (!authenticated && !realmHasStoredSession("customer")) return;
    if (sessionTenantId && urlTenantId && sessionTenantId !== urlTenantId) return;
    router.replace(homePath);
  }, [mounted, authenticated, router, homePath, sessionTenantId, urlTenantId]);

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
    setRequestOtpMeta(null);
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
      setOtp("");
      setStep("otp");
      setRequestOtpMeta({
        otpLength: result.otpLength,
        authCountryCode: result.authCountryCode,
      });
      setSeconds(result.resendAvailableInSeconds ?? 30);
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
    if (!customerOtpPattern(otpLength).test(otp)) {
      return toast.error(customerOtpIncompleteMessage(otpLength));
    }
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
      resetCustomerScopedStateIfAccountSwitch(dispatch, {
        customerId: result.customer.id,
        tenantId: result.customer.tenantId ?? (result.tenant as { id?: string }).id,
      });
      dispatch(
        customerSignedIn({
          customerId: result.customer.id,
          tenantId: result.customer.tenantId ?? (result.tenant as { id?: string }).id,
          tenantCode: result.tenant.tenantCode,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          profileComplete,
          kycMandatory: caps.kycMandatory,
          customerSelfRegistration: caps.customerSelfRegistration,
          customerSelfEnrol: caps.customerSelfEnrol,
          multiScheme: caps.multiScheme,
          customerLoginMode: caps.customerLoginMode,
          customerAppWriteEnabled: caps.customerAppWriteEnabled,
          customerAppPaymentsEnabled: caps.customerAppPaymentsEnabled,
        }),
      );
      persistCustomerTokens(result.accessToken, result.refreshToken);
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

  const signInWithPassword = async () => {
    if (!tenantCode) return toast.error("Open your jeweller’s customer link (e.g. /customer/your-code/login).");
    if (!/^\d{10}$/.test(mobile)) return toast.error("Enter a valid 10-digit mobile number");
    if (!/^\d{4,128}$/.test(password)) {
      return toast.error("Enter a password with at least 4 digits");
    }
    try {
      const result = await loginPassword({
        tenantCode,
        mobile: `+91${mobile}`,
        password,
        deviceId: "customer-web",
      }).unwrap();
      const profileComplete = Boolean(result.profileComplete ?? result.customer.profileComplete);
      const caps = {
        ...customerPortalCapabilitiesFromTenant(result.tenant),
        ...result.tenantCapabilities,
      };
      resetCustomerScopedStateIfAccountSwitch(dispatch, {
        customerId: result.customer.id,
        tenantId: result.customer.tenantId ?? (result.tenant as { id?: string }).id,
      });
      dispatch(
        customerSignedIn({
          customerId: result.customer.id,
          tenantId: result.customer.tenantId ?? (result.tenant as { id?: string }).id,
          tenantCode: result.tenant.tenantCode,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          profileComplete,
          kycMandatory: caps.kycMandatory,
          customerSelfRegistration: caps.customerSelfRegistration,
          customerSelfEnrol: caps.customerSelfEnrol,
          multiScheme: caps.multiScheme,
          customerLoginMode: caps.customerLoginMode,
          customerAppWriteEnabled: caps.customerAppWriteEnabled,
          customerAppPaymentsEnabled: caps.customerAppPaymentsEnabled,
        }),
      );
      persistCustomerTokens(result.accessToken, result.refreshToken);
      const slug = tenantSlug ?? result.tenant.tenantCode.toLowerCase().replace(/_/g, "-");
      if (!profileComplete) {
        router.replace(customerPath(slug, "onboarding"));
        return;
      }
      router.replace(customerPath(slug));
    } catch {
      toast.error("Mobile number or password is incorrect");
    }
  };

  if (!mounted || loading) {
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
    <div className="customer-theme min-h-screen lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden border-r border-[#eadfda] bg-[#fffaf0] p-12 lg:flex lg:flex-col">
        <div className="absolute -right-28 -top-32 size-[460px] rounded-full border border-[#ead9ae] bg-[#fff4d6] opacity-60" />
        <div className="relative"><CustomerBrand /></div>
        <div className="relative my-auto max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4cf96] bg-white px-4 py-2 text-xs font-bold text-[#8b5f08]">
            <CheckCircle2 className="size-4" /> Secure customer portal
          </span>
          <h1 className="mt-7 text-5xl font-black leading-[1.08] tracking-[-.045em] text-[#171722]">
            Your jewellery savings,
            <br />
            <span className="text-[#8b5f08]">always within reach.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#706b77]">
            {passwordOnlyLogin
              ? `Sign in with your mobile number and customer password to access ${jewellerName}.`
              : registrationEnabled
              ? kycPortalEnabled
                ? `Sign in or register with OTP, complete identity verification, and manage schemes with ${jewellerName}.`
                : `Sign in or register with OTP and manage your gold savings schemes with ${jewellerName}.`
              : `Sign in with OTP to manage your gold savings schemes with ${jewellerName}.`}
          </p>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          {registrationEnabled && !passwordOnlyLogin ? (
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
          <div className="customer-surface p-6 sm:p-9">
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
              {passwordOnlyLogin
                ? "Welcome back"
                : step === "mobile"
                ? mode === "login"
                  ? "Welcome back"
                  : "Create your account"
                : "Verify your mobile"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {passwordOnlyLogin
                ? `Enter the mobile number registered with ${jewellerName} and your password.`
                : step === "mobile"
                ? mode === "login"
                  ? `Enter the mobile number registered with ${jewellerName}.`
                  : `Register with your mobile to start saving with ${jewellerName}.`
                : `We sent a ${otpLength}-digit SMS code (${smsRegion}) to your number ending in ${mobile.slice(-3)}.`}
            </p>
            {passwordOnlyLogin ? (
              <div className="mt-7 space-y-4">
                <div className="space-y-2">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    inputMode="numeric"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value.replace(/\D/g, "").slice(0, 128))
                    }
                    placeholder="Min. 4 digits"
                    className="h-12 rounded-xl tracking-[0.35em]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the numeric password set by your jeweller (minimum 4 digits).
                  </p>
                </div>
                <Button
                  onClick={signInWithPassword}
                  disabled={loginPasswordState.isLoading}
                  className="mt-2 h-12 w-full rounded-xl bg-[#730321] text-base font-bold hover:bg-[#5a0219]"
                >
                  {loginPasswordState.isLoading ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-auto" />
                    </>
                  )}
                </Button>
              </div>
            ) : step === "mobile" ? (
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
                  maxLength={otpLength}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, otpLength))}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, otpLength);
                    setOtp(text);
                  }}
                  className="mt-2 h-14 rounded-xl text-center text-xl font-black tracking-[.55em]"
                />
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {mode === "signup" ? "Create account" : "Sign in"} OTP.
                  {env.useMocks ? (
                    <>
                      {" "}
                      Mock API: use <b>123456</b> (or match your <span className="font-mono">otpLength</span>).
                    </>
                  ) : (
                    <>
                      {" "}
                      Use the code from the most recent “Send secure OTP” for this step; resend replaces the code.
                    </>
                  )}
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
            {registrationEnabled && !passwordOnlyLogin ? (
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
              <>
                {passwordOnlyLogin
                  ? "Ask your branch for your customer password if you have not received one."
                  : `New customers should visit ${jewellerName} or call the branch to register.`}
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
