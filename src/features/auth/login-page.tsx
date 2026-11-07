"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Phone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandMark } from "@/src/components/brand/brand-mark";
import { FieldLabel } from "@/src/components/common/page-parts";
import { env } from "@/src/config/env";
import { MOCK_OWNER_SESSION } from "@/src/config/mock-session";
import { resetAuthLogoutGuards } from "@/src/lib/auth-logout";
import { portalSessionFromLogin } from "@/src/lib/auth-session";
import { safeAuthReturnPath } from "@/src/lib/auth-return-path";
import { getOrCreateDeviceId } from "@/src/lib/device-id";
import {
  persistTenantTokens,
  realmHasStoredSession,
} from "@/src/lib/auth-token-storage";
import { useClientMounted } from "@/src/hooks/use-client-mounted";
import {
  adminApi,
  useForgotPasswordMutation,
  useLoginMutation,
  useResetPasswordWithTokenMutation,
  useSetPasswordMutation,
  useVerifyPasswordResetOtpMutation,
} from "@/src/store/api/admin-api";
import { apiErrorMessage, parseApiError } from "@/src/lib/api-error";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { setSession } from "@/src/store/slices/session-slice";
import {
  passwordPinReady,
  sanitizePasswordPinInput,
} from "@/src/lib/password-validation";

type TenantOption = {
  tenantCode: string;
  displayName: string;
  logoUrl?: string | null;
};

