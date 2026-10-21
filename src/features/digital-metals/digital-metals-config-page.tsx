"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Surface, FieldLabel } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { hasPermission } from "@/src/lib/permissions";
import { useAppSelector } from "@/src/store/hooks";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  datetimeLocalValueToUtcIso,
  utcIsoToDatetimeLocalValue,
  DATETIME_LOCAL_TIMEZONE_LABEL,
} from "@/src/lib/datetime-local";
import {
  formatAssetLabel,
  parseAssetKey,
  type CapabilityAsset,
} from "@/src/lib/digital-metals-asset-ui";
import { DigitalMetalsQuoteBreakdown } from "@/src/lib/digital-metals-quote-preview";
import {
  useGetDigitalMetalsCapabilityQuery,
  useGetDigitalMetalsRatesCurrentQuery,
  usePublishDigitalMetalsRateMutation,
  usePreviewDigitalMetalsQuoteMutation,
} from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import {
  DigitalMetalsAssetPicker,
  DigitalMetalsSettingsEditor,
  useConfigAssetSelection,
} from "./digital-metals-config-editor";

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

  const rates = useGetDigitalMetalsRatesCurrentQuery({
    metal: parsed.metal,
    finenessPpm: parsed.finenessPpm,
  });
  const [publishRate] = usePublishDigitalMetalsRateMutation();
  const [previewQuote] = usePreviewDigitalMetalsQuoteMutation();
  const [buyRateRupee, setBuyRateRupee] = useState("");
  const [sellRateRupee, setSellRateRupee] = useState("");
  const [effectiveLocal, setEffectiveLocal] = useState(() =>
    utcIsoToDatetimeLocalValue(new Date().toISOString()),
  );
  const [budgetRupee, setBudgetRupee] = useState("6000");
  const [quoteResult, setQuoteResult] = useState<Record<string, unknown> | null>(null);

  const nav = useMemo(
    () => [
      { href: "/digital-metals/settings", label: "Asset settings", key: "settings" as const },
      { href: "/digital-metals/rates", label: "Rates", key: "rates" as const },
      { href: "/digital-metals/quote", label: "Quote preview", key: "quote" as const },
    ],
    [],
  );

  if (ent.loading || capability.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.planEntitled) {
    return (
      <div className="p-6">
        <PageHeader title="Digital metals configuration" />
        <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Digital metals configuration"
        description={`Per-asset settings and rates · times in ${DATETIME_LOCAL_TIMEZONE_LABEL}`}
      />
      <div className="flex flex-wrap gap-2">
        {nav.map((item) => (
          <Button key={item.key} variant={section === item.key ? "default" : "outline"} asChild>
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ))}
        <Button variant="ghost" asChild>
          <Link href="/digital-metals">← Workspace</Link>
        </Button>
      </div>

      {section !== "settings" ? (
        <div className="space-y-2">
          <FieldLabel>Asset</FieldLabel>
          <DigitalMetalsAssetPicker value={assetSel} onChange={setAssetSel} assets={assets} />
          <p className="text-xs text-muted-foreground">
            {formatAssetLabel(parsed.metal, parsed.finenessPpm)}
          </p>
        </div>
      ) : null}

      {section === "settings" && <DigitalMetalsSettingsEditor canWrite={canSettings} />}

      {section === "rates" && (
        <Surface title="Manual rates">
          <div className="space-y-4 p-6">
            {rates.isError ? (
              <QueryError error={rates.error} onRetry={rates.refetch} />
            ) : (
              <p className="text-sm">
                Current sequence:{" "}
                {String((rates.data?.rate as Record<string, unknown> | undefined)?.sequence ?? "—")}
                {(rates.data?.stale as boolean) ? " · stale" : ""}
              </p>
            )}
            {!canRates ? (
              <p className="text-sm text-amber-800">You need digital-metals.rates.write to publish rates.</p>
            ) : (
              <>
                <FieldLabel>Customer buy rate (₹/g)</FieldLabel>
                <Input value={buyRateRupee} onChange={(e) => setBuyRateRupee(e.target.value)} />
                <FieldLabel>Customer sell rate (₹/g)</FieldLabel>
                <Input value={sellRateRupee} onChange={(e) => setSellRateRupee(e.target.value)} />
                <FieldLabel>Effective at (local)</FieldLabel>
                <Input type="datetime-local" value={effectiveLocal} onChange={(e) => setEffectiveLocal(e.target.value)} />
                <Button
                  onClick={() => {
                    const buy = Math.round(Number(buyRateRupee) * 100);
                    const sell = Math.round(Number(sellRateRupee) * 100);
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
                      .then(() => toast.success("Rate published"))
                      .catch((e) => toast.error(String(e?.data?.error?.message ?? "Publish failed")));
                  }}
                >
                  Publish rate
                </Button>
              </>
            )}
          </div>
        </Surface>
      )}

      {section === "quote" && (
        <Surface title="Quote preview (admin calculator)">
          <div className="space-y-4 p-6">
            <FieldLabel>All-in buy budget (₹)</FieldLabel>
            <Input value={budgetRupee} onChange={(e) => setBudgetRupee(e.target.value)} />
            <Button
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
            {quoteResult ? (
              <DigitalMetalsQuoteBreakdown quote={quoteResult as Record<string, unknown>} />
            ) : null}
          </div>
        </Surface>
      )}
    </div>
  );
}
