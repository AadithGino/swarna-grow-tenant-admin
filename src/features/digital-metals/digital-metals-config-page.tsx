"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Calculator, Megaphone, Settings2, SlidersHorizontal, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { Notice, SectionTabs } from "@/src/components/admin-ui/detail-parts";
import { TrendChart } from "@/src/components/admin-ui/trend-chart";
import { hasPermission } from "@/src/lib/permissions";
import { useAppSelector } from "@/src/store/hooks";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  datetimeLocalValueToUtcIso,
  utcIsoToDatetimeLocalValue,
  DATETIME_LOCAL_TIMEZONE_LABEL,
} from "@/src/lib/datetime-local";
import { formatAssetLabel, parseAssetKey, type CapabilityAsset } from "@/src/lib/digital-metals-asset-ui";
import { DigitalMetalsQuoteBreakdown } from "@/src/lib/digital-metals-quote-preview";
import {
  useGetDigitalMetalsCapabilityQuery,
  useGetDigitalMetalsRatesCurrentQuery,
  useGetDigitalMetalsRatesHistoryQuery,
  usePublishDigitalMetalsRateMutation,
  usePreviewDigitalMetalsQuoteMutation,
} from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { DigitalMetalsAssetPicker, DigitalMetalsSettingsEditor, useConfigAssetSelection } from "./digital-metals-config-editor";
import { DM_SECTION, DmGate, dmInr, shortDateTime } from "./digital-metals-admin-ui";

const TABS = [
  { href: "/digital-metals/rates", label: "Rates", icon: TrendingUp },
  { href: "/digital-metals/settings", label: "Fees & tax", icon: SlidersHorizontal },
  { href: "/digital-metals/quote", label: "Quote calculator", icon: Calculator },
];

type RateRow = {
  sequence?: number;
  customerBuyRatePerGramPaise?: number;
  customerSellRatePerGramPaise?: number;
  effectiveAt?: string;
  publishedByName?: string;
};

