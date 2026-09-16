"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  DashboardAlertList,
  DashboardBlockingAlerts,
} from "@/src/features/dashboard/dashboard-alerts";
import { useActingBranchId } from "@/src/hooks/use-acting-branch-id";
import {
  useDismissAlertMutation,
  useGetAlertsQuery,
  useGetDashboardQuery,
} from "@/src/store/api/admin-api";
import type { PortalAlert } from "@/src/types/domain";

export function AlertsPage() {
  const branchId = useActingBranchId();
  const alertsQuery = useGetAlertsQuery(branchId ? { branchId } : undefined);
  const dashboardQuery = useGetDashboardQuery({ branchId });
  const [dismissAlert] = useDismissAlertMutation();

  if (alertsQuery.isLoading) return <PageSkeleton cards={2} />;
  if (alertsQuery.isError)
    return <QueryError onRetry={alertsQuery.refetch} title="Alerts could not be loaded" />;

  const alerts = alertsQuery.data ?? [];
  const goldRate = dashboardQuery.data?.goldRate;
  const visible = alerts.filter(
    (alert: PortalAlert) =>
      !(alert.key === "GOLD_RATE_NOT_SET" && goldRate?.isSetForToday === false),
  );

  const handleDismiss = async (id: string) => {
    await dismissAlert(id).unwrap();
  };

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Alert centre"
        description="Cash, quotas, webhooks, redemptions, and configuration items that need attention."
        actions={
          <Button variant="outline" asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        }
      />
      {goldRate && !goldRate.isSetForToday && (
        <div className="mb-5">
          <DashboardBlockingAlerts goldRate={goldRate} />
        </div>
      )}
      <Surface
        title="Active alerts"
        description={`${visible.length} item${visible.length === 1 ? "" : "s"} need attention`}
        action={
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Bell className="size-4" />
            Dismissible alerts can be cleared after review
          </span>
        }
      >
        <DashboardAlertList
          alerts={visible}
          onDismiss={handleDismiss}
          fullPage
        />
      </Surface>
    </>
  );
}
