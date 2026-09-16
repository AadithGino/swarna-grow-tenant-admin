"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  IndianRupee,
  MapPin,
  MonitorSmartphone,
  Phone,
  Search,
  ShieldCheck,
  Store,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  formatRoleLabel,
  MoneyPair,
} from "@/src/features/access/access-detail-parts";
import {
  groupStaffPermissions,
  permissionLabel,
  permissionSummaryStats,
} from "@/src/lib/permission-catalog";
import { cn } from "@/lib/utils";
import { sanitizeListSearchQueryInput } from "@/src/lib/list-date-range";

function SummaryPill({
  icon: Icon,
  label,
  value,
  accent = "wine",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  accent?: "wine" | "gold" | "green" | "cream";
}) {
  const tones = {
    wine: "from-[#f7ecee] to-white border-[#eaded9]",
    gold: "from-[#fff8e8] to-white border-[#eadbb5]",
    green: "from-emerald-50 to-white border-emerald-200",
    cream: "from-[#faf6f2] to-white border-[#e8ddd4]",
  };
  const iconTone = {
    wine: "text-[#7b0a2b]",
    gold: "text-[#bb6200]",
    green: "text-emerald-700",
    cream: "text-[#6b5344]",
  };
  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br p-4 shadow-[0_2px_5px_rgb(67_15_25/3%)]",
        tones[accent],
      )}
    >
      <div className={cn("flex items-center gap-2", iconTone[accent])}>
        <Icon className="size-4 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-[0.95rem] font-bold leading-snug text-[#241316]">
        {value}
      </p>
    </div>
  );
}

export function StaffDetailHero({
  name,
  initials,
  role,
  scope,
  mobile,
  branchName,
  branchCode,
  branchId,
  isActive,
  mustChangePassword,
  lastLoginLabel,
}: {
  name: string;
  initials: string;
  role: string;
  scope: string;
  mobile: string;
  branchName?: string | null;
  branchCode?: string | null;
  branchId?: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginLabel: string;
}) {
  const roleLabel = formatRoleLabel(role);
  const scopeCopy =
    scope === "TENANT"
      ? "Whole tenant access"
      : "Single branch access";

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e4d7d2] bg-white shadow-[0_2px_5px_rgb(67_15_25/3%)]">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-[#eaded9] bg-gradient-to-br from-[#730321] via-[#8a1030] to-[#5c0218] px-6 py-8 text-white lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-4">
            <div
              className="grid size-16 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-xl font-extrabold tracking-tight"
              aria-hidden
            >
              {initials.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">
                Staff member
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight md:text-[1.65rem]">
                {name}
              </h2>
              <p className="mt-2 text-sm text-white/85">
                {roleLabel} · {scopeCopy}
              </p>
              <p className="mt-1 font-mono text-sm text-white/75">{mobile}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <StatusBadge status={isActive ? "ACTIVE" : "SUSPENDED"} />
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
              {roleLabel}
            </Badge>
            {branchName ? (
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                <Store className="size-3" />
                {branchName}
                {branchCode ? ` · ${branchCode}` : ""}
              </Badge>
            ) : (
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                All branches
              </Badge>
            )}
            {mustChangePassword ? (
              <Badge className="border-amber-300/40 bg-amber-500/25 text-amber-50">
                Password change required
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryPill
              icon={MonitorSmartphone}
              label="Last login"
              value={lastLoginLabel}
              accent="cream"
            />
            <SummaryPill
              icon={Building2}
              label="Home branch"
              value={
                branchName && branchId ? (
                  <Link
                    href={`/staff-branches/branches/${branchId}`}
                    className="text-[#730321] hover:underline"
                  >
                    {branchName}
                  </Link>
                ) : (
                  "Tenant-wide"
                )
              }
              accent="wine"
            />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Staff sign in with mobile and password. Permissions control what
            they can do in the staff app and this admin portal.
          </p>
        </div>
      </div>
    </section>
  );
}

export function BranchDetailHero({
  name,
  code,
  city,
  line1,
  pincode,
  contactNumber,
  isActive,
  staffCount,
  activeCustomers,
}: {
  name: string;
  code: string;
  city: string;
  line1: string;
  pincode: string;
  contactNumber: string;
  isActive: boolean;
  staffCount: number;
  activeCustomers: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e4d7d2] bg-white shadow-[0_2px_5px_rgb(67_15_25/3%)]">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-[#eaded9] bg-gradient-to-br from-[#2d191d] via-[#3d2429] to-[#1a1014] px-6 py-8 text-white lg:border-b-0 lg:border-r">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
            Showroom branch
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-[1.65rem]">
            {name}
          </h2>
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-white/85">
            <MapPin className="mt-0.5 size-4 shrink-0 opacity-80" />
            <span>
              {[line1, city, pincode].filter((p) => p && p !== "—").length
                ? [line1 !== "—" ? line1 : null, city !== "—" ? city : null]
                    .filter(Boolean)
                    .join(", ") +
                  (pincode && pincode !== "—" ? ` — ${pincode}` : "")
                : "Address not set — edit branch to add showroom details"}
            </span>
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
            <Phone className="size-4 shrink-0" />
            {contactNumber && contactNumber !== "—"
              ? contactNumber
              : "No contact number on file"}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <StatusBadge status={isActive ? "ACTIVE" : "INACTIVE"} />
            <Badge className="border-white/20 bg-white/15 font-mono text-white hover:bg-white/20">
              {code}
            </Badge>
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
              Code fixed on receipts & passbooks
            </Badge>
          </div>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <SummaryPill
            icon={UsersRound}
            label="Customers"
            value={activeCustomers.toLocaleString("en-IN")}
            accent="wine"
          />
          <SummaryPill
            icon={UsersRound}
            label="Staff"
            value={staffCount}
            accent="gold"
          />
          <SummaryPill
            icon={Store}
            label="Branch code"
            value={code}
            accent="green"
          />
        </div>
      </div>
    </section>
  );
}

