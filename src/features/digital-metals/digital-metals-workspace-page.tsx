"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Coins, Settings2, TrendingUp } from "lucide-react";
import { Surface } from "@/src/components/common/page-parts";
import { QueryError } from "@/src/components/common/query-state";
import {
  HeroStat,
  HeroStatusPill,
  SectionHero,
  heroButtonClass,
  heroPrimaryButtonClass,
} from "@/src/components/admin-ui/section-hero";
import { TrendChart } from "@/src/components/admin-ui/trend-chart";
import { contractPayload } from "@/src/store/api/contract-adapters";
import {
  useGetDigitalMetalsCapabilityQuery,
  useGetDigitalMetalsWalletTotalsQuery,
  useGetDigitalMetalsRatesCurrentQuery,
  useGetDigitalMetalsRatesHistoryQuery,
  useGetDigitalMetalsWorkspaceQuery,
} from "@/src/store/api/admin-api";
import { cn } from "@/lib/utils";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { DmGate, dmInr, dmWeight } from "./digital-metals-admin-ui";
import { DigitalMetalsOperationsPanel } from "./digital-metals-operations-panel";
import { DigitalMetalsWorkspaceOverview } from "./digital-metals-workspace-overview";

type RateRow = {
  customerBuyRatePerGramPaise?: number;
  customerSellRatePerGramPaise?: number;
  effectiveAt?: string;
  sequence?: number;
};

function pctChange(now?: number, before?: number) {
  if (!now || !before) return null;
  return ((now - before) / before) * 100;
}

