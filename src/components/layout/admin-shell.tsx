"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { recordPortalNavigation } from "@/src/lib/portal-nav";
import { memo, useCallback, useEffect, useState } from "react";
import { useClientMounted } from "@/src/hooks/use-client-mounted";
import { realmHasStoredSession } from "@/src/lib/auth-token-storage";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Boxes,
  Gem,
  Megaphone,
  Settings2,
  ShoppingCart,
  Store,
  TrendingUp,
  Bell,
  Building2,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  Gift,
  HandCoins,
  Headphones,
  ImageIcon,
  Landmark,
  LayoutDashboard,
  Layers3,
  Menu,
  Package,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Coins,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Truck,
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
import { AssistantPanel } from "@/src/components/assistant/AssistantPanel";
import { GuidesMenu } from "@/src/components/tour/guides-menu";
import { TourProvider } from "@/src/components/tour/tour-provider";
import { WelcomeTourPrompt } from "@/src/components/tour/welcome-tour-prompt";
import { hasPermission } from "@/src/lib/permissions";
import { SecuritySessionsDialog } from "@/src/features/auth/security-sessions-dialog";
import { canAccessRoute } from "@/src/lib/permissions";
import { useEcommerceWorkspaceNavVisible } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { useDigitalMetalsWorkspaceNavVisible } from "@/src/features/digital-metals/digital-metals-admin-shared";
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
import { useNavBadges, type NavBadgeKey } from "@/src/hooks/use-nav-badges";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badgeKey?: NavBadgeKey;
  /** Only highlight on an exact path match (section overview pages). */
  exact?: boolean;
  /** Extra path prefixes that should highlight this item. */
  match?: string[];
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
  /**
   * Module gate: only shown when the tenant has the module. Module groups are
   * long, so they render as ONE expandable menu entry (icon + chevron) whose
   * pages are indented under it. Core groups are always open — no hidden pages.
   */
  module?: "ecommerce" | "digitalMetals";
  /** Icon for the module's parent row. */
  icon?: typeof LayoutDashboard;
};

