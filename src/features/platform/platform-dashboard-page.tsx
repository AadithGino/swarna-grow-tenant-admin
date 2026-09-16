"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CircleCheck,
  CircleDashed,
  CircleDollarSign,
  Gauge,
  MessageCircleMore,
  RefreshCcw,
  ShieldCheck,
  Tags,
  TrendingUp,
  UsersRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import { PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { platformGreeting, usePlatformSession } from "@/src/features/platform/use-platform-session";
import {
  useGetPlatformChartQuery,
  useGetPlatformDashboardQuery,
  useGetPlatformTenantsQuery,
} from "@/src/store/api/platform-api";
import type { PlatformDashboardSummary, PlatformTenantRow } from "@/src/types/platform";
import { useClientMounted } from "@/src/hooks/use-client-mounted";

function PlatformChart({ chartKey }: { chartKey: string }) {
  const { data, isLoading, isError, refetch } = useGetPlatformChartQuery(chartKey);
  const subtitle =
    data?.yAxis?.label && data?.xAxis?.label
      ? `${data.yAxis.label} by ${data.xAxis.label}`
      : undefined;
  return (
    <Surface title={data?.title ?? "Platform trend"} description={subtitle} className="min-h-[22rem]">
      <div className="h-[18rem] p-5">
        {isLoading ? (
          <div className="h-full animate-pulse rounded-xl bg-muted" />
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <p>Chart failed to load.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : data ? (
          <ChartSeriesView chart={data} />
        ) : (
          <p className="text-sm text-muted-foreground">No chart data</p>
        )}
      </div>
    </Surface>
  );
}

function alertHref(key: string): string {
  if (key === "WEBHOOK_FAILURES") return "/platform/monitoring";
  if (key === "SUBSCRIPTION_PAST_DUE") return "/platform/tenants";
  if (key === "TENANT_SETUP") return "/platform/tenants?status=PENDING_SETUP";
  return "/platform/tenants?status=PENDING_SETUP";
}

function attentionTotal(d: PlatformDashboardSummary): number {
  const alertItems = d.alerts.reduce((sum, row) => sum + (row.count ?? 0), 0);
  return d.tenants.pendingSetup + d.tenants.suspended + alertItems;
}

function tenantInitials(row: PlatformTenantRow): string {
  const name = row.displayName?.trim() || row.businessName?.trim() || "??";
  return name.slice(0, 2).toUpperCase();
}

function DashboardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">{title}</p>
        {description ? <p className="mt-1 text-sm text-[#776a6d]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function PlatformDashboardPage() {
  const mounted = useClientMounted();
  const { user } = usePlatformSession();
  const summary = useGetPlatformDashboardQuery(undefined, { skip: !mounted });
  const tenants = useGetPlatformTenantsQuery({ limit: 8 }, { skip: !mounted });

  const refreshAll = () => {
    summary.refetch();
    tenants.refetch();
  };

  if (!mounted || summary.isLoading) return <PageSkeleton cards={5} />;
  if (summary.isError || !summary.data) return <QueryError error={summary.error} onRetry={summary.refetch} />;

  const d = summary.data;
  const jewellers = tenants.data?.rows ?? [];
  const directorySummary = tenants.data?.meta?.summary;
  const cancelled = d.tenants.cancelled ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Platform command centre"
        title={platformGreeting(user?.name ?? "Platform admin")}
        description="Monitor tenant health, recurring revenue, cross-platform volume and incidents from one operational view."
        actions={
          <>
            <Button variant="outline" onClick={refreshAll} disabled={summary.isFetching || tenants.isFetching}>
              <RefreshCcw className={summary.isFetching || tenants.isFetching ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button variant="outline" asChild>
              <Link href="/platform/monitoring">
                <Activity />
                Open monitoring
              </Link>
            </Button>
            <Button asChild>
              <Link href="/platform/tenants/new">
                <Building2 />
                Add jeweller
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={Building2}
          label="Total jewellers"
          value={d.tenants.total}
          detail={`${d.tenants.active} active · ${d.tenants.pendingSetup} pending setup`}
          tone="wine"
        />
        <StatCard
          icon={CircleDollarSign}
          label="Monthly recurring revenue"
          value={d.mrr.amountDisplay}
          detail="Paid platform subscription invoices this month"
          tone="gold"
        />
        <StatCard
          icon={UsersRound}
          label="Active customers"
          value={d.platformVolume.activeCustomersTotal.toLocaleString("en-IN")}
          detail={`${d.platformVolume.activeSchemesTotal.toLocaleString("en-IN")} active enrollments platform-wide`}
          tone="cream"
        />
        <StatCard
          icon={MessageCircleMore}
          label="WhatsApp delivery"
          value={`${d.whatsapp.deliveryRatePercent}%`}
          detail={`${d.whatsapp.sentThisMonth.toLocaleString("en-IN")} sent · ${d.whatsapp.failedThisMonth.toLocaleString("en-IN")} failed`}
          tone="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs attention"
          value={attentionTotal(d)}
          detail={`${d.tenants.suspended} suspended · ${cancelled} cancelled · ${d.alerts.length} alert type(s)`}
          tone="red"
        />
      </div>

      <DashboardSection title="Tenant lifecycle" description="Jeweller status and platform billing collected this month">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            icon={CircleCheck}
            label="Active jewellers"
            value={d.tenants.active}
            detail="Live on the platform"
            tone="green"
          />
          <StatCard
            icon={CircleDashed}
            label="Pending setup"
            value={d.tenants.pendingSetup}
            detail="Provisioning incomplete"
            tone="gold"
          />
          <StatCard
            icon={AlertTriangle}
            label="Suspended"
            value={d.tenants.suspended}
            detail="Writes restricted"
            tone="red"
          />
          <StatCard
            icon={XCircle}
            label="Cancelled"
            value={cancelled}
            detail="Offboarded tenants"
            tone="cream"
          />
          <StatCard
            icon={CircleDollarSign}
            label="Collected this month"
            value={d.platformVolume.collectionThisMonth.amountDisplay}
            detail="Platform subscription invoices"
            tone="gold"
          />
        </div>
      </DashboardSection>

      {directorySummary ? (
        <DashboardSection title="Directory health" description="Live counts from the jeweller directory">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              icon={Building2}
              label="In directory"
              value={directorySummary.total}
              detail="All jewellers listed"
              tone="wine"
            />
            <StatCard icon={CircleCheck} label="Active" value={directorySummary.active} detail="Operational" tone="green" />
            <StatCard
              icon={CircleDashed}
              label="Pending setup"
              value={directorySummary.pendingSetup}
              detail="Awaiting go-live"
              tone="gold"
            />
            <StatCard
              icon={AlertTriangle}
              label="Suspended"
              value={directorySummary.suspended}
              detail="Restricted access"
              tone="red"
            />
            <StatCard
              icon={XCircle}
              label="Cancelled"
              value={directorySummary.cancelled}
              detail="Closed accounts"
              tone="cream"
            />
            <StatCard
              icon={Gauge}
              label="Near customer limit"
              value={directorySummary.atCustomerLimit}
              detail="At or above 90% of plan cap"
              tone="red"
            />
          </div>
        </DashboardSection>
      ) : null}

      <DashboardSection title="Subscription tiers" description="Jewellers by plan tier — open filtered directory">
        {d.tenantsByTier.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {d.tenantsByTier.map((row) => (
              <Link
                key={row.tier}
                href={`/platform/tenants?tier=${encodeURIComponent(row.tier ?? "UNKNOWN")}`}
                className="block rounded-2xl transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]"
              >
                <StatCard
                  icon={Tags}
                  label={row.tier ?? "Unknown"}
                  value={row.count}
                  detail="View jewellers on this tier"
                  tone="cream"
                />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tier distribution data yet.</p>
        )}
      </DashboardSection>

      <DashboardSection title="WhatsApp this month" description="Delivery performance across all tenants">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={MessageCircleMore}
            label="Sent / delivered / read"
            value={d.whatsapp.sentThisMonth.toLocaleString("en-IN")}
            detail="Successful message outcomes"
            tone="green"
          />
          <StatCard
            icon={AlertTriangle}
            label="Failed"
            value={d.whatsapp.failedThisMonth.toLocaleString("en-IN")}
            detail="Requires investigation"
            tone="red"
          />
          <StatCard
            icon={TrendingUp}
            label="Delivery rate"
            value={`${d.whatsapp.deliveryRatePercent}%`}
            detail={`${(d.whatsapp.sentThisMonth + d.whatsapp.failedThisMonth).toLocaleString("en-IN")} total attempts`}
            tone="wine"
          />
        </div>
      </DashboardSection>

      <div className="grid gap-5 xl:grid-cols-2">
        <PlatformChart chartKey="tenant-growth" />
        <PlatformChart chartKey="tier-distribution" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <PlatformChart chartKey="mrr-trend" />
        <PlatformChart chartKey="platform-collection-volume" />
        <PlatformChart chartKey="whatsapp-volume" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Surface
          title="Latest jewellers"
          description="Newest onboardings — provisioning and subscription posture"
          action={
            <Button variant="link" asChild>
              <Link href="/platform/tenants">
                View directory <ArrowRight />
              </Link>
            </Button>
          }
        >
          {tenants.isError ? (
            <div className="flex flex-col items-center gap-2 p-5 text-sm text-muted-foreground">
              <p>Could not load jeweller directory.</p>
              <Button size="sm" variant="outline" onClick={() => tenants.refetch()}>
                Retry
              </Button>
            </div>
          ) : tenants.isLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : jewellers.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No jewellers on the platform yet.</p>
          ) : (
            <div className="divide-y">
              {jewellers.map((row) => (
                <Link
                  href={`/platform/tenants/${row.id}`}
                  key={row.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#fcf8f6]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7e9c9] font-bold text-[#730321]">
                    {tenantInitials(row)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{row.businessName}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.tenantCode} · {row.displayName} · {row.city ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Owner {row.ownerName ?? "—"} · {row.ownerMobile ?? "—"}
                      {row.ownerEmail ? ` · ${row.ownerEmail}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.subscription.tier} · {row.subscription.status} · {row.subscription.billingCycle}
                      {row.subscription.daysRemaining != null ? ` · ${row.subscription.daysRemaining}d left` : ""}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {row.provisioning.readyToGoLive ? (
                        <CircleCheck className="size-3.5 text-emerald-600" />
                      ) : (
                        <CircleDashed className="size-3.5 text-amber-600" />
                      )}
                      Templates {row.provisioning.templatesConfigured}/{row.provisioning.templatesRequired}
                      {row.provisioning.whatsappConfigured ? " · WhatsApp ok" : " · WhatsApp pending"}
                      {row.provisioning.paymentGatewayConfigured ? " · Payments ok" : " · Payments pending"}
                      · {row.usage.activeCustomers} customers · {row.usage.branches} branches · {row.usage.staff} staff
                      · WhatsApp {row.usage.whatsappUsedThisMonth} this month
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Onboarded {new Date(row.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </Surface>

        <Surface title="Operational alerts" description="Items that need platform operator action">
          <div className="space-y-3 p-4">
            {d.alerts.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                <TrendingUp className="size-5 shrink-0 text-emerald-700" />
                No webhook failures or past-due subscriptions flagged right now.
              </div>
            ) : (
              d.alerts.map((alert) => (
                <Link
                  href={alertHref(alert.key)}
                  key={alert.key}
                  className="flex gap-3 rounded-xl border border-[#eaded9] bg-[#fffaf6] p-4 hover:border-[#cdaeb5]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
                    <AlertTriangle className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{alert.message}</p>
                      <StatusBadge status={alert.severity} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {alert.count} records · key {alert.key}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
              ))
            )}
            <Link href="/platform/audit" className="flex items-center gap-3 rounded-xl border p-4 hover:bg-[#fcf8f6]">
              <ShieldCheck className="size-5 text-emerald-700" />
              <div>
                <p className="font-semibold">Audit trail</p>
                <p className="text-sm text-muted-foreground">Review platform configuration changes</p>
              </div>
            </Link>
          </div>
        </Surface>
      </div>
    </>
  );
}
