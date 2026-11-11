"use client";

import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, Download, Gem, ReceiptText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGetAgentReportQuery } from "@/src/store/api/agent-api";
import {
  AgentCard,
  AgentLoadingCards,
  AgentPageHeader,
  formatAgentDate,
  formatAgentMoney,
  formatAgentPaymentMode,
  formatAgentWeight,
} from "@/src/components/agent/agent-ui";

const IST = "Asia/Kolkata";

type ReportPreset = "LAST_7" | "LAST_30" | "THIS_MONTH" | "TODAY" | "CUSTOM";

const PRESETS: { id: ReportPreset; label: string }[] = [
  { id: "LAST_7", label: "Last 7 days" },
  { id: "LAST_30", label: "Last 30 days" },
  { id: "THIS_MONTH", label: "This month" },
  { id: "TODAY", label: "Today" },
];

function todayIst() {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}

function daysAgoIst(days: number) {
  const parts = todayIst().split("-").map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function startOfMonthIst() {
  return `${todayIst().slice(0, 7)}-01`;
}

function rangeForPreset(preset: ReportPreset): { from: string; to: string } {
  const to = todayIst();
  switch (preset) {
    case "TODAY":
      return { from: to, to };
    case "LAST_30":
      return { from: daysAgoIst(29), to };
    case "THIS_MONTH":
      return { from: startOfMonthIst(), to };
    case "LAST_7":
    default:
      return { from: daysAgoIst(6), to };
  }
}

function formatRangeLabel(from: string, to: string) {
  if (from === to) return formatAgentDate(from);
  return `${formatAgentDate(from)} – ${formatAgentDate(to)}`;
}

export function AgentReportPage() {
  const [preset, setPreset] = useState<ReportPreset>("LAST_7");
  const [from, setFrom] = useState(() => rangeForPreset("LAST_7").from);
  const [to, setTo] = useState(() => rangeForPreset("LAST_7").to);

  const report = useGetAgentReportQuery({ from, to });
  const max = useMemo(
    () => Math.max(...(report.data?.days.map((day) => day.amountPaise) ?? [1]), 1),
    [report.data],
  );

  const applyPreset = (next: ReportPreset) => {
    setPreset(next);
    const range = rangeForPreset(next);
    setFrom(range.from);
    setTo(range.to);
  };

  const onFromChange = (value: string) => {
    setFrom(value);
    setPreset("CUSTOM");
    if (value > to) setTo(value);
  };

  const onToChange = (value: string) => {
    setTo(value);
    setPreset("CUSTOM");
    if (value < from) setFrom(value);
  };

  const download = () => {
    if (!report.data) return;
    const lines = [
      "Date,Collections,Amount (INR),Gold (g)",
      ...report.data.days.map(
        (day) =>
          `${day.date},${day.count},${(day.amountPaise / 100).toFixed(2)},${(day.goldWeightMg / 1000).toFixed(3)}`,
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `my-collections-${from}-to-${to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const statCards = report.data
    ? [
        {
          label: "Total collected",
          value: formatAgentMoney(report.data.amountPaise),
          icon: TrendingUp,
          tone: "bg-[#f7edf0] text-[#730321]",
        },
        {
          label: "Receipts",
          value: String(report.data.count),
          icon: ReceiptText,
          tone: "bg-[#eaf9f1] text-[#087a50]",
        },
        {
          label: "Gold credited",
          value: formatAgentWeight(report.data.goldWeightMg),
          icon: Gem,
          tone: "bg-[#fff3d7] text-[#966400]",
        },
        {
          label: "Average receipt",
          value: formatAgentMoney(report.data.averageCollectionPaise),
          icon: BarChart3,
          tone: "bg-[#f1efed] text-[#504549]",
        },
      ]
    : [];

  return (
    <div className="space-y-5 pb-2 sm:space-y-6">
      <AgentPageHeader
        eyebrow="Performance"
        title="My collection report"
        description="Only collections recorded under your staff account."
        action={
          <Button
            onClick={download}
            disabled={!report.data}
            variant="outline"
            className="h-11 w-full rounded-xl sm:w-auto"
          >
            <Download className="mr-2 size-4 shrink-0" />
            Export CSV
          </Button>
        }
      />

      <AgentCard className="overflow-hidden p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[.14em] text-[#a07218]">Date range</p>
          <p className="truncate text-right text-xs font-semibold text-[#8a8083]">{formatRangeLabel(from, to)}</p>
        </div>

        <div
          className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Report period"
        >
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={preset === item.id}
              onClick={() => applyPreset(item.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-xs font-black transition",
                preset === item.id
                  ? "border-[#730321] bg-[#730321] text-white shadow-sm"
                  : "border-[#e8ddd7] bg-[#fcf9f7] text-[#5c5255] active:bg-[#f5efeb]",
              )}
            >
              {item.label}
            </button>
          ))}
          {preset === "CUSTOM" ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-[#d5b979] bg-[#fff9ef] px-3.5 py-2 text-xs font-black text-[#730321]">
              Custom
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:gap-3">
          <div className="min-w-0">
            <label htmlFor="report-from" className="text-[.68rem] font-bold uppercase tracking-wide text-[#978d8f]">
              From
            </label>
            <Input
              id="report-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => onFromChange(event.target.value)}
              className="mt-1.5 h-11 min-w-0 rounded-xl border-[#e3d8d2] bg-[#fcf9f7] px-2 text-sm font-semibold [color-scheme:light]"
            />
          </div>
          <span className="pb-3 text-xs font-bold text-[#b0a6a9]">to</span>
          <div className="min-w-0">
            <label htmlFor="report-to" className="text-[.68rem] font-bold uppercase tracking-wide text-[#978d8f]">
              To
            </label>
            <Input
              id="report-to"
              type="date"
              value={to}
              min={from}
              max={todayIst()}
              onChange={(event) => onToChange(event.target.value)}
              className="mt-1.5 h-11 min-w-0 rounded-xl border-[#e3d8d2] bg-[#fcf9f7] px-2 text-sm font-semibold [color-scheme:light]"
            />
          </div>
        </div>
      </AgentCard>

      {report.isLoading ? (
        <AgentLoadingCards />
      ) : report.data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statCards.map((item) => (
              <AgentCard key={item.label} className="p-4 sm:p-5">
                <span className={`grid size-10 place-items-center rounded-2xl ${item.tone}`}>
                  <item.icon className="size-4" />
                </span>
                <p className="mt-4 text-xs font-bold text-[#887e81]">{item.label}</p>
                <p className="mt-1 text-lg font-black tracking-[-.03em] sm:text-xl">{item.value}</p>
              </AgentCard>
            ))}
          </div>

          {(report.data.byMode?.length ?? 0) > 0 ? (
            <AgentCard className="p-4 sm:p-5">
              <h2 className="font-black">By payment method</h2>
              <p className="mt-1 text-xs text-[#897f82]">Cash in hand is custody only; UPI, card and online are included here too.</p>
              <div className="mt-4 space-y-3">
                {report.data.byMode?.map((row) => (
                  <div key={row.mode} className="flex items-center justify-between gap-3 border-b border-[#f0e8e3] pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-black">{row.label || formatAgentPaymentMode(row.mode)}</p>
                      <p className="text-xs text-[#8a8083]">{row.count} receipt{row.count === 1 ? "" : "s"}</p>
                    </div>
                    <p className="text-sm font-black">{formatAgentMoney(row.amountPaise)}</p>
                  </div>
                ))}
              </div>
            </AgentCard>
          ) : null}

          <AgentCard className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-black">Daily collections</h2>
                <p className="text-xs text-[#897f82]">Amount collected by business date</p>
              </div>
              <CalendarDays className="size-5 shrink-0 text-[#a27217]" />
            </div>
            <div className="-mx-1 mt-6 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              <div
                className="flex h-48 min-w-full items-end gap-2 sm:gap-3"
                style={{ minWidth: `${Math.max(report.data.days.length * 52, 280)}px` }}
              >
                {report.data.days.map((day) => (
                  <div key={day.date} className="flex min-w-[2.75rem] flex-1 flex-col items-center sm:min-w-0">
                    <p className="mb-1.5 max-w-full truncate text-[.62rem] font-black text-[#685d60] sm:text-[.65rem]">
                      {day.amountPaise > 0 ? formatAgentMoney(day.amountPaise) : "—"}
                    </p>
                    <div
                      className="w-full max-w-[3.25rem] rounded-t-lg bg-[linear-gradient(180deg,#8a0a2c,#65031e)]"
                      style={{ height: `${Math.max(8, (day.amountPaise / max) * 140)}px` }}
                    />
                    <p className="mt-2 text-center text-[.62rem] font-bold leading-tight text-[#8c8284] sm:text-[.64rem]">
                      {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(day.date))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </AgentCard>

          <AgentCard className="overflow-hidden">
            <div className="border-b border-[#eee5e0] px-4 py-3.5 sm:px-5 sm:py-4">
              <h2 className="font-black">Daily breakdown</h2>
            </div>
            <div className="divide-y divide-[#f0e8e3]">
              {report.data.days
                .slice()
                .reverse()
                .map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 sm:grid sm:grid-cols-[1fr_auto_auto] sm:gap-4 sm:px-5 sm:py-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-black">{formatAgentDate(day.date)}</p>
                      <p className="mt-0.5 text-xs text-[#8a8083]">
                        {day.count} receipt{day.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 sm:contents">
                      {day.goldWeightMg ? (
                        <span className="text-xs font-black text-[#95650b]">{formatAgentWeight(day.goldWeightMg)}</span>
                      ) : (
                        <span className="hidden sm:block" />
                      )}
                      <p className="text-sm font-black">{formatAgentMoney(day.amountPaise)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </AgentCard>
        </>
      ) : null}
    </div>
  );
}
