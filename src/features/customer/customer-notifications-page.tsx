"use client";

import Link from "next/link";
import {
  Bell,
  ChevronRight,
  IndianRupee,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerPageHeader } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  useGetCustomerNotificationsQuery,
  useMarkAllCustomerNotificationsReadMutation,
  useMarkCustomerNotificationReadMutation,
} from "@/src/store/api/customer-api";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import {
  formatNotificationTime,
  groupCustomerNotificationsByDay,
  resolveCustomerNotificationHref,
} from "@/src/lib/customer-notification-display";
import type { CustomerNotification } from "@/src/types/customer";
import { toast } from "sonner";

function notificationIcon(type: CustomerNotification["type"]) {
  if (type === "PAYMENT") return IndianRupee;
  if (type === "GRIEVANCE") return MessageSquareText;
  if (type === "SCHEME") return Sparkles;
  return Bell;
}

function notificationTone(type: CustomerNotification["type"]) {
  if (type === "PAYMENT") return "bg-[#eafbf3] text-[#0b9860]";
  if (type === "GRIEVANCE") return "bg-[#eef4ff] text-[#3f67a8]";
  if (type === "SCHEME") return "bg-[#fff6e8] text-[#9a6c17]";
  return "bg-[#f7edf0] text-[#730321]";
}

function NotificationRow({
  item,
  href,
  onOpen,
}: {
  item: CustomerNotification;
  href: string | null;
  onOpen: () => void;
}) {
  const Icon = notificationIcon(item.type);
  const tone = notificationTone(item.type);
  const inner = (
    <>
      <span
        className={`relative grid size-12 shrink-0 place-items-center rounded-2xl ${tone}`}
      >
        <Icon className="size-5" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1 py-0.5">
        <p
          className={`text-[0.95rem] leading-snug ${item.read ? "font-semibold text-[#3d3944]" : "font-black text-[#171722]"}`}
        >
          {item.title}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-[#706b77]">{item.body}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <time
            className="text-[0.68rem] font-medium text-[#8a858e]"
            dateTime={item.createdAt}
          >
            {formatNotificationTime(item.createdAt)}
          </time>
          {item.cta && href ? (
            <span className="text-[0.68rem] font-bold text-[#730321]">
              {item.cta}
            </span>
          ) : null}
        </div>
      </div>
      {href ? (
        <ChevronRight className="size-4 shrink-0 self-center text-[#b5b0b8]" />
      ) : null}
    </>
  );

  const rowClass = `flex gap-3.5 px-4 py-4 transition sm:px-5 sm:py-5 ${
    item.read
      ? "bg-white hover:bg-[#fcfaf8]"
      : "bg-[#fffdf9] hover:bg-[#fff9f2] border-l-[3px] border-l-[#730321]"
  }`;

  if (href) {
    return (
      <Link href={href} onClick={onOpen} className={rowClass}>
        {inner}
      </Link>
    );
  }

  return (
    <div role="article" className={rowClass}>
      {inner}
    </div>
  );
}

export function CustomerNotificationsPage() {
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerNotificationsQuery();
  const [markRead] = useMarkCustomerNotificationReadMutation();
  const [markAll, { isLoading: markingAll }] =
    useMarkAllCustomerNotificationsReadMutation();

  if (isLoading || !data) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const groups = groupCustomerNotificationsByDay(data.items);

  return (
    <div className="pb-4">
      <CustomerPageHeader
        title="Notifications"
        description="Payment confirmations, scheme updates and support replies."
        action={
          data.unreadCount > 0 ? (
            <Button
              variant="outline"
              className="rounded-xl border-[#cdbdb5] bg-white font-bold shadow-sm"
              disabled={markingAll}
              onClick={() =>
                markAll()
                  .unwrap()
                  .then(() => toast.success("All notifications marked as read"))
                  .catch(() => toast.error("Could not update notifications"))
              }
            >
              Mark all read
              <span className="ml-2 rounded-full bg-[#730321] px-2 py-0.5 text-[0.65rem] font-bold text-white">
                {data.unreadCount}
              </span>
            </Button>
          ) : undefined
        }
      />

      {data.items.length === 0 ? (
        <section className="customer-surface p-10 text-center sm:p-14">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#f7edf0] text-[#730321]">
            <Bell className="size-7" />
          </span>
          <h2 className="mt-5 text-lg font-black">You&apos;re all caught up</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#706b77]">
            When you pay, enrol, or hear back from support, updates will show up
            here.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key} className="customer-surface overflow-hidden">
              <div className="border-b border-[#e8dfd9] bg-[#fcfaf8] px-4 py-2.5 sm:px-5">
                <h2 className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-[#8a858e]">
                  {group.label}
                </h2>
              </div>
              <div className="divide-y divide-[#e8dfd9]">
                {group.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    href={resolveCustomerNotificationHref(item.deepLink, tenantSlug)}
                    onOpen={() => {
                      if (!item.read) void markRead(item.id);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