export function DigitalMetalsConfigPage({ section }: { section: "settings" | "rates" | "quote" }) {
  const ent = useDigitalMetalsServerEntitlement();
  const user = useAppSelector((s) => s.session.session?.user);
  const canSettings = hasPermission(user, "digital-metals.settings.write");
  const canRates = hasPermission(user, "digital-metals.rates.write");
  const capability = useGetDigitalMetalsCapabilityQuery(undefined, { skip: !ent.planEntitled });
  const assets = (capability.data?.assets ?? []) as CapabilityAsset[];
  const defaultAsset = useConfigAssetSelection(assets);
  const [assetSel, setAssetSel] = useState<string>(defaultAsset);
  const parsed = parseAssetKey(assetSel) ?? { metal: "GOLD" as const, finenessPpm: 999_000 };

  const rates = useGetDigitalMetalsRatesCurrentQuery({ metal: parsed.metal, finenessPpm: parsed.finenessPpm });
  const history = useGetDigitalMetalsRatesHistoryQuery(
    { metal: parsed.metal, finenessPpm: parsed.finenessPpm, limit: 30 },
    { skip: section !== "rates" },
  );
  const [publishRate, publishState] = usePublishDigitalMetalsRateMutation();
  const [previewQuote, previewState] = usePreviewDigitalMetalsQuoteMutation();
  const [buyRateRupee, setBuyRateRupee] = useState("");
  const [sellRateRupee, setSellRateRupee] = useState("");
  const [effectiveLocal, setEffectiveLocal] = useState(() => utcIsoToDatetimeLocalValue(new Date().toISOString()));
  const [budgetRupee, setBudgetRupee] = useState("6000");
  const [quoteResult, setQuoteResult] = useState<Record<string, unknown> | null>(null);

  const current = rates.data?.rate as RateRow | undefined;
  const stale = rates.data?.stale === true;
  const historyRows = ((history.data?.items ?? []) as RateRow[])
    .slice()
    .sort((a, b) => String(a.effectiveAt ?? "").localeCompare(String(b.effectiveAt ?? "")));
  const buyNum = Number(buyRateRupee);
  const sellNum = Number(sellRateRupee);
  const spreadPct = buyNum > 0 && sellNum > 0 ? ((buyNum - sellNum) / buyNum) * 100 : null;
  const assetLabel = formatAssetLabel(parsed.metal, parsed.finenessPpm);

  return (
    <DmGate loading={ent.loading || capability.isLoading} visible={ent.planEntitled} message={ent.disabledMessage} title="Rates & settings">
      <div className="space-y-6">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={Settings2}
          title="Rates & settings"
          description={`Publish the buy and sell rates customers trade at, and set fees and tax per metal. Times are in ${DATETIME_LOCAL_TIMEZONE_LABEL}.`}
        />
        <SectionTabs tabs={TABS} ariaLabel="Rates and settings" />

        {section !== "settings" ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[#4f3d41]">Metal</span>
            <div className="min-w-[16rem]">
              <DigitalMetalsAssetPicker value={assetSel} onChange={setAssetSel} assets={assets} />
            </div>
          </div>
        ) : null}

        {section === "settings" && <DigitalMetalsSettingsEditor canWrite={canSettings} />}

        {section === "rates" && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="space-y-6">
              <Surface icon={TrendingUp} title={`Live rate · ${assetLabel}`}>
                {rates.isError ? (
                  <QueryError error={rates.error} onRetry={rates.refetch} />
                ) : (
                  <div className="grid grid-cols-2 gap-px bg-[#f1e8e5]">
                    <div className="bg-white px-5 py-4">
                      <p className="text-xs text-[#8a7c80]">Customers buy at</p>
                      <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#28161a]">
                        {current?.customerBuyRatePerGramPaise != null ? `${dmInr(current.customerBuyRatePerGramPaise)}` : "—"}
                        <span className="text-sm font-semibold text-[#9a8d90]">/g</span>
                      </p>
                    </div>
                    <div className="bg-white px-5 py-4">
                      <p className="text-xs text-[#8a7c80]">Customers sell at</p>
                      <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#28161a]">
                        {current?.customerSellRatePerGramPaise != null ? `${dmInr(current.customerSellRatePerGramPaise)}` : "—"}
                        <span className="text-sm font-semibold text-[#9a8d90]">/g</span>
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center gap-2 bg-white px-5 py-3 text-sm text-[#6f6265]">
                      <StatusBadge status={stale || !current ? "PENDING" : "LIVE"} label={stale ? "Stale — publish a fresh rate" : current ? "Live" : "Not published"} />
                      {current?.sequence != null ? <span>Version {current.sequence}</span> : null}
                      {current?.effectiveAt ? <span>· since {shortDateTime(current.effectiveAt)}</span> : null}
                    </div>
                  </div>
                )}
              </Surface>
              <Surface icon={Megaphone} title="Publish a new rate" description="Customers see it from the effective time. Quotes already locked keep their old rate.">
                {!canRates ? (
                  <div className="px-5 py-4">
                    <Notice tone="amber">You need the “publish digital metal rates” permission to change rates.</Notice>
                  </div>
                ) : (
                  <div className="space-y-4 px-5 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-[#4f3d41]">Customer buy rate (₹/g)</span>
                        <Input inputMode="decimal" value={buyRateRupee} onChange={(e) => setBuyRateRupee(e.target.value)} placeholder={current?.customerBuyRatePerGramPaise ? String(current.customerBuyRatePerGramPaise / 100) : "e.g. 7840.50"} className="h-11 rounded-xl text-base tabular-nums" />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-[#4f3d41]">Customer sell rate (₹/g)</span>
                        <Input inputMode="decimal" value={sellRateRupee} onChange={(e) => setSellRateRupee(e.target.value)} placeholder={current?.customerSellRatePerGramPaise ? String(current.customerSellRatePerGramPaise / 100) : "e.g. 7610"} className="h-11 rounded-xl text-base tabular-nums" />
                      </label>
                    </div>
                    {spreadPct != null ? (
                      <p className={`text-sm ${spreadPct < 0 ? "font-semibold text-red-700" : "text-[#6f6265]"}`}>
                        {spreadPct < 0
                          ? "Sell rate is higher than buy rate — customers could profit instantly. Check the numbers."
                          : `Spread ${spreadPct.toFixed(2)}% (₹${(buyNum - sellNum).toLocaleString("en-IN", { maximumFractionDigits: 2 })}/g)`}
                      </p>
                    ) : null}
                    <label className="block space-y-1.5">
                      <span className="block text-sm font-medium text-[#4f3d41]">Effective from</span>
                      <Input type="datetime-local" value={effectiveLocal} onChange={(e) => setEffectiveLocal(e.target.value)} className="h-10 rounded-xl sm:max-w-xs" />
                    </label>
                    <Button
                      className="h-11 rounded-xl px-6"
                      disabled={publishState.isLoading || !(buyNum > 0) || !(sellNum > 0)}
                      onClick={() => {
                        const buy = Math.round(buyNum * 100);
                        const sell = Math.round(sellNum * 100);
                        const effectiveAt = datetimeLocalValueToUtcIso(effectiveLocal);
                        void publishRate({
                          metal: parsed.metal,
                          finenessPpm: parsed.finenessPpm,
                          customerBuyRatePerGramPaise: buy,
                          customerSellRatePerGramPaise: sell,
                          effectiveAt,
                          idempotencyKey: newIdempotencyKey(),
                        })
                          .unwrap()
                          .then(() => {
                            toast.success("Rate published");
                            setBuyRateRupee("");
                            setSellRateRupee("");
                          })
                          .catch((e) => toast.error(String(e?.data?.error?.message ?? "Publish failed")));
                      }}
                    >
                      Publish rate
                    </Button>
                  </div>
                )}
              </Surface>
            </div>
            <Surface title="Rate history" description="Buy rate per gram, newest on the right">
              <div className="px-5 pb-2 pt-3">
                {historyRows.length ? (
                  <TrendChart
                    ariaLabel={`${assetLabel} buy rate history`}
                    height={200}
                    points={historyRows.map((r) => ({
                      label: r.effectiveAt ? new Date(r.effectiveAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "",
                      value: Number(r.customerBuyRatePerGramPaise ?? 0),
                    }))}
                    format={(v) => `${dmInr(v)}/g`}
                  />
                ) : (
                  <p className="py-10 text-center text-sm text-[#7a6d70]">{history.isLoading ? "Loading…" : "No rates published yet."}</p>
                )}
              </div>
              {historyRows.length ? (
                <div className="max-h-80 overflow-y-auto border-t border-[#efe5e1]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#fbf8f6] text-left text-[0.78rem] text-[#7a6d70]">
                      <tr>
                        <th className="px-5 py-2 font-semibold">Effective</th>
                        <th className="px-3 py-2 text-right font-semibold">Buy</th>
                        <th className="px-3 py-2 text-right font-semibold">Sell</th>
                        <th className="px-5 py-2 text-right font-semibold">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3eae7]">
                      {historyRows
                        .slice()
                        .reverse()
                        .map((r, i) => (
                          <tr key={`${r.sequence}-${i}`}>
                            <td className="px-5 py-2 text-[#3c2a2e]">{shortDateTime(r.effectiveAt)}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">{dmInr(r.customerBuyRatePerGramPaise)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{dmInr(r.customerSellRatePerGramPaise)}</td>
                            <td className="px-5 py-2 text-right text-[#857a7d]">{r.publishedByName ?? `v${r.sequence ?? "—"}`}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </Surface>
          </div>
        )}

        {section === "quote" && (
          <Surface icon={Calculator} title="Quote calculator" description="See exactly what a customer would get for a budget, using today's rate, fees and tax.">
            <div className="grid gap-6 p-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-[#4f3d41]">Customer budget, all-in (₹)</span>
                  <Input inputMode="decimal" value={budgetRupee} onChange={(e) => setBudgetRupee(e.target.value)} className="h-11 rounded-xl text-base tabular-nums" />
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1000, 5000, 10000, 25000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBudgetRupee(String(v))}
                      className="rounded-full border border-[#e6dad6] px-3 py-1 text-xs font-semibold text-[#5c4a4e] hover:border-[#d7b2bc] hover:bg-[#fbf1f3]"
                    >
                      ₹{v.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
                <Button
                  className="h-11 w-full rounded-xl"
                  disabled={previewState.isLoading}
                  onClick={() => {
                    const budgetPaise = Math.round(Number(budgetRupee) * 100);
                    void previewQuote({
                      side: "BUY",
                      metal: parsed.metal,
                      finenessPpm: parsed.finenessPpm,
                      inputMode: "BUDGET_INR",
                      budgetPaise,
                      idempotencyKey: newIdempotencyKey(),
                    })
                      .unwrap()
                      .then((data) => setQuoteResult(data))
                      .catch((e) => toast.error(String(e?.data?.error?.message ?? "Quote failed")));
                  }}
                >
                  Preview buy quote
                </Button>
              </div>
              <div>
                {quoteResult ? (
                  <DigitalMetalsQuoteBreakdown quote={quoteResult as Record<string, unknown>} />
                ) : (
                  <div className="grid h-full min-h-40 place-items-center rounded-2xl border border-dashed border-[#e6dad6] text-sm text-[#9a8d90]">
                    The breakdown appears here.
                  </div>
                )}
              </div>
            </div>
          </Surface>
        )}
      </div>
    </DmGate>
  );
}
