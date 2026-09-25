"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  LoaderCircle,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgentLoginMutation } from "@/src/store/api/agent-api";
import { useAppDispatch } from "@/src/store/hooks";
import { persistAgentTokens } from "@/src/lib/auth-token-storage";
import { setAgentSession } from "@/src/store/slices/agent-session-slice";
import { env } from "@/src/config/env";
import { useAgentTenant } from "@/src/components/agent/agent-tenant-context";
import { AGENT_TENANT_SLUG_STORAGE_KEY } from "@/src/lib/agent-tenant";
import {
  passwordPinReady,
  sanitizePasswordPinInput,
} from "@/src/lib/password-validation";
import { apiErrorMessage } from "@/src/lib/api-error";

function isRequestAborted(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const row = error as {
    name?: string;
    message?: string;
    status?: unknown;
    error?: unknown;
  };
  return (
    row.name === "AbortError" ||
    row.message === "Aborted" ||
    (row.status === "FETCH_ERROR" && row.error === "Aborted")
  );
}

function MissingJewellerLink() {
  return (
    <div className="agent-theme min-h-screen px-4 py-12 sm:grid sm:place-items-center">
      <div className="mx-auto max-w-lg rounded-2xl border border-[#eadfd8] bg-white p-8 text-center shadow-lg">
        <Building2 className="mx-auto size-10 text-[#730321]" />
        <h1 className="mt-4 text-2xl font-black text-[#21171a]">
          Use your jeweller&apos;s collection link
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#7e7477]">
          Each showroom has its own agent sign-in URL, like the customer portal.
          Ask your branch for the link — it looks like{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            /agent/your-jeweller-code/login
          </code>
          .
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Example:{" "}
          <code className="text-xs">/agent/kairali/login</code> or{" "}
          <code className="text-xs">/agent/nakshathraje/login</code>
        </p>
      </div>
    </div>
  );
}

export function AgentLoginPage({ tenantSlug }: { tenantSlug: string | null }) {
  if (!tenantSlug) {
    return <MissingJewellerLink />;
  }

  return <AgentLoginForm tenantSlug={tenantSlug} />;
}

function AgentLoginForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tenantCode, displayName, loading, notFound } = useAgentTenant();
  const [login, state] = useAgentLoginMutation();
  const [mobile, setMobile] = useState(env.useMocks ? "9847012352" : "");
  const [password, setPassword] = useState(env.useMocks ? "2026" : "");
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    if (!tenantCode) {
      return toast.error(
        "This jeweller link is invalid. Check the URL with your branch.",
      );
    }
    if (mobile.replace(/\D/g, "").length < 10 || !passwordPinReady(password)) {
      return toast.error(
        "Enter a valid mobile number and password (min. 4 digits).",
      );
    }
    try {
      const result = await login({
        tenantCode,
        mobile: mobile.replace(/\D/g, "").slice(-10),
        password,
        deviceId: "agent-web-device",
        platform: "web",
        appVersion: "1.0.0",
      }).unwrap();
      if (result.user.role !== "COLLECTION_AGENT" || !result.user.branchId) {
        return toast.error("This portal is for assigned collection agents only.");
      }
      const choice = {
        tenantCode: result.user.tenantCode ?? tenantCode,
        displayName: result.user.tenantName ?? displayName ?? "Jewellery",
      };
      dispatch(setAgentSession({ ...result, selectedTenant: choice }));
      persistAgentTokens(result.accessToken, result.refreshToken);
      localStorage.setItem(AGENT_TENANT_SLUG_STORAGE_KEY, tenantSlug);
      toast.success(`Welcome to ${choice.displayName}`);
      router.replace("/agent");
    } catch (error) {
      if (isRequestAborted(error)) return;
      toast.error(
        apiErrorMessage(error, "Login failed. Check your details and try again."),
      );
    }
  };

  if (loading) {
    return (
      <div className="agent-theme grid min-h-screen place-items-center">
        <LoaderCircle className="size-10 animate-spin text-[#730321]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="agent-theme min-h-screen px-4 py-12 sm:grid sm:place-items-center">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#eadfd8] bg-white p-8 text-center">
          <h1 className="text-xl font-black text-[#21171a]">Jeweller not found</h1>
          <p className="mt-2 text-sm text-[#7e7477]">
            No active tenant matches{" "}
            <code className="rounded bg-muted px-1">{tenantSlug}</code>. Check
            the link from your branch.
          </p>
        </div>
      </div>
    );
  }

  const jewellerLabel = displayName ?? tenantCode;

  return (
    <div className="agent-theme min-h-screen px-4 py-8 sm:grid sm:place-items-center">
      <div className="mx-auto w-full max-w-[1020px] overflow-hidden rounded-[2rem] border border-[#eadfd8] bg-white shadow-[0_30px_80px_rgba(75,31,44,.12)] sm:grid sm:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden min-h-[650px] overflow-hidden bg-[#65031e] p-10 text-white sm:block">
          <div className="relative">
            <span className="grid size-14 place-items-center rounded-2xl bg-white text-2xl font-black text-[#730321]">
              S
            </span>
            <p className="mt-8 text-xs font-black uppercase tracking-[.22em] text-[#efc96c]">
              SwarnaGrow Field
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-[-.045em]">
              {jewellerLabel}
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
              Sign in to collect against assigned customers for this jewellery
              only.
            </p>
          </div>
        </aside>
        <main className="p-6 sm:p-10 lg:p-14">
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#a07218]">
            Collection agent
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-[#21171a]">
            {jewellerLabel}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#7e7477]">
            Enter your staff mobile and PIN for{" "}
            <span className="font-semibold">{tenantCode}</span>.
          </p>
          <div className="mt-8 space-y-5">
            <div>
              <Label htmlFor="agent-mobile" className="font-bold">
                Mobile number
              </Label>
              <div className="relative mt-2">
                <Smartphone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9c8e91]" />
                <Input
                  id="agent-mobile"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  className="h-12 rounded-xl border-[#dfd3cd] pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="agent-password" className="font-bold">
                Password
              </Label>
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9c8e91]" />
                <Input
                  id="agent-password"
                  type={showPassword ? "text" : "password"}
                  inputMode="numeric"
                  placeholder="Min. 4 digits"
                  value={password}
                  onChange={(event) =>
                    setPassword(sanitizePasswordPinInput(event.target.value))
                  }
                  onKeyDown={(event) => event.key === "Enter" && submit()}
                  className="h-12 rounded-xl border-[#dfd3cd] px-10 tracking-[0.35em]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8e8285]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <Button
            onClick={() => submit()}
            disabled={state.isLoading}
            className="mt-7 h-12 w-full rounded-xl bg-[#730321] text-base font-black hover:bg-[#5d0219]"
          >
            {state.isLoading ? "Signing in…" : (
              <>
                Continue <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
          <p className="mt-5 text-center text-xs leading-5 text-[#948a8c]">
            Only assigned collection agents can access this portal.
          </p>
        </main>
      </div>
    </div>
  );
}