function extractLoginError(err: unknown): {
  code?: string;
  message: string;
  fieldErrors: Record<string, string>;
  tenants?: TenantOption[];
} {
  const parsed = parseApiError(err, "Sign in failed");
  const payload = (err as { data?: { error?: { details?: unknown } } })?.data;
  const details = payload?.error?.details;
  const tenants =
    details &&
    typeof details === "object" &&
    !Array.isArray(details) &&
    Array.isArray((details as { tenants?: TenantOption[] }).tenants)
      ? ((details as { tenants: TenantOption[] }).tenants as TenantOption[])
      : undefined;
  return { ...parsed, tenants };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-red-700">
      {message}
    </p>
  );
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const mounted = useClientMounted();
  const hydrated = useAppSelector((s) => s.session.hydrated);
  const session = useAppSelector((s) => s.session.session);
  const [login, loginState] = useLoginMutation();
  const [forgotPassword, forgotState] = useForgotPasswordMutation();
  const [verifyResetOtp, verifyOtpState] = useVerifyPasswordResetOtpMutation();
  const [resetPasswordWithToken, resetWithTokenState] =
    useResetPasswordWithTokenMutation();
  const [setPassword, setPasswordState] = useSetPasswordMutation();
  const [forgotStep, setForgotStep] = useState<"request" | "otp" | "password">(
    "request",
  );
  const [resetOtp, setResetOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState(env.useMocks ? "9847012345" : "");
  const [password, setPasswordValue] = useState(
    env.useMocks ? "2026" : "",
  );
  const [tenantCode, setTenantCode] = useState("");
  const [tenantOptions, setTenantOptions] = useState<TenantOption[] | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotTenant, setForgotTenant] = useState("");
  const [forgotMobile, setForgotMobile] = useState("");
  const [mustSetPasswordOpen, setMustSetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const postLoginPath = safeAuthReturnPath(searchParams.get("next"), "/");

  useEffect(() => {
    resetAuthLogoutGuards();
  }, []);

  useEffect(() => {
    if (!mounted || !hydrated) return;
    if (session && realmHasStoredSession("tenant")) {
      if (env.portalHardNav) window.location.replace(postLoginPath);
      else router.replace(postLoginPath);
    }
  }, [mounted, hydrated, session, router, postLoginPath]);

  if (
    !mounted ||
    !hydrated ||
    (session && realmHasStoredSession("tenant"))
  ) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbf7f3]">
        <div className="size-10 animate-spin rounded-full border-4 border-[#ecd8dd] border-t-[#730321]" />
      </div>
    );
  }

  async function completeLogin(
    sessionInput: Parameters<typeof portalSessionFromLogin>[0],
    { redirect = true }: { redirect?: boolean } = {},
  ) {
    const nextSession = portalSessionFromLogin(sessionInput);
    dispatch(setSession(nextSession));

    if (!env.useMocks) {
      try {
        const profile = await dispatch(
          adminApi.endpoints.getSettingsProfile.initiate(undefined, {
            forceRefetch: true,
          }),
        ).unwrap();
        const displayName =
          profile?.displayName ??
          profile?.businessName ??
          profile?.name ??
          nextSession.tenant.displayName;
        const code =
          profile?.tenantCode ??
          profile?.code ??
          nextSession.tenant.tenantCode;
        if (
          displayName !== nextSession.tenant.displayName ||
          code !== nextSession.tenant.tenantCode
        ) {
          dispatch(
            setSession({
              ...nextSession,
              tenant: {
                ...nextSession.tenant,
                displayName,
                tenantCode: code,
              },
            }),
          );
        }
      } catch {
        // Profile is optional for first paint; tenantId placeholder is fine.
      }
    }

    if (redirect) router.push(postLoginPath);
  }

  return (
    <main className="grid min-h-screen bg-[#fbf7f3] lg:grid-cols-[minmax(360px,44%)_1fr]">
      <section className="relative hidden overflow-hidden bg-[#490b17] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandMark />
        <div className="relative z-10 max-w-xl">
          <div className="mb-6 h-1 w-20 rounded-full bg-[#dfb546]" />
          <h1 className="text-5xl font-extrabold leading-[1.06] tracking-[-0.045em]">
            Every gold scheme, under control.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#eadadd]">
            Collections, customer accounts, maturity, gold liability and staff
            cash—one operational view for your jewellery.
          </p>
        </div>
        <div className="text-sm text-[#cbaeb4]">
          Secure tenant administration · Role-based access
        </div>
        <div className="absolute -bottom-40 -right-40 size-[560px] rounded-full border-[90px] border-[#650d21] opacity-70" />
      </section>
      <section className="grid place-items-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex rounded-2xl bg-[#490b17] p-3">
              <BrandMark />
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6f2a]">
            Jewellery portal
          </p>
          <h2 className="mt-2 text-4xl font-extrabold tracking-[-0.04em] text-[#26151a]">
            Welcome back
          </h2>
          <p className="mt-2 text-muted-foreground">
            Sign in with your registered mobile number and password.
          </p>
          <form
            className="mt-8 space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setErrorMessage(null);
              setFieldErrors({});
              setBusy(true);
              try {
                if (env.useMocks) {
                  await new Promise((resolve) => setTimeout(resolve, 650));
                  dispatch(setSession(MOCK_OWNER_SESSION));
                  // The admin shell requires stored tokens; without them the
                  // offline demo bounced straight back to /login.
                  persistTenantTokens(
                    MOCK_OWNER_SESSION.accessToken ?? "mock-access-token",
                    "mock-refresh-token",
                  );
                  router.push(postLoginPath);
                  return;
                }

                const data = await login({
                  mobile: mobile.trim(),
                  password,
                  deviceId: getOrCreateDeviceId(),
                  platform: "web",
                  ...(tenantCode.trim()
                    ? { tenantCode: tenantCode.trim() }
                    : {}),
                }).unwrap();

                const needsPassword = Boolean(
                  (data.user as { mustSetPassword?: boolean })?.mustSetPassword,
                );
                await completeLogin(
                  {
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    user: data.user as Parameters<
                      typeof portalSessionFromLogin
                    >[0]["user"],
                    mobile: mobile.trim(),
                  },
                  { redirect: !needsPassword },
                );
                if (needsPassword) {
                  setNewPassword("");
                  setConfirmPassword("");
                  setMustSetPasswordOpen(true);
                }
              } catch (err) {
                const parsed = extractLoginError(err);
                if (
                  parsed.code === "TENANT_SELECTION_REQUIRED" &&
                  parsed.tenants?.length
                ) {
                  setTenantOptions(parsed.tenants);
                  setTenantCode(parsed.tenants[0]?.tenantCode ?? "");
                  setErrorMessage("Select your jewellery to continue.");
                } else {
                  setFieldErrors(parsed.fieldErrors);
                  const toastText =
                    Object.values(parsed.fieldErrors)[0] ?? parsed.message;
                  setErrorMessage(
                    Object.keys(parsed.fieldErrors).length
                      ? toastText
                      : parsed.message,
                  );
                  toast.error(toastText);
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            <div>
              <FieldLabel>Mobile number</FieldLabel>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  required
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    if (fieldErrors.mobile) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.mobile;
                        return next;
                      });
                    }
                  }}
                  inputMode="numeric"
                  className={cn(
                    "h-12 pl-11 text-base",
                    fieldErrors.mobile && "border-red-600",
                  )}
                  autoComplete="username"
                  aria-invalid={Boolean(fieldErrors.mobile)}
                />
              </div>
              <FieldError message={fieldErrors.mobile} />
            </div>
            <div>
              <div className="flex justify-between">
                <FieldLabel>Password</FieldLabel>
                <button
                  type="button"
                  className="mb-1.5 text-sm font-semibold text-[#730321]"
                  onClick={() => {
                    setForgotTenant(tenantCode);
                    setForgotMobile(mobile);
                    setForgotOpen(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  required
                  value={password}
                  onChange={(e) => {
                    setPasswordValue(sanitizePasswordPinInput(e.target.value));
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.password;
                        return next;
                      });
                    }
                  }}
                  type={show ? "text" : "password"}
                  inputMode="numeric"
                  placeholder="Min. 4 digits"
                  className={cn(
                    "h-12 pl-11 pr-12 text-base tracking-[0.35em]",
                    fieldErrors.password && "border-red-600",
                  )}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {show ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
              <FieldError message={fieldErrors.password} />
            </div>
            {(tenantOptions?.length || !env.useMocks) && (
              <div>
                <FieldLabel>
                  Jewellery code
                  {tenantOptions?.length ? "" : " (optional)"}
                </FieldLabel>
                {tenantOptions?.length ? (
                  <Select value={tenantCode} onValueChange={setTenantCode}>
                    <SelectTrigger className="h-12 w-full text-base">
                      <SelectValue placeholder="Select jewellery" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantOptions.map((t) => (
                        <SelectItem key={t.tenantCode} value={t.tenantCode}>
                          {t.displayName} ({t.tenantCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={tenantCode}
                    onChange={(e) => {
                      setTenantCode(e.target.value);
                      if (fieldErrors.tenantCode) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.tenantCode;
                          return next;
                        });
                      }
                    }}
                    placeholder="Tenant code if you work across jewelleries"
                    className={cn(
                      "h-12 text-base",
                      fieldErrors.tenantCode && "border-red-600",
                    )}
                    autoComplete="organization"
                    aria-invalid={Boolean(fieldErrors.tenantCode)}
                  />
                )}
                <FieldError message={fieldErrors.tenantCode} />
              </div>
            )}
            {errorMessage && !Object.keys(fieldErrors).length ? (
              <p role="alert" className="text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
            <Button
              size="lg"
              className="h-12 w-full text-base"
              disabled={busy || loginState.isLoading}
            >
              {busy || loginState.isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 rounded-xl border border-[#eadbb5] bg-[#fff8e8] p-4 text-sm text-[#725a28]">
            {env.useMocks ? (
              <>
                <strong>Mock mode is active.</strong> Prefilled credentials open
                the offline demo. Set{" "}
                <code className="rounded bg-[#f5e6bc] px-1 text-xs">
                  NEXT_PUBLIC_USE_MOCKS=false
                </code>{" "}
                and run swarnagrow-backend for live API testing.
              </>
            ) : (
              <>
                Connected to{" "}
                <code className="rounded bg-white/80 px-1 text-xs">
                  {env.apiBaseUrl}
                </code>
                . Sign in with your jewellery staff credentials.
              </>
            )}
          </div>
        </div>
      </section>

      <Dialog
        open={forgotOpen}
        onOpenChange={(open) => {
          setForgotOpen(open);
          if (!open) {
            setForgotStep("request");
            setResetOtp("");
            setResetToken("");
            setResetNewPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogBody>
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                {forgotStep === "request"
                  ? "Enter your jewellery code and mobile. We will send a reset OTP if the account exists."
                  : forgotStep === "otp"
                    ? env.useMocks
                      ? "Enter the OTP (use 123456 in local mock mode)."
                      : "Enter the OTP sent to your mobile."
                    : "Choose a new password for your staff account."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              {forgotStep === "request" ? (
                <>
                  <div>
                    <FieldLabel>Jewellery code</FieldLabel>
                    <Input
                      value={forgotTenant}
                      onChange={(e) => setForgotTenant(e.target.value)}
                      autoComplete="organization"
                    />
                  </div>
                  <div>
                    <FieldLabel>Mobile number</FieldLabel>
                    <Input
                      value={forgotMobile}
                      onChange={(e) => setForgotMobile(e.target.value)}
                      inputMode="numeric"
                      autoComplete="tel"
                    />
                  </div>
                </>
              ) : null}
              {forgotStep === "otp" ? (
                <div>
                  <FieldLabel>OTP</FieldLabel>
                  <Input
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="6-digit code"
                  />
                </div>
              ) : null}
              {forgotStep === "password" ? (
                <div>
                  <FieldLabel>New password</FieldLabel>
                  <Input
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) =>
                      setResetNewPassword(sanitizePasswordPinInput(e.target.value))
                    }
                    inputMode="numeric"
                    placeholder="Min. 4 digits"
                    autoComplete="new-password"
                  />
                </div>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (forgotStep === "otp") setForgotStep("request");
                else if (forgotStep === "password") setForgotStep("otp");
                else setForgotOpen(false);
              }}
            >
              {forgotStep === "request" ? "Cancel" : "Back"}
            </Button>
            {forgotStep === "request" ? (
              <Button
                disabled={
                  forgotState.isLoading ||
                  !forgotTenant.trim() ||
                  !forgotMobile.trim()
                }
                onClick={async () => {
                  try {
                    await forgotPassword({
                      tenantCode: forgotTenant.trim().toUpperCase(),
                      mobile: forgotMobile.trim(),
                      deviceId: getOrCreateDeviceId(),
                    }).unwrap();
                    toast.success("OTP sent if the account exists");
                    setForgotStep("otp");
                  } catch (err) {
                    toast.error(
                      apiErrorMessage(err, "Could not start password reset"),
                    );
                  }
                }}
              >
                {forgotState.isLoading ? "Sending…" : "Send OTP"}
              </Button>
            ) : null}
            {forgotStep === "otp" ? (
              <Button
                disabled={
                  verifyOtpState.isLoading ||
                  resetOtp.length < 4 ||
                  !forgotTenant.trim() ||
                  !forgotMobile.trim()
                }
                onClick={async () => {
                  try {
                    const result = await verifyResetOtp({
                      tenantCode: forgotTenant.trim().toUpperCase(),
                      mobile: forgotMobile.trim(),
                      otp: resetOtp,
                      deviceId: getOrCreateDeviceId(),
                    }).unwrap();
                    setResetToken(result.resetToken);
                    setForgotStep("password");
                  } catch (err) {
                    toast.error(apiErrorMessage(err, "Invalid or expired OTP"));
                  }
                }}
              >
                {verifyOtpState.isLoading ? "Verifying…" : "Verify OTP"}
              </Button>
            ) : null}
            {forgotStep === "password" ? (
              <Button
                disabled={
                  resetWithTokenState.isLoading ||
                  !passwordPinReady(resetNewPassword) ||
                  !resetToken
                }
                onClick={async () => {
                  try {
                    await resetPasswordWithToken({
                      resetToken,
                      password: resetNewPassword,
                    }).unwrap();
                    toast.success("Password updated — sign in with the new password");
                    setForgotOpen(false);
                    setPasswordValue("");
                  } catch (err) {
                    toast.error(apiErrorMessage(err, "Could not set password"));
                  }
                }}
              >
                {resetWithTokenState.isLoading ? "Saving…" : "Set password"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mustSetPasswordOpen}
        onOpenChange={(next) => {
          if (!next) return;
          setMustSetPasswordOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogBody>
            <DialogHeader>
              <DialogTitle>Set a new password</DialogTitle>
              <DialogDescription>
                Your account requires a new password before you continue.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              <div>
                <FieldLabel>New password</FieldLabel>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(sanitizePasswordPinInput(e.target.value))
                  }
                  inputMode="numeric"
                  placeholder="Min. 4 digits"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <FieldLabel>Confirm password</FieldLabel>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(sanitizePasswordPinInput(e.target.value))
                  }
                  inputMode="numeric"
                  placeholder="Min. 4 digits"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              disabled={
                setPasswordState.isLoading ||
                !passwordPinReady(newPassword) ||
                newPassword !== confirmPassword
              }
              onClick={async () => {
                if (newPassword !== confirmPassword) {
                  toast.error("Passwords do not match");
                  return;
                }
                try {
                  await setPassword({ password: newPassword }).unwrap();
                  toast.success("Password set");
                  setMustSetPasswordOpen(false);
                  router.push(postLoginPath);
                } catch (err) {
                  toast.error(apiErrorMessage(err, "Could not set password"));
                }
              }}
            >
              {setPasswordState.isLoading ? "Saving…" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
