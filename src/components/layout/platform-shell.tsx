"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlatformSession } from "@/src/features/platform/use-platform-session";
import { clearPlatformAuthStorage } from "@/src/lib/auth-logout";
import {
  hasPlatformSession,
  readStoredRefreshToken,
} from "@/src/lib/auth-token-storage";
import { useAppDispatch } from "@/src/store/hooks";
import {
  platformApi,
  useGetPlatformDashboardQuery,
  usePlatformLogoutMutation,
} from "@/src/store/api/platform-api";
import { Building2, ChevronDown, CreditCard, FileClock, LayoutDashboard, Menu, Search, Settings2, ShieldCheck, Tags, Webhook } from "lucide-react";
import { BrandMark } from "@/src/components/brand/brand-mark";
import {
  PlatformGlobalSearchDialog,
  useGlobalSearchHotkey,
} from "@/src/components/layout/platform-global-search-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { sanitizeListSearchQueryInput } from "@/src/lib/list-date-range";
import { useClientMounted } from "@/src/hooks/use-client-mounted";

const nav = [
  { label: "Platform overview", href: "/platform", icon: LayoutDashboard },
  { label: "Jewellers", href: "/platform/tenants", icon: Building2 },
  { label: "Subscription plans", href: "/platform/plans", icon: Tags },
  { label: "Template registry", href: "/platform/templates", icon: CreditCard },
  { label: "Monitoring", href: "/platform/monitoring", icon: Webhook },
  { label: "Audit trail", href: "/platform/audit", icon: FileClock },
];

function PlatformNavigation({ close, monitoringCount }: { close?: () => void; monitoringCount: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
      <p className="mb-3 px-3 text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#c59a9f]">Platform operations</p>
      {nav.map(({ label, href, icon: Icon }) => {
        const active = href === "/platform" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={close}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.92rem] transition-colors",
              active ? "bg-[#f7e9c9] font-semibold text-[#49121f]" : "text-[#f6e8e9] hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-[1.15rem]" />
            <span>{label}</span>
            {label === "Monitoring" && monitoringCount > 0 ? (
              <span className="ml-auto rounded-full bg-[#a52b42] px-2 py-0.5 text-xs text-white">
                {monitoringCount > 99 ? "99+" : monitoringCount}
              </span>
            ) : null}
          </Link>
        );
      })}
      <p className="mb-3 mt-8 px-3 text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#c59a9f]">System</p>
      <Link
        href="/platform/settings"
        onClick={close}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.92rem]",
          pathname.startsWith("/platform/settings") ? "bg-[#f7e9c9] font-semibold text-[#49121f]" : "text-[#f6e8e9] hover:bg-white/10",
        )}
      >
        <Settings2 className="size-[1.15rem]" />
        Platform settings
      </Link>
    </nav>
  );
}

function PlatformSidebar({ close, monitoringCount }: { close?: () => void; monitoringCount: number }) {
  return (
    <aside className="flex h-full w-[17.5rem] flex-col bg-[#3e0812]">
      <div className="flex h-[5.5rem] items-center border-b border-white/15 px-4">
        <BrandMark />
      </div>
      <PlatformNavigation close={close} monitoringCount={monitoringCount} />
      <div className="border-t border-white/20 p-3">
        <div className="text-[0.65rem] uppercase tracking-[0.12em] text-[#c59a9f]">Console</div>
        <div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 text-sm text-white">
          <ShieldCheck className="size-4 text-[#e4b94d]" />
          Super admin
        </div>
      </div>
    </aside>
  );
}

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  useGlobalSearchHotkey(openSearch);

  const mounted = useClientMounted();
  const sessionReady = mounted && hasPlatformSession();
  const { user, initials } = usePlatformSession();
  const [logout] = usePlatformLogoutMutation();
  const dashboard = useGetPlatformDashboardQuery(undefined, {
    skip: !sessionReady,
  });
  const monitoringCount = useMemo(() => {
    if (!mounted) return 0;
    const webhook = dashboard.data?.alerts.find((a) => a.key === "WEBHOOK_FAILURES");
    return webhook?.count ?? 0;
  }, [dashboard.data?.alerts, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (!hasPlatformSession()) {
      router.replace(
        `/platform/login?next=${encodeURIComponent(pathname)}`,
      );
    }
  }, [mounted, pathname, router]);

  const signOut = async () => {
    const refreshToken = readStoredRefreshToken("platform") ?? undefined;
    try {
      await logout({ refreshToken }).unwrap();
    } catch {
      // Always clear local session even if revoke fails.
    }
    clearPlatformAuthStorage();
    dispatch(platformApi.util.resetApiState());
    router.push("/platform/login");
  };

  const displayName = user?.name ?? "Platform admin";
  const roleLabel = user?.role === "SUPER_ADMIN" ? "Platform super admin" : user?.role ?? "Platform user";

  if (!mounted || !sessionReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbf8f5]">
        <div className="size-10 animate-spin rounded-full border-4 border-[#ecd8dd] border-t-[#730321]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8f5] lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <PlatformGlobalSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        query={search}
        onQueryChange={setSearch}
      />
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <PlatformSidebar monitoringCount={monitoringCount} />
      </div>
      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-30 flex h-[5.125rem] items-center gap-3 border-b border-[#e8dcd8] bg-white/95 px-4 backdrop-blur md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[17.5rem] border-none bg-[#3e0812] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Platform navigation</SheetTitle>
                <SheetDescription>Open a platform section</SheetDescription>
              </SheetHeader>
              <PlatformSidebar close={() => setOpen(false)} monitoringCount={monitoringCount} />
            </SheetContent>
          </Sheet>
          <div className="relative max-w-[37rem] flex-1">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#7f7375]" />
            <Input
              value={search}
              onChange={(e) =>
                setSearch(sanitizeListSearchQueryInput(e.target.value))
              }
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearchOpen(true);
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                  e.preventDefault();
                  setSearchOpen(true);
                }
              }}
              placeholder="Search jewellers, owner, code or city…"
              className="h-12 cursor-text rounded-xl border-[#e3d5d0] bg-[#faf7f5] pl-12 pr-14 text-base shadow-sm"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-white px-2 py-1 text-xs text-muted-foreground sm:block"
              onClick={() => setSearchOpen(true)}
            >
              ⌘ K
            </button>
          </div>
          <div className="ml-auto hidden rounded-xl border bg-[#faf7f5] px-4 py-3 text-sm font-medium md:block">
            Production workspace
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-12 gap-3 px-2">
                <span className="grid size-10 place-items-center rounded-full bg-[#730321] font-bold text-white">{initials}</span>
                <span className="hidden text-left xl:block">
                  <span className="block font-bold leading-4">{displayName}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{roleLabel}</span>
                </span>
                <ChevronDown className="hidden size-4 xl:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Platform operations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/platform/settings")}>Security & settings</DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="min-h-[calc(100vh-5.125rem)] bg-[linear-gradient(#8f6c5c0a_1px,transparent_1px),linear-gradient(90deg,#8f6c5c0a_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] p-4 md:p-7 lg:p-8">
          <div className="mx-auto max-w-[105rem] space-y-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
