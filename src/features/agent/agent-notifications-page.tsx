"use client";

import Link from "next/link";
import { Bell, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentCard, AgentEmpty, AgentLoadingCards, AgentPageHeader, formatAgentTime } from "@/src/components/agent/agent-ui";
import { useGetAgentNotificationsQuery } from "@/src/store/api/agent-api";

function notificationTitle(type: string, title?: string) {
  if (title) return title;
  if (type === "PAYMENT_DUE") return "Payment due";
  if (type === "PAYMENT_OVERDUE") return "Payment overdue";
  if (type === "PAYMENT_SUCCESS") return "Payment confirmed";
  return type.replaceAll("_", " ").toLowerCase();
}

export function AgentNotificationsPage() {
  const notifications = useGetAgentNotificationsQuery(undefined, { pollingInterval: 60_000 });
  if (notifications.isLoading) return <AgentLoadingCards />;
  const rows = notifications.data ?? [];
  return (
    <div className="space-y-6">
      <AgentPageHeader
        eyebrow="Updates"
        title="Notifications"
        description="Payment reminders and confirmations for your assigned branch."
        action={<Button variant="outline" size="sm" onClick={() => void notifications.refetch()} disabled={notifications.isFetching}><RefreshCw className="mr-2 size-4" />Refresh</Button>}
      />
      {notifications.isError ? (
        <AgentEmpty title="Notifications unavailable" description="Refresh to try again." />
      ) : rows.length ? (
        <AgentCard className="divide-y divide-[#eee5e0] overflow-hidden">
          {rows.map((row) => {
            const content = (
              <div className="flex gap-3 px-5 py-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#f7edf0] text-[#730321]">
                  {row.type.includes("PAYMENT") ? <CreditCard className="size-5" /> : <Bell className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-black capitalize">{notificationTitle(row.type, row.title)}</p>
                    <span className="shrink-0 text-[11px] text-[#93888b]">{formatAgentTime(row.createdAt)}</span>
                  </div>
                  {row.body ? <p className="mt-1 text-sm leading-5 text-[#756b6e]">{row.body}</p> : null}
                </div>
              </div>
            );
            return row.customerId ? <Link key={row.id} href={`/agent/customers/${row.customerId}`} className="block hover:bg-[#fdf9f6]">{content}</Link> : <div key={row.id}>{content}</div>;
          })}
        </AgentCard>
      ) : (
        <AgentEmpty title="You’re all caught up" description="New payment reminders and confirmations will appear here." />
      )}
    </div>
  );
}