export function DigitalMetalsWorkspacePage() {
  const ent = useDigitalMetalsServerEntitlement();
  const skip = !ent.workspaceVisible;
  const workspace = useGetDigitalMetalsWorkspaceQuery(undefined, { skip });
  const capability = useGetDigitalMetalsCapabilityQuery(undefined, { skip });
  const goldRate = useGetDigitalMetalsRatesCurrentQuery({ metal: "GOLD", finenessPpm: 999_000 }, { skip });
  const silverRate = useGetDigitalMetalsRatesCurrentQuery({ metal: "SILVER", finenessPpm: 999_000 }, { skip });
  const [chartMetal, setChartMetal] = useState<"GOLD" | "SILVER">("GOLD");
  const history = useGetDigitalMetalsRatesHistoryQuery(
    { metal: chartMetal, finenessPpm: 999_000, limit: 30 },
    { skip },
  );
  const walletTotals = useGetDigitalMetalsWalletTotalsQuery(undefined, { skip });

  const gold = goldRate.data?.rate as RateRow | undefined;
  const silver = silverRate.data?.rate as RateRow | undefined;
  const historyRows = useMemo(
    () =>
      ((history.data?.items ?? []) as RateRow[])
        .filter((r) => r.customerBuyRatePerGramPaise != null)
        .slice()
        .sort((a, b) => String(a.effectiveAt ?? "").localeCompare(String(b.effectiveAt ?? ""))),
    [history.data?.items],
  );
  const goldHistory = chartMetal === "GOLD" ? historyRows : [];
  const goldTrend = pctChange(
    gold?.customerBuyRatePerGramPaise,
    goldHistory.length > 1 ? goldHistory[goldHistory.length - 2]?.customerBuyRatePerGramPaise : undefined,
  );
  const walletLines = ((contractPayload(walletTotals.data) as { lines?: Record<string, unknown>[] } | undefined)?.lines ?? []) as {
    metal?: string;
    heldUg?: string;
  }[];
  const held = (metal: string) => walletLines.find((l) => String(l.metal) === metal)?.heldUg;

  const pause = capability.data?.pause;
  const paused = pause?.tenantPaused || pause?.platformPaused;
  const live = Boolean(workspace.data?.workspaceLive) && !capability.data?.blockers?.length;

  return (
    <DmGate
      loading={ent.loading}
      visible={ent.workspaceVisible}
      title="Digital Gold & Silver"
      message={
        ent.disabledMessage ??
        (ent.planEntitled
          ? "Enable Digital Gold & Silver under Settings → Operations, or complete platform tax approval and published customer terms."
          : null)
      }
    >
      <div className="space-y-6" data-testid="digital-metals-workspace-shell">
        <SectionHero
          icon={Coins}
          eyebrow="Overview"
          title={workspace.data?.title ?? "Digital Gold & Silver"}
          status={
            paused ? (
              <HeroStatusPill tone="paused">Trading paused</HeroStatusPill>
            ) : live ? (
              <HeroStatusPill tone="live">Live for customers</HeroStatusPill>
            ) : (
              <HeroStatusPill tone="off">Not live yet</HeroStatusPill>
            )
          }
          description="Customers buy, sell and redeem 24K gold and silver in your app. Rates, approvals and payouts are run from here."
          actions={
            <>
              <Link href="/digital-metals/settings" className={heroButtonClass}>
                <Settings2 className="size-4" /> Settings
              </Link>
              <Link href="/digital-metals/rates" className={heroPrimaryButtonClass}>
                <TrendingUp className="size-4" /> Publish rates
              </Link>
            </>
          }
        >
          <HeroStat
            label="Gold buy rate"
            value={gold ? `${dmInr(gold.customerBuyRatePerGramPaise)}/g` : "Not set"}
            detail={gold ? `Sell ${dmInr(gold.customerSellRatePerGramPaise)}/g` : "Publish a rate to start trading"}
            trend={goldTrend}
            loading={goldRate.isLoading}
            href="/digital-metals/rates"
          />
          <HeroStat
            label="Silver buy rate"
            value={silver ? `${dmInr(silver.customerBuyRatePerGramPaise)}/g` : "Not set"}
            detail={silver ? `Sell ${dmInr(silver.customerSellRatePerGramPaise)}/g` : "Optional"}
            loading={silverRate.isLoading}
            href="/digital-metals/rates"
          />
          <HeroStat
            label="Customer gold held"
            value={held("GOLD") ? dmWeight(held("GOLD")) : "—"}
            detail="Total live customer obligation"
            loading={walletTotals.isLoading}
            href="/digital-metals/hedge"
          />
          <HeroStat
            label="Customer silver held"
            value={held("SILVER") ? dmWeight(held("SILVER")) : "—"}
            detail="Total live customer obligation"
            loading={walletTotals.isLoading}
            href="/digital-metals/hedge"
          />
        </SectionHero>

        {workspace.isError ? <QueryError error={workspace.error} onRetry={workspace.refetch} /> : null}

        <DigitalMetalsWorkspaceOverview workspaceVisible={ent.workspaceVisible} />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Surface
            icon={TrendingUp}
            title="Customer buy rate"
            description="Every rate you've published, newest on the right"
            action={
              <div role="tablist" aria-label="Metal" className="inline-flex rounded-lg border border-[#e6dad6] p-0.5">
                {(["GOLD", "SILVER"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={chartMetal === m}
                    onClick={() => setChartMetal(m)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold",
                      chartMetal === m ? "bg-[#5e0a20] text-white" : "text-[#6f6265] hover:text-[#28161a]",
                    )}
                  >
                    {m === "GOLD" ? "Gold" : "Silver"}
                  </button>
                ))}
              </div>
            }
          >
            <div className="px-5 pb-4 pt-3">
              {historyRows.length ? (
                <TrendChart
                  ariaLabel={`${chartMetal === "GOLD" ? "Gold" : "Silver"} buy rate history`}
                  tone="gold"
                  height={210}
                  points={historyRows.map((r) => ({
                    label: r.effectiveAt
                      ? new Date(r.effectiveAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                      : "",
                    value: Number(r.customerBuyRatePerGramPaise ?? 0),
                  }))}
                  format={(v) => `${dmInr(v)}/g`}
                />
              ) : (
                <p className="py-10 text-center text-sm text-[#7a6d70]">
                  {history.isLoading ? "Loading rates…" : "No rates published yet."}
                </p>
              )}
            </div>
          </Surface>
          <DigitalMetalsOperationsPanel />
        </div>
      </div>
    </DmGate>
  );
}
