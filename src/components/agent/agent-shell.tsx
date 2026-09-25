"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, History, Home, LogOut, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { clearAgentSession, hydrateAgentSession } from "@/src/store/slices/agent-session-slice";
import { useAgentLogoutMutation, useGetAgentMeQuery } from "@/src/store/api/agent-api";
import { agentSignInRedirectPath } from "@/src/lib/agent-tenant";

const nav = [
  { href: "/agent", label: "Home", icon: Home, exact: true },
  { href: "/agent/collect", label: "Collect", icon: Search, exact: false },
  { href: "/agent/history", label: "History", icon: History, exact: false },
  { href: "/agent/report", label: "Report", icon: BarChart3, exact: false },
  { href: "/agent/account", label: "Account", icon: UserRound, exact: false },
] as const;

export function AgentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { session, hydrated } = useAppSelector((state) => state.agentSession);
  const [logout] = useAgentLogoutMutation();
  const { data: me } = useGetAgentMeQuery(undefined, { skip: !session });

  useEffect(() => { if (!hydrated) dispatch(hydrateAgentSession()); }, [dispatch, hydrated]);
  useEffect(() => {
    if (hydrated && !session) {
      router.replace(agentSignInRedirectPath(session));
    }
  }, [hydrated, router, session]);
  const active = (item: (typeof nav)[number]) => item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const signOut = async () => {
    if (session?.refreshToken) await logout({ refreshToken: session.refreshToken }).catch(() => undefined);
    dispatch(clearAgentSession());
    router.replace(agentSignInRedirectPath(session));
  };

  if (!hydrated || !session) return <div className="agent-theme grid min-h-screen place-items-center"><div className="size-10 animate-spin rounded-full border-4 border-[#ecd8dd] border-t-[#730321]" /></div>;

  const tenantLabel = me?.tenantName ?? session.selectedTenant.displayName;
  const branchLabel = me?.branchName ?? session.user.branchName ?? "Assigned branch";

  return <div className="agent-theme min-h-screen text-[#21171a]">
    <header className="sticky top-0 z-40 border-b border-[#e8ded8] bg-[#fffefa]/95 backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-[1180px] items-center gap-3 px-4 sm:px-6"><Link href="/agent" className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#730321] text-lg font-black text-white shadow-sm">S</span><span className="min-w-0"><span className="block truncate text-sm font-black tracking-wide text-[#730321]">{tenantLabel}</span><span className="block truncate text-[.7rem] font-semibold text-[#8c8184]">{branchLabel} · Collection desk</span></span></Link><nav className="ml-auto hidden items-center gap-1 lg:flex">{nav.map((item) => <Link key={item.href} href={item.href} className={cn("rounded-xl px-4 py-2.5 text-sm font-bold", active(item) ? "bg-[#f7edf0] text-[#730321]" : "text-[#746b6e] hover:bg-[#faf5f1]")}>{item.label}</Link>)}</nav><button type="button" onClick={signOut} className="ml-auto grid size-10 place-items-center rounded-full border border-[#e8ded8] bg-white text-[#6d6265] lg:ml-2" aria-label="Sign out"><LogOut className="size-[1.1rem]" /></button></div></header>
    <main className="mx-auto min-h-[calc(100vh-72px)] max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-12">{children}</main>
    <nav className="agent-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[#e8ded8] bg-[#fffefa]/97 px-2 pt-2 shadow-[0_-12px_32px_rgba(63,28,38,.08)] backdrop-blur-xl lg:hidden"><div className="mx-auto grid max-w-lg grid-cols-5">{nav.map((item) => <Link key={item.href} href={item.href} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[.66rem] font-bold", active(item) ? "text-[#730321]" : "text-[#857b7e]")}><span className={cn("grid size-9 place-items-center rounded-full", active(item) && "bg-[#fff0c8]")}><item.icon className="size-5" strokeWidth={active(item) ? 2.4 : 2} /></span><span>{item.label}</span></Link>)}</div></nav>
  </div>;
}
