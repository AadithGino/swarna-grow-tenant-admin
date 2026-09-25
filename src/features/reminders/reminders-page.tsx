"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCheck,
  Clock3,
  Eye,
  MessageCircleMore,
  RefreshCcw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/src/lib/api-error";
import { validateReminderConfigOffsets } from "@/src/lib/settings-form-validation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import {
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import {
  EmptyState,
  PageSkeleton,
  QueryError,
} from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { useValidatedListDateRange } from "@/src/hooks/use-validated-list-date-range";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import { ReminderOffsetTimeline } from "@/src/features/reminders/reminder-offset-timeline";
import {
  useGetMessagesQuery,
  useGetMessagingSummaryQuery,
  useGetMessagingTemplatesQuery,
  useGetRemindersConfigQuery,
  useResendMessageMutation,
  useUpdateRemindersConfigMutation,
} from "@/src/store/api/admin-api";
import { MessageDetailDialog } from "@/src/features/reminders/message-detail-dialog";
import { TemplatePreviewDialog } from "@/src/features/reminders/template-preview-dialog";
import { ManualPushPanel } from "@/src/features/reminders/manual-push-panel";
import { InboundMessagesPanel } from "@/src/features/reminders/inbound-messages-panel";

function reminderConfigWriteBody(
  config: Record<string, any> | undefined,
  patch: Record<string, unknown>,
) {
  const source = { ...(config ?? {}), ...patch };
  const offsets = Array.isArray(source.offsets)
    ? source.offsets.map((row: Record<string, unknown>) => ({
        key: String(row.key ?? ""),
        days: Number(row.days ?? 0),
        enabled: row.enabled !== false,
      }))
    : undefined;
  const sendWindow = source.sendWindow
    ? {
        startTime: source.sendWindow.startTime,
        endTime: source.sendWindow.endTime,
      }
    : undefined;
  const push = source.push
    ? Object.fromEntries(
        Object.entries(source.push).filter(([, value]) => typeof value === "boolean"),
      )
    : undefined;
  return {
    ...(source.version != null || source.expectedVersion != null
      ? { expectedVersion: Number(source.expectedVersion ?? source.version) }
      : {}),
    ...(["enabled", "attachPaymentLink"] as const).reduce(
      (out, key) =>
        typeof source[key] === "boolean" ? { ...out, [key]: source[key] } : out,
      {} as Record<string, unknown>,
    ),
    ...([
      "maxRemindersPerInstallment",
      "paymentLinkValidityHours",
      "flexibleNudgeInactiveDays",
      "maxPushPerCustomerPerDay",
      "maxWhatsAppPerCustomerPerDay",
    ] as const).reduce(
      (out, key) =>
        Number.isFinite(Number(source[key])) ? { ...out, [key]: Number(source[key]) } : out,
      {} as Record<string, unknown>,
    ),
    ...(offsets ? { offsets } : {}),
    ...(sendWindow ? { sendWindow } : {}),
    ...(push ? { push } : {}),
    ...(Array.isArray(source.skipDays)
      ? { skipDays: source.skipDays.map(Number) }
      : {}),
  };
}

