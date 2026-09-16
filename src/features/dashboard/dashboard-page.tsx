"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/src/components/common/data-table";
import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { DashboardWidgetGrid } from "@/src/components/dashboard/dashboard-widget-grid";
import { PlanUsageCard } from "@/src/components/dashboard/plan-usage-card";
import { RedemptionFulfillmentCard } from "@/src/components/dashboard/redemption-fulfillment-card";
import { SetupChecklist } from "@/src/components/dashboard/setup-checklist";
import {
  DashboardAlertList,
  DashboardBlockingAlerts,
} from "@/src/features/dashboard/dashboard-alerts";
import { PaymentDialog } from "@/src/features/payments/payment-dialog";
import { money } from "@/src/lib/format";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { validateListDateRange } from "@/src/lib/list-date-range";
import { portalPathFromContract } from "@/src/lib/contract-paths";
import {
  useDismissAlertMutation,
  useGetAlertsQuery,
  useGetBranchesQuery,
  useGetDashboardQuery,
  useGetGoldRateCurrentQuery,
} from "@/src/store/api/admin-api";
import { useClientMounted } from "@/src/hooks/use-client-mounted";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { setBranch } from "@/src/store/slices/ui-slice";
import type { ChartSeriesBlock } from "@/src/types/admin-report";
import type { PortalAlert } from "@/src/types/domain";

const PERIOD_OPTIONS = [
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
];

function chartTitle(key: string, block?: ChartSeriesBlock) {
  return block?.title ?? key.replace(/-/g, " ");
}

