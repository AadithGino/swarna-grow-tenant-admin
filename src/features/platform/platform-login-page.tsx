"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/src/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/src/components/common/page-parts";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { ApiErrorCallout } from "@/src/components/common/api-error-callout";
import { env } from "@/src/config/env";
import { handleFormApiError } from "@/src/lib/form-api-error";
import {
  livePlatformLoginEmailError,
  livePlatformLoginPasswordError,
  platformLoginFormReady,
  validatePlatformLoginForm,
  sanitizePasswordPinInput,
} from "@/src/lib/platform-login-form-validation";
import {
  hasPlatformSession,
  persistPlatformTokens,
  TOKEN_KEYS,
} from "@/src/lib/auth-token-storage";
import { safeAuthReturnPath } from "@/src/lib/auth-return-path";
import { useClientMounted } from "@/src/hooks/use-client-mounted";
import { usePlatformLoginMutation } from "@/src/store/api/platform-api";

function mergeFieldMessage(
  apiOrSubmit: string | undefined,
  live: string | undefined,
): string | undefined {
  return apiOrSubmit ?? live;
}

export function PlatformLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useClientMounted();
  const [login, { isLoading }] = usePlatformLoginMutation();
  const [email, setEmail] = useState(
    env.useMocks ? "ops@platform.com" : "",
  );
  const [password, setPassword] = useState(
    env.useMocks ? "1234" : "",
  );
  const [show, setShow] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>(
    {},
  );

  const postLoginPath = safeAuthReturnPath(
    searchParams.get("next"),
    "/platform",
  );

  useEffect(() => {
    if (!mounted) return;
    if (hasPlatformSession()) {
      router.replace(postLoginPath);
    }
  }, [mounted, router, postLoginPath]);

  const liveEmailError = useMemo(
    () => livePlatformLoginEmailError(email),
    [email],
  );
  const livePasswordError = useMemo(
    () => livePlatformLoginPasswordError(password),
    [password],
  );

  const displayEmailError = mergeFieldMessage(
    fieldErrors.email,
    touched.email || email.trim() ? liveEmailError : undefined,
  );
  const displayPasswordError = mergeFieldMessage(
    fieldErrors.password,
    touched.password || password ? livePasswordError : undefined,
  );

  const submitDisabled = isLoading || !platformLoginFormReady({ email, password });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setTouched({ email: true, password: true });
    const clientErrors = validatePlatformLoginForm({ email, password });
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      return;
    }
    try {
      const result = await login({
        email: email.trim(),
        password,
      }).unwrap();
      persistPlatformTokens(result.accessToken, result.refreshToken);
      localStorage.setItem(TOKEN_KEYS.platform.user, JSON.stringify(result.user));
      router.push(postLoginPath);
    } catch (e) {
      setSubmitError(e);
      handleFormApiError(e, {
        setFieldErrors,
        fallback: "Sign in failed",
        toast: false,
      });
    }
  };

  return (
    <div className="grid min-h-screen bg-[#fbf8f5] lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden overflow-hidden bg-[#3e0812] p-12 text-white lg:flex lg:flex-col">
        <BrandMark />
        <div className="my-auto max-w-xl">
          <div className="mb-6 grid size-16 place-items-center rounded-2xl bg-white/10">
            <ShieldCheck className="size-8 text-[#e4b94d]" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#e4b94d]">
            Platform operations
          </p>
          <h1 className="mt-4 text-5xl font-extrabold leading-tight tracking-tight">
            Run every jeweller from one secure console.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#e7cfd3]">
            Provision tenants, control subscriptions, verify integrations and
            resolve platform incidents with a complete audit trail.
          </p>
        </div>
        <p className="text-sm text-[#c59a9f]">
          Restricted to authorised Swarna Grow platform staff.
        </p>
      </section>
      <section className="grid place-items-center p-6">
        <form
          onSubmit={submit}
          className="w-full max-w-[30rem] rounded-3xl border border-[#e4d7d2] bg-white p-7 shadow-[0_22px_65px_rgba(67,15,25,0.10)] sm:p-10"
        >
          <div className="mb-8">
            <div className="mb-6 lg:hidden">
              <div className="inline-flex rounded-xl bg-[#3e0812] p-3">
                <LockKeyhole className="text-white" />
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6f2a]">
              Super admin
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#28161a]">
              Sign in to the platform
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use your platform email and password. Tenant credentials cannot
              access this console.
            </p>
          </div>
          <div className="space-y-5">
            <div>
              <FieldLabel>Email address</FieldLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setTouched((p) => ({ ...p, email: true }));
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.email;
                    return next;
                  });
                  setEmail(e.target.value);
                }}
                onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                className={cn("h-12", displayEmailError && "border-red-600")}
                autoComplete="username"
                aria-invalid={Boolean(displayEmailError)}
              />
              <FormFieldError message={displayEmailError} />
            </div>
            <div>
              <FieldLabel>Password</FieldLabel>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setTouched((p) => ({ ...p, password: true }));
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.password;
                      return next;
                    });
                    setPassword(sanitizePasswordPinInput(e.target.value));
                  }}
                  onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                  inputMode="numeric"
                  placeholder="Min. 4 digits"
                  className={cn(
                    "h-12 pr-12 tracking-[0.35em]",
                    displayPasswordError && "border-red-600",
                  )}
                  autoComplete="current-password"
                  aria-invalid={Boolean(displayPasswordError)}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
              <FormFieldError message={displayPasswordError} />
            </div>
            {submitError ? <ApiErrorCallout error={submitError} /> : null}
            <Button
              type="submit"
              className="h-12 w-full text-base"
              disabled={submitDisabled}
            >
              {isLoading ? "Signing in…" : "Sign in securely"}
            </Button>
          </div>
          {env.useMocks ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Mock preview credentials are prefilled when mock mode is enabled.
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
