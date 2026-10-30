"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel, Surface } from "@/src/components/common/page-parts";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  assetKey,
  formatAssetLabel,
  parseAssetKey,
  type CapabilityAsset,
} from "@/src/lib/digital-metals-asset-ui";
import {
  useGetDigitalMetalsCapabilityQuery,
  useGetDigitalMetalsSettingsQuery,
  usePatchDigitalMetalsSettingsMutation,
  usePreviewDigitalMetalsQuoteMutation,
} from "@/src/store/api/admin-api";
import {
  paiseToRupeeInput,
  rupeeInputToPaise,
} from "@/src/lib/digital-metals-display";
import { DigitalMetalsQuoteBreakdown } from "@/src/lib/digital-metals-quote-preview";

type FeeForm = {
  type: "NONE" | "FLAT_INR" | "PERCENT";
  amountPaise: string;
  percent: string;
  minPaise: string;
  maxPaise: string;
};

type TaxLineForm = {
  code: string;
  label: string;
  base: string;
  ratePercent: string;
  active: boolean;
};

const defaultFee = (): FeeForm => ({
  type: "NONE",
  amountPaise: "",
  percent: "",
  minPaise: "",
  maxPaise: "",
});

function feeFromApi(rule: Record<string, unknown> | undefined): FeeForm {
  if (!rule || rule.type === "NONE") return defaultFee();
  return {
    type: (rule.type as FeeForm["type"]) ?? "NONE",
    amountPaise: rule.amountPaise != null ? paiseToRupeeInput(Number(rule.amountPaise)) : "",
    percent: rule.percent != null ? String(rule.percent) : "",
    minPaise: rule.minPaise != null ? paiseToRupeeInput(Number(rule.minPaise)) : "",
    maxPaise: rule.maxPaise != null ? paiseToRupeeInput(Number(rule.maxPaise)) : "",
  };
}

function feeToApi(form: FeeForm) {
  if (form.type === "NONE") return { type: "NONE" as const };
  if (form.type === "FLAT_INR") {
    const amountPaise = rupeeInputToPaise(form.amountPaise);
    if (amountPaise == null) throw new Error("Invalid flat fee");
    return {
      type: "FLAT_INR" as const,
      amountPaise,
    };
  }
  const minPaise = form.minPaise !== "" ? rupeeInputToPaise(form.minPaise) : null;
  const maxPaise = form.maxPaise !== "" ? rupeeInputToPaise(form.maxPaise) : null;
  return {
    type: "PERCENT" as const,
    percent: Number(form.percent),
    ...(minPaise != null ? { minPaise } : {}),
    ...(maxPaise != null ? { maxPaise } : {}),
  };
}

function taxFromApi(lines: unknown): TaxLineForm[] {
  if (!Array.isArray(lines)) return [];
  return lines.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      code: String(r.code ?? ""),
      label: String(r.label ?? ""),
      base: String(r.base ?? "METAL_SUBTOTAL"),
      ratePercent: String(r.ratePercent ?? ""),
      active: r.active !== false,
    };
  });
}