export function RemindersPage() {
  const searchParams = useSearchParams();
  const broadcastId = searchParams.get("broadcastId") ?? undefined;
  const channelFilter = searchParams.get("channel") ?? undefined;
  const defaultTab = searchParams.get("tab") ?? "log";
  const { from, setFrom, to, setTo, dateRangeError, skipForBadDates } =
    useValidatedListDateRange();
  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const pager = useCursorPagination(
    8,
    `${from}|${to}|${branchKey}|${broadcastId ?? ""}|${channelFilter ?? ""}`,
  );
  const query = useGetMessagesQuery(
    {
      from,
      to,
      branchId,
      ...(broadcastId ? { broadcastId } : {}),
      ...(channelFilter ? { channel: channelFilter } : {}),
      ...pager.queryParams,
    },
    { skip: skipForBadDates },
  );
  const templatesQuery = useGetMessagingTemplatesQuery();
  const configQuery = useGetRemindersConfigQuery();
  const summaryQuery = useGetMessagingSummaryQuery(
    { from, to, branchId },
    { skip: skipForBadDates },
  );
  const [resend] = useResendMessageMutation();
  const [updateConfig] = useUpdateRemindersConfigMutation();
  const [viewMessageId, setViewMessageId] = useState<string | null>(null);
  const [viewMessageFallback, setViewMessageFallback] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string>("");

  async function persistReminderOffsets(
    offsets: { key: string; days: number; enabled?: boolean }[],
  ) {
    const configErr = validateReminderConfigOffsets(offsets);
    if (configErr) {
      toast.error(configErr);
      return;
    }
    try {
      await updateConfig(
        reminderConfigWriteBody(configQuery.data, { offsets }),
      ).unwrap();
      toast.success("Schedule updated");
    } catch (err) {
      toastApiError(err, "Could not update reminder schedule");
    }
  }

  if (skipForBadDates) {
    return (
      <>
        <PageHeader
          eyebrow="Engagement & insight"
          title="Reminder centre"
          description="WhatsApp templates, automated schedules, delivery logs, retry queues and usage."
        />
        <Surface title="Invalid period">
          <EmptyState title="Fix the date range" detail={dateRangeError ?? ""} />
        </Surface>
      </>
    );
  }
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <QueryError error={query.error} onRetry={query.refetch} />;
  const listSummary = query.data.summary ?? {};
  const periodSummary = summaryQuery.data ?? {};
  const s = { ...listSummary, ...periodSummary };
  const quota = periodSummary;
  const page = query.data.page ?? emptyPageMeta();
  const sentCount = Number(s.sent ?? 0);
  const deliveredCount = Number(s.delivered ?? 0);
  const readCount = Number(s.read ?? 0);
  const deliveryRate =
    sentCount > 0
      ? `${Math.round((deliveredCount / sentCount) * 1000) / 10}% delivery`
      : "No messages in period";
  const readRate =
    deliveredCount > 0
      ? `${Math.round((readCount / deliveredCount) * 1000) / 10}% of delivered`
      : "—";
  return (
    <>
      <PageHeader
        eyebrow="Engagement & insight"
        title="Reminder centre"
        description="WhatsApp templates, automated schedules, delivery logs, retry queues and usage."
        actions={
          <div className="space-y-1">
            <DateRangeFilter
              label="Sent"
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
            <FormFieldError message={dateRangeError} />
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={Send}
          label="Sent"
          value={s.sent ?? 0}
          detail={
            periodSummary.periodLabel ??
            (from && to
              ? `${from} – ${to}`
              : "Selected period")
          }
        />
        <StatCard
          icon={CheckCheck}
          label="Delivered"
          value={s.delivered ?? 0}
          detail={deliveryRate}
          tone="green"
        />
        <StatCard
          icon={Eye}
          label="Read"
          value={s.read ?? 0}
          detail={readRate}
          tone="cream"
        />
        <StatCard
          icon={AlertTriangle}
          label="Failed"
          value={s.failed ?? 0}
          detail="Eligible for retry"
          tone="red"
        />
        <StatCard
          icon={MessageCircleMore}
          label="Quota used"
          value={`${quota?.quotaUsedPercent ?? s.quotaUsed ?? 0}%`}
          detail={
            quota?.quotaLimit != null
              ? `${quota.sent ?? 0} of ${quota.quotaLimit} messages`
              : "Usage this billing period"
          }
          tone="gold"
        />
      </div>
      <PageTabs defaultValue={defaultTab} key={`${defaultTab}-${broadcastId ?? ""}`}>
        <PageTabsBar sectionLabel="Reminder views">
          <PageTab value="log">Message log</PageTab>
          <PageTab value="manual-push">Manual push</PageTab>
          <PageTab value="inbound">Inbound</PageTab>
          <PageTab value="templates">Templates</PageTab>
          <PageTab value="schedule">Schedule</PageTab>
          <PageTab value="quota">Quota</PageTab>
        </PageTabsBar>
        <PageTabsPanel value="log">
          <Surface
            title="Message log"
            description={
              broadcastId
                ? `Filtered to manual push broadcast ${broadcastId}`
                : "WhatsApp and mobile push — WhatsApp delivery updates via provider webhook"
            }
          >
            <PaginatedDataTable
              rows={query.data.items}
              page={page}
              pageIndex={pager.pageIndex}
              onNext={() => pager.goNext(page.nextCursor)}
              onPrevious={pager.goPrevious}
              canPrevious={pager.canPrevious}
              columns={[
                { key: "date", header: "Sent at", render: (r: any) => r.date },
                {
                  key: "customer",
                  header: "Customer",
                  render: (r: any) => <strong>{r.customer}</strong>,
                },
                {
                  key: "type",
                  header: "Message type",
                  render: (r: any) =>
                    String(r.type ?? "—").replaceAll("_", " "),
                },
                {
                  key: "channel",
                  header: "Channel",
                  render: (r: any) => r.channel,
                },
                {
                  key: "cost",
                  header: "Cost",
                  render: (r: any) => money(r.cost),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r: any) => (
                    <div>
                      <StatusBadge status={r.status} />
                      {r.failure && (
                        <p className="mt-1 text-xs text-red-600">{r.failure}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: "action",
                  header: "",
                  render: (r: any) =>
                    r.status === "FAILED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await resend(r.id).unwrap();
                          toast.success("Message queued for retry");
                        }}
                      >
                        <RefreshCcw />
                        Retry
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setViewMessageId(String(r.id));
                          setViewMessageFallback({
                            date: r.date,
                            customer: r.customer,
                            type: r.type,
                            status: r.status,
                            cost: r.cost,
                            failure: r.failure,
                          });
                        }}
                      >
                        View
                      </Button>
                    ),
                },
              ]}
            />
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="manual-push">
          <ManualPushPanel />
        </PageTabsPanel>
        <PageTabsPanel value="inbound">
          <InboundMessagesPanel />
        </PageTabsPanel>
        <PageTabsPanel value="templates">
          <div className="grid gap-4 lg:grid-cols-2">
            {(templatesQuery.data?.items ?? []).map((t: any) => (
              <Surface
                key={t.messageType}
                title={t.label}
                action={
                  <StatusBadge status={t.configured ? "ACTIVE" : "INACTIVE"} />
                }
              >
                <div className="p-5">
                  {t.warning && (
                    <p className="mb-3 text-sm text-amber-800">{t.warning}</p>
                  )}
                  <div className="rounded-xl bg-[#f6efe9] p-4 text-sm leading-6">
                    {t.templateName ?? "Not configured"}
                    {t.deliveryRatePercent != null && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t.sentLast30Days} sent · {t.deliveryRatePercent}%
                        delivery (30d)
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                    <span>{t.messageType}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!t.configured}
                      onClick={() => {
                        setPreviewType(String(t.messageType));
                        setPreviewLabel(String(t.label ?? t.messageType));
                        setPreviewOpen(true);
                      }}
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        </PageTabsPanel>
        <PageTabsPanel value="schedule">
          <Surface
            title="Mobile push (FCM)"
            description="Push alerts follow the same schedule unless marked push-only. WhatsApp and push can run together."
            className="mb-4"
          >
            <div className="divide-y">
              {(
                [
                  ["enabled", "Enable push notifications"],
                  ["dueReminders", "Fixed scheme due reminders"],
                  ["overdueReminders", "Overdue reminders"],
                  ["flexibleNudge", "Flexible scheme nudges"],
                  ["paymentSuccess", "Payment success"],
                  ["schemeJoined", "Scheme enrolment"],
                  ["flexiLockApplied", "Flexible lock applied"],
                  ["schemeMatured", "Scheme matured"],
                  ["maturityReminders", "Pre-maturity reminders"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <strong>{label}</strong>
                  </div>
                  <Switch
                    checked={configQuery.data?.push?.[key] !== false}
                    aria-label={label}
                    onCheckedChange={async (enabled) => {
                      try {
                        await updateConfig(reminderConfigWriteBody(configQuery.data, {
                          push: {
                            ...(configQuery.data?.push ?? {}),
                            [key]: enabled,
                          },
                        })).unwrap();
                        toast.success("Push settings updated");
                      } catch (err) {
                        toastApiError(err, "Could not update push settings");
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </Surface>
          <Surface
            title="Automated reminder schedule"
            description="Changes affect future queue generation only"
          >
            <ReminderOffsetTimeline
              offsets={configQuery.data?.offsets ?? []}
              onToggle={async (key, enabled) => {
                const offsets = (configQuery.data?.offsets ?? []).map(
                  (o: { key: string; days: number; enabled?: boolean }) =>
                    o.key === key ? { ...o, enabled } : o,
                );
                await persistReminderOffsets(offsets);
              }}
            />
            <div className="divide-y border-t">
              {(configQuery.data?.offsets ?? []).map((row: any) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div>
                    <strong>{row.label}</strong>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.messageType} · day offset {row.days}
                    </p>
                  </div>
                  <Switch
                    checked={row.enabled}
                    aria-label={`Enable ${row.label}`}
                    onCheckedChange={async (enabled) => {
                      const offsets = (configQuery.data?.offsets ?? []).map(
                        (o: { key: string; days: number; enabled?: boolean }) =>
                          o.key === row.key ? { ...o, enabled } : o,
                      );
                      await persistReminderOffsets(offsets);
                    }}
                  />
                </div>
              ))}
            </div>
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="quota">
          {periodSummary.charts &&
          Object.keys(periodSummary.charts).length > 0 ? (
            <Surface title="Delivery analytics" className="mb-4">
              <div className="grid gap-4 p-5 lg:grid-cols-2">
                {Object.entries(periodSummary.charts).map(
                  ([key, chart]: [string, any]) => (
                    <div key={key} className="min-h-[260px] p-2">
                      <h3 className="mb-2 text-sm font-semibold">
                        {chart.title ?? key}
                      </h3>
                      <ChartSeriesView chart={chart} />
                    </div>
                  ),
                )}
              </div>
            </Surface>
          ) : null}
          <Surface title="WhatsApp usage">
            <div className="grid gap-5 p-6 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex justify-between">
                  <strong>
                    {Number(quota?.sent ?? 0).toLocaleString("en-IN")} messages
                    used
                  </strong>
                  <span className="text-sm text-muted-foreground">
                    {Number(quota?.quotaLimit ?? 0).toLocaleString("en-IN")}{" "}
                    included
                  </span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#eadde0]">
                  <div
                    className="h-full rounded-full bg-[#730321]"
                    style={{
                      width: `${Math.min(100, Number(quota?.quotaUsedPercent ?? 0))}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {quota?.resetsOn ? `Resets on ${quota.resetsOn}. ` : ""}
                  Failed provider deliveries may still count toward provider
                  quota.
                </p>
              </div>
              <div className="rounded-xl border bg-[#fff8e8] p-4">
                <Clock3 className="mb-2 text-[#9a6f2a]" />
                <strong>
                  {Number(quota?.quotaRemaining ?? 0).toLocaleString("en-IN")}{" "}
                  remaining
                </strong>
                {quota?.estimatedDaysRemaining != null ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Estimated {quota.estimatedDaysRemaining} days at current
                    usage.
                  </p>
                ) : null}
              </div>
            </div>
          </Surface>
        </PageTabsPanel>
      </PageTabs>
      <MessageDetailDialog
        messageId={viewMessageId}
        open={viewMessageId != null}
        onOpenChange={(open) => {
          if (!open) {
            setViewMessageId(null);
            setViewMessageFallback(null);
          }
        }}
        fallback={
          viewMessageFallback as {
            date?: string;
            customer?: string;
            type?: string;
            status?: string;
            cost?: number;
            failure?: string;
          }
        }
      />
      <TemplatePreviewDialog
        messageType={previewType}
        label={previewLabel}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