const groups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard, exact: true }],
  },
  {
    id: "customers",
    label: "Customers & schemes",
    items: [
      { label: "Customers", href: "/customers", icon: UsersRound },
      { label: "Enrollments", href: "/enrollments", icon: ClipboardList },
      { label: "Dues & overdue", href: "/dues", icon: CalendarClock, badgeKey: "dues" },
      {
        label: "Maturity & redemption",
        href: "/maturity",
        icon: Gift,
        badgeKey: "openRedemptions",
      },
    ],
  },
  {
    id: "money",
    label: "Money",
    items: [
      { label: "Collections", href: "/collections", icon: HandCoins },
      {
        label: "Cash control",
        href: "/cash-control",
        icon: WalletCards,
        badgeKey: "cashHandovers",
      },
      { label: "Gold rates", href: "/gold-rates", icon: Scale },
    ],
  },
  {
    id: "store",
    label: "Online store",
    module: "ecommerce",
    icon: Store,
    items: [
      { label: "Overview", href: "/ecommerce", icon: Store, exact: true },
      { label: "Orders", href: "/ecommerce/orders", icon: ShoppingBag },
      { label: "Products", href: "/ecommerce/catalog", icon: Gem, match: ["/ecommerce/products"] },
      { label: "Categories", href: "/ecommerce/categories", icon: Layers3 },
      { label: "Inventory", href: "/ecommerce/inventory", icon: Package },
      { label: "Banners", href: "/ecommerce/banners", icon: ImageIcon },
      { label: "Push campaigns", href: "/ecommerce/campaigns", icon: Megaphone },
      { label: "Courier COD", href: "/ecommerce/courier-cod", icon: Truck },
      {
        label: "Payment exceptions",
        href: "/ecommerce/payment-exceptions",
        icon: AlertTriangle,
      },
      {
        label: "Store settings",
        href: "/ecommerce/gold-rates",
        icon: Settings2,
        match: ["/ecommerce/tax", "/ecommerce/fulfilment"],
      },
    ],
  },
  {
    id: "digital-gold",
    label: "Digital Gold & Silver",
    module: "digitalMetals",
    icon: Coins,
    items: [
      { label: "Overview", href: "/digital-metals", icon: Coins, exact: true },
      { label: "Purchases", href: "/digital-metals/purchases", icon: ShoppingCart },
      { label: "Sell approvals", href: "/digital-metals/sells", icon: HandCoins },
      { label: "Payouts", href: "/digital-metals/payouts", icon: Banknote },
      { label: "Bank verification", href: "/digital-metals/bank-verification", icon: BadgeCheck },
      { label: "Redemptions", href: "/digital-metals/redemption/orders", icon: Gift },
      { label: "Fulfilment queue", href: "/digital-metals/redemption/fulfilment", icon: PackageCheck },
      { label: "Coin & bar catalogue", href: "/digital-metals/redemption/catalogue", icon: Package },
      { label: "Procurement", href: "/digital-metals/procurement", icon: Boxes },
      { label: "Hedge book", href: "/digital-metals/hedge", icon: TrendingUp },
      { label: "Payment exceptions", href: "/digital-metals/payment-exceptions", icon: AlertTriangle },
      {
        label: "Rates & settings",
        href: "/digital-metals/rates",
        icon: Settings2,
        match: ["/digital-metals/settings", "/digital-metals/quote"],
      },
    ],
  },
  {
    id: "engagement",
    label: "Engage & insight",
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
    id: "config",
    label: "Setup",
    items: [
      { label: "Schemes", href: "/schemes", icon: Landmark },
      { label: "Staff & branches", href: "/staff-branches", icon: Building2 },
      { label: "Audit timeline", href: "/audit", icon: Activity },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function isNavItemActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const NAV_MODULES_STORAGE_KEY = "swarnagrow.navModulesOpen";

function readStoredModules(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(NAV_MODULES_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function NavBadge({ count, active }: { count: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold tabular-nums",
        active ? "bg-[#7b0a2b] text-white" : "bg-[#f3d9a4] text-[#4a0e1c]",
      )}
      aria-label={`${count} pending`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

const navLinkBase =
  "relative flex min-h-10 items-center rounded-xl text-[0.92rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3d9a4]/70";
const navLinkActive =
  "bg-[#fbeed2] font-semibold text-[#3d0c15] shadow-[0_6px_16px_-10px_rgba(226,200,143,0.9)]";
const navLinkIdle = "text-[#fbeff1] hover:bg-white/10 hover:text-white";

function NavLink({
  item,
  active,
  count,
  compact,
  nested,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  count?: number;
  compact: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={(event) => {
        // vinext Link soft-nav is broken on the Vercel/Nitro build; router.push still works.
        event.preventDefault();
        onNavigate?.();
        router.push(item.href);
      }}
      data-tour={`nav:${item.href}`}
      aria-current={active ? "page" : undefined}
      aria-label={compact ? item.label : undefined}
      className={cn(
        navLinkBase,
        compact ? "justify-center px-2" : nested ? "gap-2.5 py-1.5 pl-3 pr-2.5" : "gap-3 px-3",
        active ? navLinkActive : navLinkIdle,
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          nested ? "size-4" : "size-[1.1rem]",
          active ? "text-[#7b0a2b]" : "text-[#f3d9a4]",
        )}
        aria-hidden
      />
      {!compact ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {count ? <NavBadge count={count} active={active} /> : null}
        </>
      ) : count ? (
        <span className="absolute right-1 top-1 size-2 rounded-full bg-[#f3d9a4]" aria-hidden />
      ) : null}
    </Link>
  );
  if (!compact) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.label}
        {count ? ` · ${count}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

function Navigation({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const user = useAppSelector((s) => s.session.session?.user);
  const badges = useNavBadges();
  const ecommerceNav = useEcommerceWorkspaceNavVisible();
  const digitalMetalsNav = useDigitalMetalsWorkspaceNavVisible();
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() =>
    typeof window === "undefined" ? {} : readStoredModules(),
  );

  function toggleModule(id: string, open: boolean) {
    setOpenModules((prev) => {
      const next = { ...prev, [id]: open };
      try {
        window.localStorage.setItem(NAV_MODULES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode) — the toggle still works for this visit.
      }
      return next;
    });
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2 scrollbar-thin" aria-label="Main" data-tour="shell-nav">
      {groups.map((group, index) => {
        if (group.module === "digitalMetals" && !digitalMetalsNav.showDigitalMetalsNav) {
          return null;
        }
        if (group.module === "ecommerce" && !ecommerceNav.showEcommerceNav) {
          return null;
        }
        const items = group.items.filter((item) => canAccessRoute(item.href, user));
        if (!items.length) return null;
        const containsActive = items.some((item) => isNavItemActive(pathname, item));

        // ── Module (Online store / Digital Gold): one expandable entry ──
        if (group.module) {
          const ParentIcon = group.icon ?? Store;
          const total = items.reduce(
            (sum, item) => sum + (item.badgeKey ? badges[item.badgeKey] ?? 0 : 0),
            0,
          );
          if (compact) {
            const overview = items[0];
            return (
              <div key={group.id} className="mt-2 border-t border-white/10 pt-2">
                <NavLink
                  item={{ ...overview, label: group.label, icon: ParentIcon }}
                  active={containsActive}
                  count={total}
                  compact
                  onNavigate={onNavigate}
                />
              </div>
            );
          }
          const open = containsActive || Boolean(openModules[group.id]);
          const panelId = `nav-module-${group.id}`;
          return (
            <div key={group.id} className="mt-1">
              <button
                type="button"
                onClick={() => toggleModule(group.id, !open)}
                aria-expanded={open}
                aria-controls={panelId}
                className={cn(
                  navLinkBase,
                  "w-full gap-3 px-3 text-left",
                  containsActive && !open ? navLinkActive : navLinkIdle,
                  containsActive && open && "font-semibold text-white",
                )}
              >
                <ParentIcon
                  className={cn("size-[1.1rem] shrink-0", containsActive && !open ? "text-[#7b0a2b]" : "text-[#f3d9a4]")}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{group.label}</span>
                {!open && total ? <NavBadge count={total} /> : null}
                <ChevronDown
                  className={cn("size-4 shrink-0 opacity-80 transition-transform", !open && "-rotate-90")}
                  aria-hidden
                />
              </button>
              {open ? (
                <div
                  id={panelId}
                  className="mb-1 ml-[1.4rem] mt-0.5 space-y-0.5 border-l border-white/15 pl-2"
                >
                  {items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      nested
                      active={isNavItemActive(pathname, item)}
                      count={item.badgeKey ? badges[item.badgeKey] : undefined}
                      compact={false}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        }

        // ── Core group: always visible, plain (non-clickable) heading ──
        return (
          <div
            key={group.id}
            className={cn(index > 0 && (compact ? "mt-2 border-t border-white/10 pt-2" : "mt-4"))}
          >
            {!compact && index > 0 ? (
              <p className="mb-1 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#e9c98e]">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isNavItemActive(pathname, item)}
                  count={item.badgeKey ? badges[item.badgeKey] : undefined}
                  compact={compact}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function Sidebar({
  mobile = false,
  forceCompact = false,
  onNavigate,
}: {
  mobile?: boolean;
  /** Rail mode while Sidekick is open on narrower screens (not saved). */
  forceCompact?: boolean;
  onNavigate?: () => void;
}) {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((state) => state.ui.sidebarCollapsed);
  const collapsed = (stored || forceCompact) && !mobile;
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-[linear-gradient(180deg,#520d1c_0%,#430a16_55%,#370811_100%)] transition-[width] duration-200",
        collapsed ? "w-[4.75rem]" : "w-[17.25rem]",
      )}
    >
      <div
        className={cn(
          "flex h-[4.5rem] shrink-0 items-center border-b border-white/10",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <Link href="/" onClick={onNavigate} aria-label="Swarna Grow — dashboard" className="min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3d9a4]/70">
          <BrandMark compact={collapsed} />
        </Link>
      </div>
      <Navigation compact={collapsed} onNavigate={onNavigate} />
      {!mobile && !forceCompact ? (
        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            className={cn(
              "flex min-h-10 w-full items-center rounded-xl text-sm text-[#fbeff1] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3d9a4]/70",
              collapsed ? "justify-center" : "gap-3 px-3",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[1.1rem] text-[#f3d9a4]" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-[1.1rem] text-[#f3d9a4]" aria-hidden />
                <span>Collapse menu</span>
              </>
            )}
          </button>
        </div>
      ) : null}
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

function Topbar({
  onToggleAssistant,
  assistantOpen = false,
}: {
  onToggleAssistant?: () => void;
  assistantOpen?: boolean;
}) {
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
        ? (localStorage.getItem("swarnagrow.refreshToken") ?? undefined)
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
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[17.25rem] border-none bg-[#490b17] p-0"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>
                Open a section of the tenant admin portal
              </SheetDescription>
            </SheetHeader>
            <MemoSidebar mobile onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="relative max-w-[39.375rem] flex-1" data-tour="shell-search">
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
            className="h-11 cursor-text rounded-xl border-[#e3d5d0] bg-[#faf7f5] pl-12 pr-14 text-base text-[#28161a] shadow-sm placeholder:text-[#7f7375]"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-white px-2 py-1 text-xs text-muted-foreground sm:block"
            onClick={() => setSearchOpen(true)}
          >
            ⌘ K
          </button>
        </div>
        {onToggleAssistant ? (
          <Button
            type="button"
            variant="outline"
            onClick={onToggleAssistant}
            data-tour="shell-sidekick"
            aria-pressed={assistantOpen}
            className={cn(
              "h-11 shrink-0 gap-2 rounded-xl border-[#d9b6c0] font-semibold",
              assistantOpen
                ? "bg-[#730321] text-white hover:bg-[#5e0a20] hover:text-white"
                : "bg-[#fff6f8] text-[#730321] hover:bg-[#f9e9ee] hover:text-[#730321]",
            )}
            aria-label={assistantOpen ? "Close Sidekick" : "Open Sidekick analytics assistant"}
          >
            <Sparkles className="size-4" />
            <span className="hidden sm:inline">{assistantOpen ? "Close Sidekick" : "Ask Sidekick"}</span>
          </Button>
        ) : null}
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {canPickActingBranch ? (
            <Select
              value={branch}
              onValueChange={(value) => dispatch(setBranch(value))}
            >
              <SelectTrigger
                data-tour="shell-branch"
                className="h-11 w-[11rem] rounded-xl bg-[#faf7f5] text-[#28161a]"
                aria-label="Branch shown across the portal"
              >
                <Building2 className="size-4 text-[#7b0a2b]" aria-hidden />
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
        <GuidesMenu
          onAskSidekick={
            onToggleAssistant && !assistantOpen ? onToggleAssistant : undefined
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-11 gap-3 px-2 text-[#28161a]">
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

const SIDEKICK_WIDE_STORAGE_KEY = "swarnagrow.sidekickWide";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function AdminShellGrid({
  children,
  assistant,
  assistantOpen,
  onToggleAssistant,
}: {
  children: React.ReactNode;
  assistant?: React.ReactNode;
  assistantOpen: boolean;
  onToggleAssistant?: () => void;
}) {
  const storedCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const roomy = useMediaQuery("(min-width: 1680px)");
  // Give the page room: while Sidekick is docked on a typical laptop screen the
  // menu shrinks to icons, so cards don't get squeezed between two panels.
  const forceCompact = assistantOpen && !roomy;
  const collapsed = storedCollapsed || forceCompact;
  return (
    <div className="min-h-screen bg-[#fbf8f5]">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <MemoSidebar forceCompact={forceCompact} />
      </div>
      <div
        className={cn(
          "flex min-h-screen transition-[padding] duration-200",
          collapsed ? "lg:pl-[4.75rem]" : "lg:pl-[17.25rem]",
        )}
      >
        <div className="min-w-0 flex-1">
          <MemoTopbar
            onToggleAssistant={onToggleAssistant}
            assistantOpen={assistantOpen}
          />
          <main className="min-h-[calc(100vh-4.5rem)] p-4 md:p-6 lg:p-8">
            <div
              className={cn(
                "mx-auto space-y-7",
                assistantOpen ? "max-w-[90rem]" : "max-w-[105rem]",
              )}
            >
              {children}
            </div>
          </main>
        </div>
        {assistant}
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const toggleAssistant = useCallback(() => setAssistantOpen((v) => !v), []);
  const [assistantWide, setAssistantWide] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(SIDEKICK_WIDE_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggleAssistantWide = useCallback(() => {
    setAssistantWide((prev) => {
      try {
        localStorage.setItem(SIDEKICK_WIDE_STORAGE_KEY, prev ? "0" : "1");
      } catch {
        // per-visit only when storage is unavailable
      }
      return !prev;
    });
  }, []);
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

  const showAssistant = hasPermission(session?.user, "report.read");

  return (
    <TourProvider
      onTourStart={() => {
        // On phones and tablets Sidekick covers the page — step aside so the guide is visible.
        if (!window.matchMedia("(min-width: 1024px)").matches) setAssistantOpen(false);
      }}
    >
      <AdminShellGrid
        assistantOpen={showAssistant && assistantOpen}
        onToggleAssistant={showAssistant ? toggleAssistant : undefined}
        assistant={
          showAssistant ? (
            <AssistantPanel
              open={assistantOpen}
              onOpenChange={setAssistantOpen}
              wide={assistantWide}
              onToggleWide={toggleAssistantWide}
            />
          ) : null
        }
      >
        {children}
      </AdminShellGrid>
      <PaymentSuccessHost />
      <WelcomeTourPrompt />
    </TourProvider>
  );
}