export function DigitalMetalsAssetPicker({
  value,
  onChange,
  assets,
}: {
  value: string;
  onChange: (key: string) => void;
  assets: CapabilityAsset[];
}) {
  const options = assets.filter((a) => a.metal && a.finenessPpm != null);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="max-w-md">
        <SelectValue placeholder="Select asset" />
      </SelectTrigger>
      <SelectContent>
        {options.map((a) => {
          const key = assetKey(String(a.metal), Number(a.finenessPpm));
          return (
            <SelectItem key={key} value={key}>
              {formatAssetLabel(String(a.metal), Number(a.finenessPpm))}
              {a.quoteReady ? "" : " (not quote-ready)"}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function settingsIdentity(current: Record<string, unknown> | null): string {
  if (!current) return "none";
  return `${current.metal}:${current.finenessPpm}:v${current.version ?? 0}:${current.id ?? ""}`;
}

export function currentMatchesSettingsAsset(
  current: Record<string, unknown> | null,
  metal: string,
  finenessPpm: number,
): boolean {
  return (
    current != null
    && String(current.metal) === metal
    && Number(current.finenessPpm) === finenessPpm
  );
}

export { feeFromApi, feeToApi, taxFromApi };

export function DigitalMetalsSettingsEditor({ canWrite }: { canWrite: boolean }) {
  const capability = useGetDigitalMetalsCapabilityQuery();
  const assets = (capability.data?.assets ?? []) as CapabilityAsset[];
  const defaultKey = assets[0]?.metal
    ? assetKey(String(assets[0].metal), Number(assets[0].finenessPpm))
    : "GOLD:999000";
  const [assetSel, setAssetSel] = useState<string>(defaultKey);
  const parsed = parseAssetKey(assetSel) ?? { metal: "GOLD" as const, finenessPpm: 999_000 };

  const settings = useGetDigitalMetalsSettingsQuery({
    metal: parsed.metal,
    finenessPpm: parsed.finenessPpm,
  });
  const [patchSettings, patchState] = usePatchDigitalMetalsSettingsMutation();
  const [previewQuote] = usePreviewDigitalMetalsQuoteMutation();

  const current = (settings.data?.current ?? null) as Record<string, unknown> | null;
  const live = settings.data?.liveReadiness as Record<string, unknown> | undefined;
  const version = Number(current?.version ?? 0);

  const settingsReady = settings.isSuccess && !settings.isFetching;
  const settingsFailed = settings.isError;
  const currentMatchesAsset = currentMatchesSettingsAsset(
    current,
    parsed.metal,
    parsed.finenessPpm,
  );

  const [buyFee, setBuyFee] = useState(defaultFee());
  const [sellFee, setSellFee] = useState(defaultFee());
  const [taxLines, setTaxLines] = useState<TaxLineForm[]>([]);
  const [holdingDays, setHoldingDays] = useState("0");
  const [previewBudget, setPreviewBudget] = useState("6000");
  const [previewOut, setPreviewOut] = useState<Record<string, unknown> | null>(null);
  const [formBoundTo, setFormBoundTo] = useState<string>("");
  const [draftDirty, setDraftDirty] = useState(false);

  useEffect(() => {
    if (!assets.length) return;
    const valid = assets
      .filter((a) => a.metal && a.finenessPpm != null)
      .map((a) => assetKey(String(a.metal), Number(a.finenessPpm)));
    if (valid.length && !valid.includes(assetSel as `${"GOLD" | "SILVER"}:${number}`)) {
      setAssetSel(valid[0]!);
    }
  }, [assets, assetSel]);

  useEffect(() => {
    setPreviewOut(null);
  }, [assetSel]);

  useEffect(() => {
    if (!settingsReady || draftDirty) return;
    const identity = currentMatchesAsset ? settingsIdentity(current) : `new:${parsed.metal}:${parsed.finenessPpm}`;
    if (formBoundTo === identity) return;
    if (currentMatchesAsset && current) {
      setBuyFee(feeFromApi(current.buyFee as Record<string, unknown>));
      setSellFee(feeFromApi(current.sellFee as Record<string, unknown>));
      setTaxLines(taxFromApi(current.taxLines));
      setHoldingDays(String(current.holdingPeriodDays ?? 0));
    } else {
      setBuyFee(defaultFee());
      setSellFee(defaultFee());
      setTaxLines([]);
      setHoldingDays("0");
    }
    setFormBoundTo(identity);
  }, [
    settingsReady,
    currentMatchesAsset,
    current,
    parsed.metal,
    parsed.finenessPpm,
    draftDirty,
    formBoundTo,
  ]);

  const taxApproved = live?.taxProfileApproved === true;
  const saveBlocked =
    !canWrite
    || !settingsReady
    || settings.isFetching
    || patchState.isLoading
    || settingsFailed;

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setDraftDirty(true);
      setter(v);
    };
  }

  async function onSave() {
    if (saveBlocked) return;
    if (holdingDays.trim() === "" || Number.isNaN(Number(holdingDays))) {
      toast.error("Holding period must be a valid number (zero is allowed).");
      return;
    }
    for (const t of taxLines) {
      if (t.code.trim() && t.ratePercent.trim() === "") {
        toast.error("Tax lines need a rate or must be removed.");
        return;
      }
    }
    try {
      await patchSettings({
        expectedVersion: version || 1,
        metal: parsed.metal,
        finenessPpm: parsed.finenessPpm,
        buyFee: feeToApi(buyFee),
        sellFee: feeToApi(sellFee),
        taxLines: taxLines
          .filter((t) => t.code.trim())
          .map((t) => ({
            code: t.code.trim(),
            label: t.label.trim() || undefined,
            base: t.base,
            ratePercent: Number(t.ratePercent),
            active: t.active,
          })),
        holdingPeriodDays: Number(holdingDays),
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      toast.success("Settings version published");
      setDraftDirty(false);
      await settings.refetch();
      capability.refetch();
    } catch (e) {
      const err = e as { data?: { error?: { code?: string; message?: string } } };
      if (err?.data?.error?.code === "VERSION_CONFLICT") {
        toast.error("Settings changed elsewhere — review the latest version, then save again.");
        await settings.refetch();
        setDraftDirty(true);
        return;
      }
      toast.error(String(err?.data?.error?.message ?? "Save failed"));
    }
  }

  return (
    <Surface title="Asset settings" description="Fees, tax lines and holding period for each metal. Every publish creates a new version.">
      <div className="space-y-5 p-5">
        <FieldLabel>Asset</FieldLabel>
        <DigitalMetalsAssetPicker
          value={assetSel}
          onChange={(key) => {
            setAssetSel(key);
            setDraftDirty(false);
            setFormBoundTo("");
          }}
          assets={assets}
        />
        {settings.isFetching ? (
          <p className="text-sm text-muted-foreground">Loading settings for {formatAssetLabel(parsed.metal, parsed.finenessPpm)}…</p>
        ) : null}
        {settingsFailed ? (
          <p className="text-sm text-destructive">Could not load settings for this asset.</p>
        ) : null}
        {!currentMatchesAsset && settingsReady && !settings.isFetching ? (
          <p className="text-sm text-amber-800">No published settings for this asset yet — configure and publish v1.</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Version {currentMatchesAsset ? version || "—" : "—"}. Tax approval:{" "}
          {taxApproved ? "current fingerprint" : "required before customer trading"}.
          Platform must approve tax after material settings/tax changes.
        </p>

        <FeeEditor label="Buy fee" value={buyFee} onChange={markDirty(setBuyFee)} disabled={!canWrite || !settingsReady} />
        <FeeEditor label="Sell fee" value={sellFee} onChange={markDirty(setSellFee)} disabled={!canWrite || !settingsReady} />

        <div className="space-y-2">
          <FieldLabel>Tax lines (explicit — empty list clears only when you remove all rows and save)</FieldLabel>
          {taxLines.map((line, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-2 rounded-xl border border-[#efe5e1] bg-[#fcf9f8] p-3">
              <Input
                placeholder="Code"
                value={line.code}
                disabled={!canWrite}
                onChange={(e) => {
                  const next = [...taxLines];
                  next[idx] = { ...line, code: e.target.value };
                  markDirty(setTaxLines)(next);
                }}
                className="max-w-[120px]"
              />
              <Input
                placeholder="Label"
                value={line.label}
                disabled={!canWrite}
                onChange={(e) => {
                  const next = [...taxLines];
                  next[idx] = { ...line, label: e.target.value };
                  markDirty(setTaxLines)(next);
                }}
                className="max-w-[160px]"
              />
              <Input
                placeholder="Rate %"
                value={line.ratePercent}
                disabled={!canWrite}
                onChange={(e) => {
                  const next = [...taxLines];
                  next[idx] = { ...line, ratePercent: e.target.value };
                  markDirty(setTaxLines)(next);
                }}
                className="max-w-[100px]"
              />
              <label className="flex items-center gap-1 text-xs">
                <Checkbox
                  checked={line.active}
                  disabled={!canWrite}
                  onCheckedChange={(v) => {
                    const next = [...taxLines];
                    next[idx] = { ...line, active: v === true };
                    markDirty(setTaxLines)(next);
                  }}
                />
                Active
              </label>
              {canWrite ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => markDirty(setTaxLines)(taxLines.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          {canWrite ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                markDirty(setTaxLines)([
                  ...taxLines,
                  { code: "", label: "", base: "METAL_SUBTOTAL", ratePercent: "", active: true },
                ])
              }
            >
              Add tax line
            </Button>
          ) : null}
        </div>

        <FieldLabel>Holding period (days)</FieldLabel>
        <Input
          value={holdingDays}
          disabled={!canWrite}
          onChange={(e) => markDirty(setHoldingDays)(e.target.value)}
          className="max-w-[120px]"
        />

        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <Button type="button" onClick={() => void onSave()} disabled={saveBlocked}>
              Publish settings v{version + 1 || 1}
            </Button>
          ) : (
            <p className="text-sm text-amber-800">You need digital-metals.settings.write.</p>
          )}
        </div>

        <div className="rounded-xl border border-[#efe5e1] p-4">
          <FieldLabel>Quote preview (buy, budget INR)</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <Input value={previewBudget} onChange={(e) => setPreviewBudget(e.target.value)} className="max-w-xs" />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const budgetPaise = Math.round(Number(previewBudget) * 100);
                void previewQuote({
                  side: "BUY",
                  metal: parsed.metal,
                  finenessPpm: parsed.finenessPpm,
                  inputMode: "BUDGET_INR",
                  budgetPaise,
                  idempotencyKey: newIdempotencyKey(),
                })
                  .unwrap()
                  .then((data) => setPreviewOut(data as Record<string, unknown>))
                  .catch((e) => toast.error(String(e?.data?.error?.message ?? "Preview failed")));
              }}
            >
              Preview
            </Button>
          </div>
          {previewOut ? (
            <DigitalMetalsQuoteBreakdown quote={previewOut} className="mt-2" />
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

function FeeEditor({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: FeeForm;
  onChange: (v: FeeForm) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-[#efe5e1] bg-[#fcf9f8] p-4">
      <p className="text-sm font-medium">{label}</p>
      <Select
        value={value.type}
        disabled={disabled}
        onValueChange={(t) => onChange({ ...value, type: t as FeeForm["type"] })}
      >
        <SelectTrigger className="max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE">No fee</SelectItem>
          <SelectItem value="FLAT_INR">Flat INR</SelectItem>
          <SelectItem value="PERCENT">Percentage</SelectItem>
        </SelectContent>
      </Select>
      {value.type === "FLAT_INR" ? (
        <div className="max-w-xs space-y-1">
          <FieldLabel>Flat fee (₹)</FieldLabel>
          <Input
            inputMode="decimal"
            placeholder="e.g. 50"
            disabled={disabled}
            value={value.amountPaise}
            onChange={(e) => onChange({ ...value, amountPaise: e.target.value })}
          />
        </div>
      ) : null}
      {value.type === "PERCENT" ? (
        <div className="flex flex-wrap gap-2">
          <div className="space-y-1">
            <FieldLabel>Percent</FieldLabel>
            <Input
              inputMode="decimal"
              placeholder="e.g. 1.5"
              disabled={disabled}
              value={value.percent}
              onChange={(e) => onChange({ ...value, percent: e.target.value })}
              className="max-w-[100px]"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Min fee (₹, optional)</FieldLabel>
            <Input
              inputMode="decimal"
              disabled={disabled}
              value={value.minPaise}
              onChange={(e) => onChange({ ...value, minPaise: e.target.value })}
              className="max-w-[140px]"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Max fee (₹, optional)</FieldLabel>
            <Input
              inputMode="decimal"
              disabled={disabled}
              value={value.maxPaise}
              onChange={(e) => onChange({ ...value, maxPaise: e.target.value })}
              className="max-w-[140px]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function useConfigAssetSelection(capabilityAssets: CapabilityAsset[]) {
  return useMemo(() => {
    const first = capabilityAssets.find((a) => a.metal && a.finenessPpm != null);
    return first ? assetKey(String(first.metal), Number(first.finenessPpm)) : "GOLD:999000";
  }, [capabilityAssets]);
}