function isRoundChart(block?: ChartSeriesBlock) {
  const t = (block?.chartType ?? "").toLowerCase();
  return t === "donut" || t === "pie";
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const mounted = useClientMounted();
  const dispatch = useAppDispatch();
  const [period, setPeriod] = useState("THIS_MONTH");
  const globalBranch = useActingBranchKey();
  const branchId = useActingBranchId();
  const session = useAppSelector((s) => s.session.session);
  const multiBranch = session?.capabilities?.multiBranch !== false;
  const canPickActingBranch =
    multiBranch &&
    (session?.user?.role === "TENANT_OWNER" ||
      session?.user?.role === "TENANT_ADMIN");
  const displayName = session?.user?.name?.trim() || "there";
  const greeting = greetingForHour(new Date().getHours());
  const branchesQuery = useGetBranchesQuery(
    { limit: 50 },
    { skip: !multiBranch },
  );
  const goldCurrent = useGetGoldRateCurrentQuery(
    branchId ? { branchId } : undefined,
  );
  const [rangeMode, setRangeMode] = useState<"preset" | "custom">("preset");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const customRangeError = useMemo(() => {
    if (rangeMode !== "custom") return undefined;
    if (!customFrom.trim() && !customTo.trim()) return undefined;
    return validateListDateRange(customFrom, customTo);
  }, [rangeMode, customFrom, customTo]);

  const customRangeReady =
    rangeMode === "custom" &&
    Boolean(customFrom.trim()) &&
    Boolean(customTo.trim()) &&
    !customRangeError;

  const skipDashboard = rangeMode === "custom" && !customRangeReady;

  const dashboardArg = useMemo(() => {
    const base = { branchId };
    if (customRangeReady) {
      return { ...base, period: "CUSTOM", from: customFrom, to: customTo };
    }
    return { ...base, period };
  }, [branchId, customFrom, customTo, customRangeReady, period]);

  const { data, isLoading, isError, error, refetch } = useGetDashboardQuery(
    dashboardArg,
    { skip: skipDashboard || !mounted },
  );
  const alertsQuery = useGetAlertsQuery(branchId ? { branchId } : undefined);
  const [dismissAlert] = useDismissAlertMutation();

  const chartKeys = useMemo(
    () =>
      (data?.defaultCharts ?? [
        "collection-trend",
        "collection-by-mode",
        "scheme-status-distribution",
      ]) as string[],
    [data?.defaultCharts],
  );

  if (!mounted) {
    return <PageSkeleton cards={5} />;
  }

  const headerDescription = skipDashboard
    ? "Pick a start and end date to load metrics for that period."
    : data?.scope?.label
      ? `${data.scope.label} · ${data.period?.label ?? "This month"}`
      : "Here's what's happening with your business today.";

  const rangeControls = (
    <>
      <Select
        value={rangeMode}
        onValueChange={(v) => setRangeMode(v as "preset" | "custom")}
      >
        <SelectTrigger className="w-[9rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="preset">Preset period</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      {rangeMode === "preset" ? (
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[10rem]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-1">
          <DateRangeFilter
            from={customFrom}
            to={customTo}
            onFromChange={setCustomFrom}
            onToChange={setCustomTo}
          />
          <FormFieldError message={customRangeError} />
        </div>
      )}
    </>
  );

  const pageHeader = (
    <PageHeader
      title={`${greeting}, ${displayName}`}
      description={headerDescription}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {canPickActingBranch && branchesQuery.data?.items?.length ? (
            <Select
              value={globalBranch}
              onValueChange={(v) => dispatch(setBranch(v))}
            >
              <SelectTrigger className="w-[10rem]">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All branches</SelectItem>
                {branchesQuery.data.items.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {rangeControls}
          <PaymentDialog
            trigger={
              <Button size="lg">
                <HandCoins />
                Collect payment
              </Button>
            }
          />
        </div>
      }
    />
  );

  if (skipDashboard) {
    return (
      <>
        {pageHeader}
        <Surface title="Custom date range" description="Dashboard metrics">
          <p className="p-6 text-sm text-muted-foreground">
            Choose start and end dates in the header, then metrics will load
            automatically for that range.
          </p>
        </Surface>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        {pageHeader}
        <PageSkeleton cards={5} />
      </>
    );
  }
  if (isError || !data) {
    return (
      <>
        {pageHeader}
        <QueryError error={error} onRetry={refetch} />
      </>
    );
  }

  const centreAlerts = alertsQuery.data ?? data.alerts ?? [];
  const panelAlerts = (
    centreAlerts.length ? centreAlerts : (data.alerts ?? [])
  ).filter(
    (alert: PortalAlert) =>
      !(
        alert.key === "GOLD_RATE_NOT_SET" &&
        data.goldRate?.isSetForToday === false
      ),
  );

  const handleDismiss = async (id: string) => {
    await dismissAlert(id).unwrap();
  };

  const widgets = data.widgets?.length ? data.widgets : undefined;

  return (
    <>
      {pageHeader}

      <SetupChecklist />

      <DashboardBlockingAlerts
        goldRate={
          goldCurrent.isLoading
            ? null
            : {
                ...data.goldRate,
                isSetForToday:
                  goldCurrent.data?.isSetForToday ??
                  data.goldRate?.isSetForToday ??
                  true,
                ratePerGram:
                  goldCurrent.data?.ratePerGram ?? data.goldRate?.ratePerGram,
              }
        }
      />

      {widgets ? <DashboardWidgetGrid widgets={widgets} /> : null}

      {data.redemptionFulfillment ? (
        <RedemptionFulfillmentCard
          data={data.redemptionFulfillment}
          periodLabel={data.period?.label}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {chartKeys.map((key) => {
          const chart = data.charts?.[key] as ChartSeriesBlock | undefined;
          const round = isRoundChart(chart);
          return (
            <Surface
              key={key}
              title={chartTitle(key, chart)}
              description={data.period?.label ?? "This month"}
              className="min-h-[23.75rem]"
            >
              <div
                className={
                  round
                    ? "flex min-h-[21.25rem] flex-col p-5 pb-6"
                    : "h-[18.75rem] p-5"
                }
              >
                {chart ? (
                  <ChartSeriesView chart={chart} />
                ) : (
                  <p className="p-6 text-sm text-muted-foreground">
                    No chart data
                  </p>
                )}
              </div>
            </Surface>
          );
        })}
        <PlanUsageCard className="h-full min-h-[23.75rem]" />
      </div>

      <Surface
        title="Alert centre"
        description="Cash, messaging, and payment items needing attention"
        action={
          <Button variant="link" size="sm" asChild>
            <Link href="/alerts">View all</Link>
          </Button>
        }
      >
        <DashboardAlertList alerts={panelAlerts} onDismiss={handleDismiss} />
      </Surface>

      <Surface
        title="Operational attention"
        description="Items that need an owner today"
      >
        <DataTable
          rows={(data.attention ?? []).map((x: any, i: number) => ({
            ...x,
            id: String(i),
          }))}
          columns={[
            {
              key: "priority",
              header: "Priority",
              render: (r: any) => (
                <span className="rounded-full bg-[#fff6df] px-2.5 py-1 text-xs font-semibold text-[#805817]">
                  {r.priority}
                </span>
              ),
            },
            {
              key: "item",
              header: "Item",
              render: (r: any) => <span className="font-medium">{r.item}</span>,
            },
            {
              key: "customer",
              header: "Customer / branch",
              render: (r: any) => r.customer,
            },
            {
              key: "amount",
              header: "Amount",
              render: (r: any) => money(r.amount),
            },
            { key: "age", header: "Age", render: (r: any) => r.age },
            {
              key: "status",
              header: "Status",
              render: (r: any) => (
                <span className="text-red-600">{r.status}</span>
              ),
            },
            {
              key: "action",
              header: "Action",
              render: (r: any) =>
                r.actionPath ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={portalPathFromContract(r.actionPath)}>
                      {r.actionLabel ?? r.action ?? "Open"}
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline">
                    {r.action}
                  </Button>
                ),
            },
          ]}
        />
      </Surface>
    </>
  );
}