export function CashHandoverAlert({
  amountDisplay,
  pendingHandovers,
  staffName,
}: {
  amountDisplay: string;
  pendingHandovers: number;
  staffName: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-[#fff8e8] px-5 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Wallet className="size-4 text-[#805817]" />
        <span className="font-semibold text-[#805817]">Cash awaiting handover</span>
      </div>
      <p className="mt-2 font-medium text-[#2d191d]">
        {staffName} is holding {amountDisplay} in cash.
        {pendingHandovers > 0
          ? ` ${pendingHandovers} handover${pendingHandovers > 1 ? "s" : ""} pending settlement.`
          : " Settle in cash control before deactivating this account."}
      </p>
      <Button variant="outline" size="sm" className="mt-3" asChild>
        <Link href="/cash-control">Open cash control</Link>
      </Button>
    </div>
  );
}

export function BranchDeactivationAlert({
  activeSchemes,
  activeStaff,
}: {
  activeSchemes: number;
  activeStaff: number;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm">
      <p className="font-semibold text-red-900">Deactivation blocked</p>
      <p className="mt-1 text-red-800/90">
        This branch has {activeSchemes.toLocaleString("en-IN")} active schemes
        and {activeStaff} staff assigned. Close or transfer schemes before
        turning the branch off.
      </p>
    </div>
  );
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export function PerformanceHistoryTable({
  title,
  description,
  emptyMessage,
  headers,
  rows,
  footer,
  isLoading,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  headers: string[];
  rows: React.ReactNode[][];
  footer?: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <Surface title={title} description={description}>
      {isLoading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[#eaded9] text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {headers.map((h) => (
                  <th key={h} className="px-5 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, i) => (
                <tr
                  key={i}
                  className="border-b border-[#f3ece8] last:border-0"
                >
                  {cells.map((cell, j) => (
                    <td key={j} className="px-5 py-3 align-top text-[#1a1014]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer}
    </Surface>
  );
}

export type StaffPerformanceMoneyBlock = {
  amountDisplay?: string;
  amountPaise?: number;
};

export function StaffPerformanceSummaryBlock({
  rangeLabel,
  collection,
  enrolments,
  customersServed,
  paymentsCount,
  cashInHand,
  cash,
  staffId,
  cashControlHref: cashControlHrefProp,
}: {
  rangeLabel: string;
  collection?: StaffPerformanceMoneyBlock;
  enrolments: number;
  customersServed: number;
  paymentsCount: number;
  cashInHand?: StaffPerformanceMoneyBlock;
  cash?: {
    cashPendingAcceptance?: StaffPerformanceMoneyBlock;
    cashCollected?: StaffPerformanceMoneyBlock;
    handedOver?: StaffPerformanceMoneyBlock;
    lastHandoverAt?: string | null;
  };
  staffId?: string;
  cashControlHref?: string;
}) {
  const cashControlHref =
    cashControlHrefProp ??
    (staffId
      ? `/cash-control?staffId=${encodeURIComponent(staffId)}`
      : "/cash-control");
  return (
    <Surface
      title="Summary for selected range"
      description={rangeLabel}
    >
      <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryPill
          icon={IndianRupee}
          label="Collections"
          value={<MoneyPair block={collection} fallback="₹0" />}
          accent="wine"
        />
        <SummaryPill
          icon={ShieldCheck}
          label="Enrolments"
          value={enrolments}
          accent="cream"
        />
        <SummaryPill
          icon={UsersRound}
          label="Customers served"
          value={customersServed}
          accent="green"
        />
        <SummaryPill
          icon={Wallet}
          label="Payment count"
          value={paymentsCount}
          accent="gold"
        />
      </div>
      <div className="grid gap-4 border-t border-[#eaded9] p-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#eadbb5] bg-[#fffdf8] p-4">
          <p className="text-sm font-medium text-[#805817]">Cash in hand (live)</p>
          <p className="mt-1 text-2xl font-bold">
            <MoneyPair block={cashInHand} fallback="₹0" />
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Pending acceptance{" "}
            <MoneyPair block={cash?.cashPendingAcceptance} fallback="₹0" />
          </p>
        </div>
        <div className="rounded-xl border border-[#e4d7d2] bg-[#faf7f5] p-4 text-sm">
          <p className="font-medium text-[#5c3d42]">Cash ledger (all time)</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li className="flex justify-between gap-2">
              <span>Cash collected</span>
              <span className="font-semibold text-[#1a1014]">
                <MoneyPair block={cash?.cashCollected} fallback="₹0" />
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Handed over</span>
              <span className="font-semibold text-[#1a1014]">
                <MoneyPair block={cash?.handedOver} fallback="₹0" />
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Last handover</span>
              <span className="font-semibold text-[#1a1014]">
                {formatWhen(cash?.lastHandoverAt)}
              </span>
            </li>
          </ul>
          <Button variant="secondary" size="sm" className="mt-4" asChild>
            <Link href={cashControlHref}>Open cash control</Link>
          </Button>
        </div>
      </div>
    </Surface>
  );
}

type PerformanceSummaryExtras = {
  averageTicket?: StaffPerformanceMoneyBlock;
  collectionByMode?: Array<{
    mode?: string;
    count?: number;
    amount?: StaffPerformanceMoneyBlock;
  }>;
  collectionTrend?: Array<{
    date?: string;
    count?: number;
    amount?: StaffPerformanceMoneyBlock;
  }>;
  redemptionsCompleted?: {
    count?: number;
    settlementTotal?: StaffPerformanceMoneyBlock;
  };
  handoversInPeriod?: {
    submitted?: number;
    accepted?: number;
    pending?: number;
    rejected?: number;
  };
  topCollectors?: Array<{
    staff?: { id?: string; name?: string };
    paymentsCount?: number;
    collectionTotal?: StaffPerformanceMoneyBlock;
  }>;
};

export function PerformanceExtendedInsights({
  summary: summaryInput,
  variant = "staff",
}: {
  summary?: PerformanceSummaryExtras | Record<string, unknown> | null;
  variant?: "staff" | "branch";
}) {
  const summary = summaryInput as PerformanceSummaryExtras | null | undefined;
  if (!summary) return null;
  const modes = summary.collectionByMode ?? [];
  const trend = summary.collectionTrend ?? [];
  const redemptions = summary.redemptionsCompleted;
  const handovers = summary.handoversInPeriod;
  const top = summary.topCollectors ?? [];
  const hasInsights =
    summary.averageTicket ||
    modes.length > 0 ||
    trend.length > 0 ||
    (redemptions?.count ?? 0) > 0 ||
    handovers ||
    (variant === "branch" && top.length > 0);
  if (!hasInsights) return null;

  return (
    <div className="space-y-5">
      <Surface
        title="Performance insights"
        description="Breakdown for the selected date range"
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryPill
            icon={IndianRupee}
            label="Avg. ticket"
            value={
              <MoneyPair block={summary.averageTicket} fallback="₹0" />
            }
            accent="cream"
          />
          <SummaryPill
            icon={ShieldCheck}
            label="Redemptions completed"
            value={redemptions?.count ?? 0}
            accent="green"
          />
          <SummaryPill
            icon={Wallet}
            label="Settlement handed out"
            value={
              <MoneyPair
                block={redemptions?.settlementTotal}
                fallback="₹0"
              />
            }
            accent="wine"
          />
          {handovers ? (
            <SummaryPill
              icon={UsersRound}
              label="Cash handovers"
              value={`${handovers.submitted ?? 0} submitted`}
              accent="gold"
            />
          ) : null}
        </div>
        {handovers ? (
          <p className="border-t border-[#eaded9] px-6 pb-4 text-xs text-muted-foreground">
            Handovers in range: {handovers.accepted ?? 0} accepted ·{" "}
            {handovers.rejected ?? 0} rejected · {handovers.pending ?? 0}{" "}
            pending (live)
          </p>
        ) : null}
      </Surface>

      {modes.length > 0 ? (
        <Surface title="Collections by mode" description="Cash vs digital split">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b bg-[#faf7f5] text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Mode</th>
                  <th className="px-5 py-3">Payments</th>
                  <th className="px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {modes.map((row) => (
                  <tr
                    key={String(row.mode)}
                    className="border-b border-[#f3ece8] last:border-0"
                  >
                    <td className="px-5 py-3 font-medium">
                      {String(row.mode ?? "—").replaceAll("_", " ")}
                    </td>
                    <td className="px-5 py-3 tabular-nums">{row.count ?? 0}</td>
                    <td className="px-5 py-3 font-semibold">
                      <MoneyPair block={row.amount} fallback="₹0" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      ) : null}

      {variant === "branch" && top.length > 0 ? (
        <Surface
          title="Top collectors"
          description="Staff ranked by successful collections in this range"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="border-b bg-[#faf7f5] text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Staff</th>
                  <th className="px-5 py-3">Payments</th>
                  <th className="px-5 py-3">Collected</th>
                </tr>
              </thead>
              <tbody>
                {top.map((row, index) => (
                  <tr
                    key={row.staff?.id ?? index}
                    className="border-b border-[#f3ece8] last:border-0"
                  >
                    <td className="px-5 py-3">
                      {row.staff?.id ? (
                        <Link
                          href={`/staff-branches/staff/${row.staff.id}`}
                          className="font-medium text-[#730321] hover:underline"
                        >
                          {row.staff.name ?? "Staff"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {row.paymentsCount ?? 0}
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      <MoneyPair block={row.collectionTotal} fallback="₹0" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      ) : null}

      {trend.length > 0 ? (
        <Surface title="Daily collection trend" description="IST calendar days">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b bg-[#faf7f5] text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Payments</th>
                  <th className="px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((row) => (
                  <tr
                    key={String(row.date)}
                    className="border-b border-[#f3ece8] last:border-0"
                  >
                    <td className="px-5 py-3 font-medium">{row.date ?? "—"}</td>
                    <td className="px-5 py-3 tabular-nums">{row.count ?? 0}</td>
                    <td className="px-5 py-3 font-semibold">
                      <MoneyPair block={row.amount} fallback="₹0" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      ) : null}
    </div>
  );
}

export function StaffAccessSidebar({
  permissions,
  activeSessions,
  pendingHandovers,
}: {
  permissions: string[];
  activeSessions: number;
  pendingHandovers: number;
}) {
  const accessStats = permissionSummaryStats(permissions);
  const accessGroups = groupStaffPermissions(permissions);

  return (
    <div className="space-y-5">
      <Surface title="Sessions" description="Active sign-ins across devices">
        <div className="p-5">
          <p className="text-3xl font-extrabold text-[#1a1014]">
            {activeSessions}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeSessions === 1 ? "Active session" : "Active sessions"}
            {pendingHandovers > 0
              ? ` · ${pendingHandovers} pending handover`
              : ""}
          </p>
        </div>
      </Surface>
      <Surface
        title="Access scope"
        description={
          accessStats.fullAccess
            ? "Full tenant access"
            : `${accessStats.areaCount} areas · ${accessStats.capabilityCount} capabilities`
        }
      >
        <div className="p-5">
          {accessStats.fullAccess ? (
            <p className="text-sm leading-relaxed text-[#1a1014]">
              This role can use every admin and staff capability. Open the{" "}
              <span className="font-semibold">Permissions</span> tab for the
              full checklist.
            </p>
          ) : (
            <>
              <ul className="space-y-2.5">
                {accessGroups.slice(0, 7).map((group) => (
                    <li
                      key={group.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {group.label}
                      </span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 tabular-nums font-semibold"
                      >
                        {group.permissions.length}
                      </Badge>
                    </li>
                  ))}
              </ul>
              {accessGroups.length > 7 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  +{accessGroups.length - 7} more areas on the Permissions tab
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  See the Permissions tab for labels and search.
                </p>
              )}
            </>
          )}
        </div>
      </Surface>
    </div>
  );
}

export function BranchStatsSidebar({
  collection,
  pendingCash,
  activeSchemes,
  canDeactivate,
}: {
  collection?: { amountDisplay?: string };
  pendingCash?: { amountDisplay?: string };
  activeSchemes: number;
  canDeactivate: boolean;
}) {
  return (
    <Surface title="Branch health" description="Operational snapshot">
      <ul className="divide-y divide-[#eaded9]">
        {[
          ["Collection this month", <MoneyPair key="c" block={collection} />],
          ["Cash with staff", <MoneyPair key="p" block={pendingCash} />],
          ["Active schemes", activeSchemes.toLocaleString("en-IN")],
          [
            "Can deactivate",
            canDeactivate ? (
              <span className="text-emerald-700">Yes</span>
            ) : (
              <span className="text-amber-800">Blocked — active schemes</span>
            ),
          ],
        ].map(([label, value]) => (
          <li
            key={String(label)}
            className="flex items-center justify-between gap-4 px-5 py-4 text-sm"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-[#1a1014]">{value}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

export function OverviewFieldGrid({
  rows,
}: {
  rows: [string, React.ReactNode][];
}) {
  return (
    <dl className="grid min-w-0 gap-x-8 gap-y-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="mt-1 min-w-0 break-words font-semibold text-[#1a1014]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function StaffPermissionsSurface({
  permissions,
  role,
}: {
  permissions: string[];
  role?: string;
}) {
  const [query, setQuery] = useState("");
  const stats = permissionSummaryStats(permissions);
  const groups = useMemo(
    () => groupStaffPermissions(permissions),
    [permissions],
  );
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (key) =>
            key.toLowerCase().includes(q) ||
            permissionLabel(key).toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [groups, query]);

  return (
    <div className="space-y-5">
      {stats.fullAccess ? (
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 sm:items-center">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-emerald-950">Full tenant access</p>
            <p className="mt-0.5 text-sm text-emerald-900/80">
              Every capability below is granted via the wildcard{" "}
              <code className="rounded bg-emerald-100/80 px-1 font-mono text-xs">
                *
              </code>{" "}
              permission.
            </p>
          </div>
        </div>
      ) : null}

      <Surface
        title="Capabilities"
        description={
          role
            ? `From the ${formatRoleLabel(role)} role · ${stats.capabilityCount} granted`
            : `${stats.capabilityCount} actions granted across ${stats.areaCount} areas`
        }
      >
        <div className="border-b border-[#eaded9] p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) =>
                setQuery(sanitizeListSearchQueryInput(e.target.value))
              }
              placeholder="Search by name or key…"
              className="h-10 pl-9"
            />
          </div>
        </div>

        {!permissions.length ? (
          <p className="p-6 text-sm text-muted-foreground">
            No permissions are assigned to this account.
          </p>
        ) : filteredGroups.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No capabilities match &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : (
          <div className="grid gap-4 p-6 lg:grid-cols-2">
            {filteredGroups.map((group) => (
              <section
                key={group.id}
                className="rounded-xl border border-[#eaded9] bg-[#faf8f6]"
              >
                <header className="flex items-center justify-between gap-2 border-b border-[#eaded9] px-4 py-3">
                  <h3 className="text-sm font-bold text-[#5c3d42]">
                    {group.label}
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {group.permissions.length}
                  </span>
                </header>
                <ul className="divide-y divide-[#f0e8e4]">
                  {group.permissions.map((key) => (
                    <li
                      key={key}
                      className="flex gap-3 px-4 py-3 text-sm leading-snug"
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-[#1a1014]">
                          {permissionLabel(key)}
                        </p>
                        <p className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">
                          {key}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
