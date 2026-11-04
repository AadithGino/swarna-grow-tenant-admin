"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Download, Scale, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { contractPayload } from "@/src/store/api/contract-adapters";
import {
  useGetDigitalMetalsHedgeDailyIndexQuery,
  useGetDigitalMetalsHedgeLiveQuery,
} from "@/src/store/api/admin-api";
import { cn } from "@/lib/utils";
import { istBusinessDateToday } from "@/src/lib/ist-business-date";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { DM_SECTION, DmGate, MetalPill, dmWeight } from "./digital-metals-admin-ui";

type MetalSummary = {
  openingMetalOwedUg?: string;
  closingMetalOwedUg?: string;
  dayNetChangeUg?: string;
  creditedBuyUg?: string;
  executedSellUg?: string;
  physicalHandoverUg?: string;
  ledgerMatchesBook?: boolean;
};

type DayRow = {
  businessDate: string;
  metals: { GOLD?: MetalSummary; SILVER?: MetalSummary };
};

function ugNum(v: string | undefined) {
  return Number(v ?? 0);
}

function formatIstDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isToday(iso: string) {
  return iso === istBusinessDateToday();
}

function BalanceCard({
  metal,
  amountUg,
  label,
}: {
  metal: "GOLD" | "SILVER";
  amountUg: string;
  label: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-[#e8dcd7] bg-gradient-to-br from-white to-[#faf6f4] px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <MetalPill metal={metal} />
        <span className="text-xs font-medium text-[#857a7d]">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[#28161a]">{dmWeight(amountUg)}</p>
      <p className="mt-1 text-xs text-[#9a8d90]">Metal owed to customers at end of day</p>
    </div>
  );
}

function DayMovementColumn({ metal, summary }: { metal: "GOLD" | "SILVER"; summary?: MetalSummary }) {
  if (!summary) {
    return (
      <div className="rounded-xl border border-dashed border-[#e8dcd7] px-4 py-3 text-sm text-[#9a8d90]">
        No {metal.toLowerCase()} activity
      </div>
    );
  }
  const rows = [
    { label: "Start of day", value: summary.openingMetalOwedUg ?? "0", tone: "neutral" as const },
    { label: "Customer buys", value: summary.creditedBuyUg ?? "0", tone: "up" as const },
    { label: "Customer sells", value: summary.executedSellUg ?? "0", tone: "down" as const },
    { label: "Physical handover", value: summary.physicalHandoverUg ?? "0", tone: "down" as const },
    { label: "End of day balance", value: summary.closingMetalOwedUg ?? "0", tone: "total" as const },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MetalPill metal={metal} />
        {summary.ledgerMatchesBook === false ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Review ledger</span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Balanced</span>
        )}
      </div>
      <dl className="space-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-[#f3eae7] pb-2 last:border-0">
            <dt className={cn("text-[#857a7d]", row.tone === "total" && "font-semibold text-[#4f3d41]")}>{row.label}</dt>
            <dd
              className={cn(
                "tabular-nums font-medium",
                row.tone === "total" && "text-lg font-bold text-[#28161a]",
                row.tone === "up" && ugNum(row.value) > 0 && "text-emerald-700",
                row.tone === "down" && ugNum(row.value) > 0 && "text-[#6b4a52]",
              )}
            >
              {row.tone === "up" && ugNum(row.value) > 0 ? "+" : row.tone === "down" && ugNum(row.value) > 0 ? "−" : null}
              {dmWeight(row.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type LiveLine = {
  metal?: string;
  openingMetalOwedUg?: string;
  closingMetalOwedUg?: string;
  ledgerReconcileDeltaUg?: string;
  movements?: Record<string, string | undefined>;
};

function dayRowFromLiveLines(businessDate: string, lines: LiveLine[]): DayRow {
  const metals: DayRow["metals"] = {};
  for (const metal of ["GOLD", "SILVER"] as const) {
    const line = lines.find((l) => String(l.metal ?? "").toUpperCase() === metal);
    if (!line) continue;
    const m = line.movements ?? {};
    const credited = ugNum(m.creditedBuyUg ?? m.completedBuyUg);
    const sold = ugNum(m.executedSellUg);
    const handover = ugNum(m.physicalHandoverUg);
    const correction = ugNum(m.correctionUg);
    metals[metal] = {
      openingMetalOwedUg: line.openingMetalOwedUg ?? "0",
      closingMetalOwedUg: line.closingMetalOwedUg ?? "0",
      creditedBuyUg: m.creditedBuyUg ?? m.completedBuyUg ?? "0",
      executedSellUg: m.executedSellUg ?? "0",
      physicalHandoverUg: m.physicalHandoverUg ?? "0",
      dayNetChangeUg: String(credited - sold - handover + correction),
      ledgerMatchesBook: ugNum(line.ledgerReconcileDeltaUg) === 0,
    };
  }
  return { businessDate, metals };
}

function closingFromLiveLines(lines: LiveLine[], metal: "GOLD" | "SILVER") {
  const line = lines.find((l) => String(l.metal ?? "").toUpperCase() === metal);
  return line?.closingMetalOwedUg ?? "0";
}

function dayCsv(day: DayRow) {
  const header = "businessDate,metal,openingUg,closingUg,buysUg,sellsUg,handoverUg,netChangeUg";
  const lines = (["GOLD", "SILVER"] as const).map((metal) => {
    const m = day.metals[metal];
    return [
      day.businessDate,
      metal,
      m?.openingMetalOwedUg ?? "0",
      m?.closingMetalOwedUg ?? "0",
      m?.creditedBuyUg ?? "0",
      m?.executedSellUg ?? "0",
      m?.physicalHandoverUg ?? "0",
      m?.dayNetChangeUg ?? "0",
    ].join(",");
  });
  return [header, ...lines].join("\n");
}

export function DigitalMetalsHedgePage() {
  const ent = useDigitalMetalsServerEntitlement();
  const today = istBusinessDateToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [days, setDays] = useState(14);

  const index = useGetDigitalMetalsHedgeDailyIndexQuery(
    { days },
    { skip: !ent.workspaceVisible },
  );
  const liveToday = useGetDigitalMetalsHedgeLiveQuery({ businessDate: today }, { skip: !ent.workspaceVisible });

  const indexData = contractPayload(index.data) as {
    items?: DayRow[];
    currentBalances?: { businessDate?: string; goldClosingUg?: string; silverClosingUg?: string };
    computedAt?: string;
  } | undefined;

  const liveTodayData = contractPayload(liveToday.data) as { lines?: LiveLine[]; recomputationRequired?: boolean } | undefined;
  const liveTodayLines = liveTodayData?.lines ?? [];

  const indexItems = indexData?.items ?? [];
  const items = useMemo(() => {
    if (indexItems.length) return indexItems;
    if (liveToday.isSuccess && liveTodayLines.length) return [dayRowFromLiveLines(today, liveTodayLines)];
    return [];
  }, [indexItems, liveToday.isSuccess, liveTodayLines, today]);

  const liveSelected = useGetDigitalMetalsHedgeLiveQuery(
    { businessDate: selectedDate },
    {
      skip:
        !ent.workspaceVisible
        || !selectedDate
        || selectedDate === today
        || indexItems.some((r) => r.businessDate === selectedDate),
    },
  );
  const liveSelectedLines = (contractPayload(liveSelected.data) as { lines?: LiveLine[] } | undefined)?.lines ?? [];

  const selected = useMemo(() => {
    const fromIndex = items.find((r) => r.businessDate === selectedDate);
    if (fromIndex) return fromIndex;
    if (liveSelected.isSuccess && liveSelectedLines.length) {
      return dayRowFromLiveLines(selectedDate, liveSelectedLines);
    }
    return items[0];
  }, [items, selectedDate, liveSelected.isSuccess, liveSelectedLines]);

  const indexCurrentBalances = indexData?.currentBalances;
  const balances = useMemo(() => {
    if (indexCurrentBalances) return indexCurrentBalances;
    if (liveTodayLines.length) {
      return {
        businessDate: today,
        goldClosingUg: closingFromLiveLines(liveTodayLines, "GOLD"),
        silverClosingUg: closingFromLiveLines(liveTodayLines, "SILVER"),
      };
    }
    return undefined;
  }, [indexCurrentBalances, liveTodayLines, today]);

  const showRecompute = liveTodayData?.recomputationRequired === true;
  const historyLoading = index.isLoading || index.isFetching;
  const historyFailed = index.isError && !indexItems.length;

  const hasAnyActivity = useMemo(
    () =>
      items.some((day) =>
        (["GOLD", "SILVER"] as const).some((metal) => {
          const m = day.metals[metal];
          return m && ugNum(m.closingMetalOwedUg) > 0;
        }),
      ),
    [items],
  );

  function onDownloadDay() {
    if (!selected) return;
    const blob = new Blob([dayCsv(selected)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hedge-${selected.businessDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DmGate loading={ent.loading} visible={ent.workspaceVisible} message={ent.disabledMessage} title="Daily hedge book">
      <div className="space-y-6" data-testid="digital-metals-hedge">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={TrendingUp}
          title="Daily hedge book"
          description="Day-by-day view of how much gold and silver you owe customers. Pick a day to see what moved."
          meta={
            <span className="text-sm text-[#857a7d]">
              {indexData?.computedAt
                ? `Updated ${new Date(String(indexData.computedAt)).toLocaleString("en-IN")}`
                : liveToday.isFetching
                  ? "Loading today’s balances…"
                  : historyLoading
                    ? "Loading day history…"
                    : null}
            </span>
          }
        />

        {showRecompute ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Some older closed snapshots may be out of date after corrections. Today&apos;s live numbers below are still correct.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {liveToday.isLoading && !balances ? (
            <PageSkeleton cards={2} />
          ) : (
            <>
              <BalanceCard
                metal="GOLD"
                amountUg={balances?.goldClosingUg ?? "0"}
                label={isToday(balances?.businessDate ?? today) ? "Today" : "Latest"}
              />
              <BalanceCard
                metal="SILVER"
                amountUg={balances?.silverClosingUg ?? "0"}
                label={isToday(balances?.businessDate ?? today) ? "Today" : "Latest"}
              />
            </>
          )}
        </div>

        <Surface icon={CalendarDays} title="Recent days (IST)">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f3eae7] px-5 py-3">
            <p className="text-sm text-[#857a7d]">Tap a row to see that day&apos;s breakdown</p>
            <div className="flex items-center gap-2">
              {[7, 14].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={days === n ? "default" : "outline"}
                  className="rounded-lg"
                  onClick={() => setDays(n)}
                >
                  {n} days
                </Button>
              ))}
              <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={index.isFetching} onClick={() => index.refetch()}>
                Refresh
              </Button>
            </div>
          </div>

          {historyFailed ? (
            <div className="p-5">
              <QueryError error={index.error} onRetry={index.refetch} />
            </div>
          ) : historyLoading && !items.length ? (
            <PageSkeleton cards={4} />
          ) : !hasAnyActivity ? (
            <EmptyState icon={Scale} title="No customer metal owed yet" detail="When customers buy digital gold or silver, daily balances will show here." />
          ) : (
            <div className={cn("overflow-x-auto", historyLoading && items.length ? "opacity-70" : undefined)}>
              {historyLoading && items.length ? (
                <p className="px-5 py-2 text-xs font-medium text-[#857a7d]">Refreshing day list…</p>
              ) : null}
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#f3eae7] text-xs uppercase tracking-wide text-[#9a8d90]">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-3 py-3 font-semibold">Gold balance</th>
                    <th className="px-3 py-3 font-semibold">Silver balance</th>
                    <th className="px-3 py-3 font-semibold">Day change</th>
                    <th className="w-10 px-3 py-3" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {items.map((day) => {
                    const gold = day.metals.GOLD;
                    const silver = day.metals.SILVER;
                    const netGold = ugNum(gold?.dayNetChangeUg);
                    const netSilver = ugNum(silver?.dayNetChangeUg);
                    const active = day.businessDate === (selected?.businessDate ?? selectedDate);
                    return (
                      <tr
                        key={day.businessDate}
                        className={cn(
                          "cursor-pointer border-b border-[#f3eae7] transition-colors hover:bg-[#fdf9f8]",
                          active && "bg-[#fff5f3]",
                        )}
                        onClick={() => setSelectedDate(day.businessDate)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-[#28161a]">{formatIstDate(day.businessDate)}</div>
                          {isToday(day.businessDate) ? (
                            <span className="text-xs font-semibold text-[#9c3045]">Today</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3.5 tabular-nums font-medium">{dmWeight(gold?.closingMetalOwedUg ?? "0")}</td>
                        <td className="px-3 py-3.5 tabular-nums font-medium">{dmWeight(silver?.closingMetalOwedUg ?? "0")}</td>
                        <td className="px-3 py-3.5 text-xs text-[#6b4a52]">
                          <span className="inline-flex flex-col gap-0.5">
                            <span>G {netGold === 0 ? "—" : `${netGold > 0 ? "+" : ""}${dmWeight(String(Math.abs(netGold)))}`}</span>
                            <span>S {netSilver === 0 ? "—" : `${netSilver > 0 ? "+" : ""}${dmWeight(String(Math.abs(netSilver)))}`}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-[#c4b5b9]">
                          <ChevronRight className={cn("size-4", active && "text-[#9c3045]")} aria-hidden />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Surface>

        {selected ? (
          <Surface
            icon={Scale}
            title={formatIstDate(selected.businessDate)}
            description="How customer metal owed changed that day"
            action={
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={onDownloadDay}>
                <Download /> CSV
              </Button>
            }
          >
            <div className="grid gap-8 px-5 py-5 md:grid-cols-2">
              <DayMovementColumn metal="GOLD" summary={selected.metals.GOLD} />
              <DayMovementColumn metal="SILVER" summary={selected.metals.SILVER} />
            </div>
          </Surface>
        ) : null}

        <p className="text-xs text-[#857a7d]">
          Balances come from customer wallet ledger events (IST midnight to midnight). Supplier procurement is tracked separately.
        </p>
      </div>
    </DmGate>
  );
}
