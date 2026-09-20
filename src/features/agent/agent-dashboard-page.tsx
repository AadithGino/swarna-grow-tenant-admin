"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  Coins,
  Gem,
  HandCoins,
  History,
  Search,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AgentCard,
  AgentEmpty,
  AgentLoadingCards,
  AgentStatus,
  formatAgentMoney,
  formatAgentTime,
} from "@/src/components/agent/agent-ui";
import {
  useGetAgentCashSummaryQuery,
  useGetAgentCollectionSummaryQuery,
  useGetAgentGoldRateQuery,
  useGetAgentHandoversQuery,
  useGetAgentPaymentsQuery,
} from "@/src/store/api/agent-api";
import { useAppSelector } from "@/src/store/hooks";

function QuickActionTile({
  href,
  icon: Icon,
  title,
  description,
  tone = "wine",
  className,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tone?: "gold" | "wine" | "green";
  className?: string;
}) {
  const iconTone = {
    gold: "bg-[#fff2ce] text-[#9a6800]",
    wine: "bg-[#f7edf0] text-[#730321]",
    green: "bg-[#eaf8f0] text-[#087a50]",
  };
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-[1.2rem] bg-linear-to-b from-white to-[#fffaf8] p-5 shadow-[0_10px_28px_rgba(69,24,35,.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(69,24,35,.12)]",
        className,
      )}
    >
      <span className={cn("grid size-11 place-items-center rounded-2xl", iconTone[tone])}>
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-[1.15rem] font-black tracking-[-0.02em] text-[#23181b]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#81777a]">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-[#730321]">
        Open <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function AgentDashboardPage() {
  const session = useAppSelector((state) => state.agentSession.session);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const cash = useGetAgentCashSummaryQuery();
  const todaySummary = useGetAgentCollectionSummaryQuery({ from: today, to: today });
  const rate = useGetAgentGoldRateQuery();
  const payments = useGetAgentPaymentsQuery({ limit: 4 });
  const handovers = useGetAgentHandoversQuery({ status: "PENDING" });
  if (cash.isLoading) return <AgentLoadingCards />;

  const pending = handovers.data?.filter((item) => item.status === "PENDING") ?? [];

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-[#a17217]">
          {session?.selectedTenant.displayName}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-[-.045em] text-[#21171a]">
          Good morning, {session?.user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-[#7d7376]">Here’s your collection position for today.</p>
      </div>

      <AgentCard className="overflow-hidden border-0 bg-linear-to-r from-[#fffaf0] to-white shadow-[0_10px_30px_rgba(69,24,35,.08)] ring-1 ring-[#eadfd6]">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#fff3d7] text-[#9a6800]">
              <Coins className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#8d8385]">Today’s gold rate</p>
              <p className="mt-0.5 text-2xl font-black text-[#1f1618]">
                {rate.data ? `${formatAgentMoney(rate.data.ratePerGramPaise)} / g` : "Unavailable"}
              </p>
            </div>
          </div>
          {rate.data ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf9f1] px-2.5 py-1 text-xs font-bold text-[#087a50]">
              <CheckCircle2 className="size-3.5" />
              Active
            </span>
          ) : null}
        </div>
        {rate.data ? (
          <div className="border-t border-[#eee3d8] bg-white/70 px-5 py-2.5 text-xs text-[#766d70]">
            {rate.data.purity} · {rate.data.effectiveDate}
          </div>
        ) : null}
      </AgentCard>

      <section className="relative overflow-hidden rounded-[1.8rem] bg-[linear-gradient(125deg,#760322_0%,#4c0317_100%)] p-6 text-white shadow-[0_26px_58px_rgba(91,2,27,.24)] sm:p-8">
        <div className="absolute -right-16 -top-16 size-52 rounded-full border border-white/8" />
        <div className="absolute -bottom-24 right-16 size-56 rounded-full bg-[#d29b2d]/15 blur-2xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#f2cb71]">
              <WalletCards className="size-4" />
              Cash in hand
            </div>
            <p className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">
              {formatAgentMoney(cash.data?.cashInHandPaise)}
            </p>
            <p className="mt-2 text-sm text-white/65">Cash you are responsible for before branch handover.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/agent/collect"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#730321] shadow-sm"
              >
                Collect payment <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/agent/handover"
                aria-disabled={
                  !(
                    cash.data?.availableForHandoverPaise ??
                    Math.max(
                      0,
                      (cash.data?.cashInHandPaise ?? 0) -
                        (cash.data?.cashPendingAcceptancePaise ?? 0),
                    )
                  )
                }
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/12 px-5 text-sm font-black text-white ring-1 ring-white/25 backdrop-blur-[2px]"
              >
                Submit cash <HandCoins className="size-4" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur-[2px]">
              <p className="text-xs font-bold text-white/65">Collected today</p>
              <p className="mt-2 text-xl font-black">{formatAgentMoney(todaySummary.data?.amountPaise)}</p>
              <p className="mt-1 text-xs text-white/55">{todaySummary.data?.count ?? 0} receipts</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur-[2px]">
              <p className="text-xs font-bold text-white/65">Pending handover</p>
              <p className="mt-2 text-xl font-black">{formatAgentMoney(cash.data?.cashPendingAcceptancePaise)}</p>
              <p className="mt-1 text-xs text-white/55">
                {pending.length} submission{pending.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <QuickActionTile
          href="/agent/collect"
          icon={Search}
          title="Find customer"
          description="Search by name, mobile, customer number or passbook."
          tone="gold"
        />
        <QuickActionTile
          href="/agent/history"
          icon={History}
          title="Collection history"
          description="Review receipts and cash submissions from your route."
          tone="wine"
        />
        <QuickActionTile
          href="/agent/report"
          icon={TrendingUp}
          title="My report"
          description="See daily totals, receipt count and gold accumulated."
          tone="green"
          className="col-span-2"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <AgentCard className="border-0 shadow-[0_10px_28px_rgba(69,24,35,.08)] ring-1 ring-[#ece2dc]">
          <div className="flex items-center justify-between border-b border-[#eee5e0] px-5 py-4">
            <div>
              <h2 className="font-black">Recent collections</h2>
              <p className="text-xs text-[#897f82]">Latest cash receipts recorded by you</p>
            </div>
            <Link href="/agent/history" className="text-xs font-black text-[#730321]">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[#f0e8e3]">
            {payments.data?.length ? (
              payments.data.slice(0, 4).map((payment) => (
                <Link
                  key={payment.id}
                  href={`/agent/history/collections/${payment.id}`}
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#fdf9f6]"
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full ${
                      payment.weightMg ? "bg-[#fff1c8] text-[#956300]" : "bg-[#eaf9f1] text-[#087a50]"
                    }`}
                  >
                    {payment.weightMg ? <Gem className="size-4" /> : <Banknote className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{payment.customer.name}</p>
                    <p className="truncate text-xs text-[#8a8083]">
                      {payment.scheme.planName} · {payment.receiptNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black">{formatAgentMoney(payment.amountPaise)}</p>
                    <p className="text-[.68rem] text-[#958b8d]">{formatAgentTime(payment.paidAt)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6">
                <AgentEmpty
                  title="No collections yet"
                  description="Cash you record will show here with receipt numbers."
                />
              </div>
            )}
          </div>
        </AgentCard>

        <div className="space-y-4">
          {pending[0] ? (
            <Link href={`/agent/history/handovers/${pending[0].id}`}>
              <AgentCard className="border-0 p-5 shadow-[0_10px_28px_rgba(69,24,35,.08)] ring-1 ring-[#efe3d2] transition hover:ring-[#d2b775]">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 size-5 text-[#a16e10]" />
                  <div>
                    <AgentStatus value="PENDING" />
                    <p className="mt-2 text-lg font-black">{formatAgentMoney(pending[0].amountPaise)}</p>
                    <p className="mt-1 text-xs leading-5 text-[#81777a]">
                      Waiting for your branch to confirm receipt.
                    </p>
                  </div>
                </div>
              </AgentCard>
            </Link>
          ) : (
            <AgentCard className="border-0 p-5 shadow-[0_10px_28px_rgba(69,24,35,.08)] ring-1 ring-[#e6ebe7]">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-[#087a50]" />
                <div>
                  <p className="font-black">No pending handovers</p>
                  <p className="mt-1 text-xs leading-5 text-[#81777a]">
                    Your submitted cash is fully reconciled.
                  </p>
                </div>
              </div>
            </AgentCard>
          )}
        </div>
      </div>
    </div>
  );
}
