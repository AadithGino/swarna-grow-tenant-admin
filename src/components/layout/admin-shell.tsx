"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { recordPortalNavigation } from "@/src/lib/portal-nav";
import { memo, useCallback, useEffect, useState } from "react";
import { useClientMounted } from "@/src/hooks/use-client-mounted";
import { realmHasStoredSession } from "@/src/lib/auth-token-storage";
import {
  Activity,
  Bell,
  Building2,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  Gift,
  HandCoins,
  Headphones,
  Landmark,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Search,
  Settings,
  ShoppingBag,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BrandMark } from "@/src/components/brand/brand-mark";
import { PaymentSuccessHost } from "@/src/components/common/payment-success-host";
import { SecuritySessionsDialog } from "@/src/features/auth/security-sessions-dialog";
import { canAccessRoute } from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { clearSession } from "@/src/store/slices/session-slice";
import {
  useGetBranchesQuery,
  useLogoutMutation,
} from "@/src/store/api/admin-api";
import {
  setBranch,
  setGlobalSearch,
  toggleSidebar,
} from "@/src/store/slices/ui-slice";
import { cn } from "@/lib/utils";
import { sanitizeListSearchQueryInput } from "@/src/lib/list-date-range";
import {
  GlobalSearchDialog,
  useGlobalSearchHotkey,
} from "@/src/components/layout/global-search-dialog";
import {
  useNavBadges,
  type NavBadgeKey,
} from "@/src/hooks/use-nav-badges";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badgeKey?: NavBadgeKey;
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Customer operations",
    items: [
      { label: "Customers", href: "/customers", icon: UsersRound },
      { label: "Enrollments", href: "/enrollments", icon: ClipboardList },
      { label: "Dues", href: "/dues", icon: CalendarClock, badgeKey: "dues" },
    ],
  },
  {
    label: "Money & fulfilment",
    items: [
      { label: "Collections", href: "/collections", icon: HandCoins },
      {
        label: "Cash control",
        href: "/cash-control",
        icon: WalletCards,
        badgeKey: "cashHandovers",
      },
      {
        label: "Maturity & redemption",
        href: "/maturity",
        icon: Gift,
        badgeKey: "openRedemptions",
      },
      { label: "Gold rates", href: "/gold-rates", icon: Scale },
    ],
  },
  {
    label: "Engagement & insight",
    items: [
      {
        label: "Reminder centre",
        href: "/reminders",
        icon: Bell,
        badgeKey: "failedMessages",
      },
      { label: "Reports", href: "/reports", icon: FileBarChart },
      { label: "Support desk", href: "/support", icon: Headphones },
    ],
  },
  {
    label: "Online store",
    items: [
      { label: "Catalog", href: "/ecommerce", icon: ShoppingBag },
      { label: "Categories", href: "/ecommerce/categories", icon: ShoppingBag },
      {
        label: "Store gold rates",
        href: "/ecommerce/gold-rates",
        icon: Scale,
      },
      { label: "Tax settings", href: "/ecommerce/tax", icon: FileBarChart },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Schemes", href: "/schemes", icon: Landmark },
      { label: "Staff & branches", href: "/staff-branches", icon: Building2 },
      { label: "Audit timeline", href: "/audit", icon: Activity },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function Navigation({
  compact = false,
  mobile = false,
}: {
  compact?: boolean;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.session.session?.user);
  const badges = useNavBadges();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
      {groups.map((group) => {
        const items = group.items.filter((item) =>
          canAccessRoute(item.href, user),
        );
        if (!items.length) return null;
        return (
        <div key={group.label} className="mb-5">
          {!compact && (
            <div className="mb-2 px-3 text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#c59a9f]">
              {group.label}
            </div>
          )}
          <div className="space-y-1">
            {items.map(({ label, href, icon: Icon, badgeKey }) => {
              const count = badgeKey ? badges[badgeKey] : undefined;
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              const link = (
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-11 items-center rounded-xl text-[0.92rem] transition-colors",
                    compact ? "justify-center px-2" : "gap-3 px-3",
                    active
                      ? "bg-[#f7e9c9] font-semibold text-[#49121f]"
                      : "text-[#f6e8e9] hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="size-[1.15rem] shrink-0" />
                  {!compact && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {count ? (
                        <span
                          className={cn(
                            "grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 text-xs",
                            active
                              ? "bg-[#730321] text-white"
                              : "bg-[#81283d] text-[#ffe9b5]",
                          )}
                        >
                          {count}
                        </span>
                      ) : null}
                    </>
                  )}
                </Link>
              );
              return compact && !mobile ? (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={href}>{link}</div>
              );
            })}
          </div>
        </div>
        );
      })}
    </nav>
  );
}

function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const dispatch = useAppDispatch();
  const collapsed =
    useAppSelector((state) => state.ui.sidebarCollapsed) && !mobile;
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-[#490b17] transition-[width] duration-200",
        collapsed ? "w-[5.125rem]" : "w-[17.5rem]",
      )}
    >
      <div
        className={cn(
          "flex h-[5.5rem] items-center border-b border-white/15 px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <BrandMark compact={collapsed} />
        {!collapsed && !mobile && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => dispatch(toggleSidebar())}
          >
            <PanelLeftClose />
            <span className="sr-only">Collapse sidebar</span>
          </Button>
        )}
      </div>
      {collapsed && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="mx-auto mt-3 text-white hover:bg-white/10 hover:text-white"
          onClick={() => dispatch(toggleSidebar())}
        >
          <PanelLeftOpen />
          <span className="sr-only">Expand sidebar</span>
        </Button>
      )}
      <Navigation compact={collapsed} mobile={mobile} />
    </aside>
  );
}

