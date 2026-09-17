"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, LockKeyhole, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgentLoginMutation } from "@/src/store/api/agent-api";
import { useAppDispatch } from "@/src/store/hooks";
import { setAgentSession } from "@/src/store/slices/agent-session-slice";
import { env } from "@/src/config/env";
import type { AgentTenantChoice } from "@/src/types/agent";
import {
  passwordPinReady,
  sanitizePasswordPinInput,
} from "@/src/lib/password-validation";

function tenantChoicesFromError(error: unknown): AgentTenantChoice[] {
  const candidate = error as { data?: { error?: { code?: string; details?: { tenants?: AgentTenantChoice[] } } } };
  return candidate?.data?.error?.code === "TENANT_SELECTION_REQUIRED" ? candidate.data.error.details?.tenants ?? [] : [];
}

export function AgentLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, state] = useAgentLoginMutation();
  const [mobile, setMobile] = useState("9847012352");
  const [password, setPassword] = useState("2026");
  const [showPassword, setShowPassword] = useState(false);
  const [tenants, setTenants] = useState<AgentTenantChoice[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<AgentTenantChoice | null>(null);

  const submit = async (tenant?: AgentTenantChoice) => {
    if (mobile.replace(/\D/g, "").length < 10 || !passwordPinReady(password)) {
      return toast.error("Enter a valid mobile number and password (min. 4 digits).");
    }
    try {
      const result = await login({
        tenantCode: tenant?.tenantCode ?? (env.agentTenantCode || undefined),
        mobile: mobile.replace(/\D/g, "").slice(-10),
        password,
        deviceId: "agent-web-device",
        platform: "web",
        appVersion: "1.0.0",
      }).unwrap();
      if (result.user.role !== "COLLECTION_AGENT" || !result.user.branchId) return toast.error("This portal is for assigned collection agents only.");
      const choice = tenant ?? {
        tenantCode: result.user.tenantCode ?? env.agentTenantCode ?? "",
        displayName: result.user.tenantName ?? "Jewellery",
      };
      dispatch(setAgentSession({ ...result, selectedTenant: choice }));
      toast.success(`Welcome to ${choice.displayName}`);
      router.replace("/agent");
    } catch (error) {
      const choices = tenantChoicesFromError(error);
      if (choices.length) { setTenants(choices); setSelectedTenant(null); return; }
      toast.error("Login failed. Check your details and try again.");
    }
  };

  return <div className="agent-theme min-h-screen px-4 py-8 sm:grid sm:place-items-center">
    <div className="mx-auto w-full max-w-[1020px] overflow-hidden rounded-[2rem] border border-[#eadfd8] bg-white shadow-[0_30px_80px_rgba(75,31,44,.12)] sm:grid sm:grid-cols-[.9fr_1.1fr]">
      <aside className="relative hidden min-h-[650px] overflow-hidden bg-[#65031e] p-10 text-white sm:block"><div className="absolute -right-20 top-16 size-72 rounded-full border border-white/10" /><div className="absolute -bottom-24 -left-20 size-80 rounded-full bg-[#a87312]/30 blur-3xl" /><div className="relative"><span className="grid size-14 place-items-center rounded-2xl bg-white text-2xl font-black text-[#730321]">S</span><p className="mt-8 text-xs font-black uppercase tracking-[.22em] text-[#efc96c]">SwarnaGrow Field</p><h1 className="mt-3 text-4xl font-black leading-tight tracking-[-.045em]">Collections made clear, safe and accountable.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-white/70">Search assigned customers, collect against the correct scheme position, track cash in hand and submit it to your branch.</p></div><div className="absolute inset-x-10 bottom-10 grid grid-cols-3 gap-3">{["Branch scoped", "Cash only", "Live position"].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-bold text-white/80"><Check className="mb-2 size-4 text-[#f0ca6f]" />{item}</div>)}</div></aside>
      <main className="p-6 sm:p-10 lg:p-14"><div className="sm:hidden"><span className="grid size-12 place-items-center rounded-2xl bg-[#730321] text-xl font-black text-white">S</span></div>{tenants.length ? <div><button type="button" onClick={() => setTenants([])} className="inline-flex items-center gap-2 text-sm font-bold text-[#766c70]"><ArrowLeft className="size-4" />Change login details</button><p className="mt-8 text-xs font-black uppercase tracking-[.18em] text-[#a07218]">Choose jewellery</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-[#21171a]">Where are you collecting today?</h2><p className="mt-2 text-sm leading-6 text-[#7e7477]">Your mobile is linked to more than one jewellery. Select the correct workplace to continue.</p><div className="mt-7 space-y-3">{tenants.map((tenant) => <button key={tenant.tenantCode} type="button" onClick={() => setSelectedTenant(tenant)} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${selectedTenant?.tenantCode === tenant.tenantCode ? "border-[#9a6c13] bg-[#fff8e7] ring-2 ring-[#efd79d]/60" : "border-[#e8ddd7] hover:border-[#d8bd82]"}`}><span className="grid size-12 place-items-center rounded-2xl bg-[#f7edf0] text-[#730321]"><Building2 className="size-5" /></span><span className="flex-1"><span className="block font-black text-[#291b20]">{tenant.displayName}</span><span className="mt-0.5 block text-xs font-semibold text-[#8b8184]">{tenant.tenantCode}</span></span>{selectedTenant?.tenantCode === tenant.tenantCode ? <span className="grid size-7 place-items-center rounded-full bg-[#730321] text-white"><Check className="size-4" /></span> : null}</button>)}</div><Button disabled={!selectedTenant || state.isLoading} onClick={() => selectedTenant && submit(selectedTenant)} className="mt-7 h-12 w-full rounded-xl bg-[#730321] text-base font-black hover:bg-[#5d0219]">{state.isLoading ? "Signing in…" : <>Continue <ArrowRight className="ml-2 size-4" /></>}</Button></div> : <div><p className="mt-7 text-xs font-black uppercase tracking-[.18em] text-[#a07218] sm:mt-0">Collection agent</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-[#21171a]">Welcome back</h2><p className="mt-2 text-sm leading-6 text-[#7e7477]">Enter your staff credentials. You can choose the jewellery after we identify your account.</p><div className="mt-8 space-y-5"><div><Label htmlFor="agent-mobile" className="font-bold">Mobile number</Label><div className="relative mt-2"><Smartphone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9c8e91]" /><Input id="agent-mobile" inputMode="numeric" value={mobile} onChange={(event) => setMobile(event.target.value)} className="h-12 rounded-xl border-[#dfd3cd] pl-10" /></div></div><div><Label htmlFor="agent-password" className="font-bold">Password</Label><div className="relative mt-2"><LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9c8e91]" /><Input id="agent-password" type={showPassword ? "text" : "password"} inputMode="numeric" placeholder="Min. 4 digits" value={password} onChange={(event) => setPassword(sanitizePasswordPinInput(event.target.value))} onKeyDown={(event) => event.key === "Enter" && submit()} className="h-12 rounded-xl border-[#dfd3cd] px-10 tracking-[0.35em]" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8e8285]" aria-label="Toggle password visibility">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div></div><Button onClick={() => submit()} disabled={state.isLoading} className="mt-7 h-12 w-full rounded-xl bg-[#730321] text-base font-black hover:bg-[#5d0219]">{state.isLoading ? "Finding your account…" : <>Continue <ArrowRight className="ml-2 size-4" /></>}</Button><p className="mt-5 text-center text-xs leading-5 text-[#948a8c]">Only assigned collection agents can access this portal.</p></div>}</main>
    </div>
  </div>;
}