const MemoSidebar = memo(Sidebar);

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatRoleLabel(role?: string) {
  if (!role) return "Staff";
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Topbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const session = useAppSelector((state) => state.session.session);
  const user = session?.user;
  const userName = user?.name?.trim() || "User";
  const tenantName = session?.tenant?.displayName?.trim() || "";
  const initials = userInitials(userName);
  const roleLabel = formatRoleLabel(user?.role);
  const branch = useAppSelector((state) => state.ui.branchId);
  const canPickActingBranch =
    session?.capabilities?.multiBranch !== false &&
    (session?.user?.role === "TENANT_OWNER" ||
      session?.user?.role === "TENANT_ADMIN");
  const search = useAppSelector((state) => state.ui.globalSearch);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  useGlobalSearchHotkey(openSearch);
  const [logout] = useLogoutMutation();
  const { data: branchesData } = useGetBranchesQuery({ limit: 100 });
  const branchOptions = branchesData?.items ?? [];

  async function handleSignOut() {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("swarnagrow.refreshToken") ?? undefined
        : undefined;
    try {
      await logout({ refreshToken }).unwrap();
    } catch {
      // Always clear local session even if the API call fails.
    }
    dispatch(clearSession());
    router.push("/login");
  }

  return (
    <>
      <GlobalSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        query={search}
        onQueryChange={(value) =>
          dispatch(setGlobalSearch(sanitizeListSearchQueryInput(value)))
        }
      />
      <header className="sticky top-0 z-30 flex h-[5.125rem] items-center gap-3 border-b border-[#e8dcd8] bg-white/95 px-4 backdrop-blur md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[17.8125rem] border-none bg-[#490b17] p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>
              Open a section of the tenant admin portal
            </SheetDescription>
          </SheetHeader>
          <MemoSidebar mobile />
        </SheetContent>
      </Sheet>
      <div className="relative max-w-[39.375rem] flex-1">
        <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#7f7375]" />
        <Input
          value={search}
          onChange={(e) =>
            dispatch(
              setGlobalSearch(sanitizeListSearchQueryInput(e.target.value)),
            )
          }
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setSearchOpen(true);
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
              e.preventDefault();
              setSearchOpen(true);
            }
          }}
          placeholder="Search customers, phone, enrollment…"
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
      <div className="ml-auto hidden items-center gap-2 md:flex">
        <Select defaultValue="admin">
          <SelectTrigger className="h-12 w-[11.875rem] rounded-xl bg-[#faf7f5]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Jewellery admin</SelectItem>
          </SelectContent>
        </Select>
        {canPickActingBranch ? (
          <Select
            value={branch}
            onValueChange={(value) => dispatch(setBranch(value))}
          >
            <SelectTrigger className="h-12 w-[10.625rem] rounded-xl bg-[#faf7f5]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All branches</SelectItem>
              {branchOptions.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-12 gap-3 px-2">
            <span className="grid size-10 place-items-center rounded-full bg-[#730321] font-bold text-white">
              {initials}
            </span>
            <span className="hidden text-left xl:block">
              <span className="block font-bold leading-4">{userName}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {tenantName || "Tenant admin"}
              </span>
            </span>
            <ChevronDown className="hidden size-4 xl:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {userName}
            <br />
            <span className="font-normal text-muted-foreground">
              {roleLabel}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <UserRound />
            Profile & settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSecurityOpen(true)}>
            <ShieldCheck />
            Security & sessions
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void handleSignOut()}>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SecuritySessionsDialog
        open={securityOpen}
        onOpenChange={setSecurityOpen}
      />
    </header>
    </>
  );
}

const MemoTopbar = memo(Topbar);

function AdminShellGrid({ children }: { children: React.ReactNode }) {
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  return (
    <div
      className={cn(
        "min-h-screen bg-[#fbf8f5] lg:grid",
        collapsed
          ? "lg:grid-cols-[5.125rem_minmax(0,1fr)]"
          : "lg:grid-cols-[17.5rem_minmax(0,1fr)]",
      )}
    >
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <MemoSidebar />
      </div>
      <div className="min-w-0 lg:col-start-2">
        <MemoTopbar />
        <main className="min-h-[calc(100vh-5.125rem)] bg-[linear-gradient(#8f6c5c0a_1px,transparent_1px),linear-gradient(90deg,#8f6c5c0a_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] p-4 md:p-7 lg:p-8">
          <div className="mx-auto max-w-[105rem] space-y-7">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useClientMounted();
  const hydrated = useAppSelector((state) => state.session.hydrated);
  const session = useAppSelector((state) => state.session.session);
  useEffect(() => {
    if (!mounted || !hydrated) return;
    const hasTokens = realmHasStoredSession("tenant");
    if (!hasTokens || !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
    }
  }, [mounted, hydrated, session, pathname, router]);

  useEffect(() => {
    if (pathname) recordPortalNavigation(pathname);
  }, [pathname]);

  const sessionReady =
    mounted && hydrated && Boolean(session) && realmHasStoredSession("tenant");

  if (!sessionReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbf8f5]">
        <div className="size-10 animate-spin rounded-full border-4 border-[#ecd8dd] border-t-[#730321]" />
      </div>
    );
  }

  return (
    <>
      <AdminShellGrid>{children}</AdminShellGrid>
      <PaymentSuccessHost />
    </>
  );
}
