"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldLabel } from "@/src/components/common/page-parts";
import { FormSection, ToggleRow } from "./plan-builder-ui";
import { money } from "@/src/lib/format";
import type { SchemePurchaseRules } from "./plan-builder-form";

export function SchemePurchaseFields({ rules, onChange, gold, locked }: {
  rules?: SchemePurchaseRules;
  onChange: (rules?: SchemePurchaseRules) => void;
  gold: boolean;
  locked: boolean;
}) {
  const waiver = rules?.makingChargeWaiver;
  const honour = waiver?.kind === "FULL" ? "Full making-charge waiver"
    : waiver?.kind === "PERCENT" ? `${waiver.basisPoints / 100}% off making charges`
    : waiver?.kind === "FIXED" ? `${money(waiver.amountPaise / 100)} off making charges` : undefined;
  const set = (patch: Partial<SchemePurchaseRules>) => {
    if (rules) onChange({ ...rules, ...patch });
  };
  return (
    <FormSection title="Purchase adjustment and making-charge honour">
      <ToggleRow
        label="Configure scheme purchases"
        checked={Boolean(rules)}
        disabled={locked}
        onCheckedChange={(enabled) => onChange(enabled ? { channel: "BRANCH", settlementBases: ["CASH_VALUE"] } : undefined)}
      />
      {rules && (
        <fieldset disabled={locked} className="space-y-4">
          <div>
            <FieldLabel>Purchase channel</FieldLabel>
            <Select value={rules.channel} onValueChange={(value) => set({ channel: value as SchemePurchaseRules["channel"] })}>
              <SelectTrigger aria-label="Purchase channel"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRANCH">Branch</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="BOTH">Branch and online</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-sm text-muted-foreground">Staff approve online scheme purchases from the order detail page.</p>
          </div>
          {gold && (
            <div className="space-y-2">
              <FieldLabel>Settlement basis</FieldLabel>
              {([["CASH_VALUE", "Cash value"], ["GOLD_WEIGHT", "Gold weight"]] as const).map(([basis, label]) => {
                const checked = rules.settlementBases.includes(basis);
                return (
                  <label key={basis} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={checked} disabled={locked || (checked && rules.settlementBases.length === 1)}
                      onCheckedChange={(enabled) => set({ settlementBases: enabled
                        ? [...rules.settlementBases, basis]
                        : rules.settlementBases.filter((item) => item !== basis) })} />
                    {label}
                  </label>
                );
              })}
            </div>
          )}
          <div>
            <FieldLabel>Making-charge waiver</FieldLabel>
            <Select value={waiver?.kind ?? "NONE"} onValueChange={(kind) => {
              if (kind === "FULL") set({ makingChargeWaiver: { kind } });
              else if (kind === "PERCENT") set({ makingChargeWaiver: { kind, basisPoints: 5000 } });
              else if (kind === "FIXED") set({ makingChargeWaiver: { kind, amountPaise: 10000 } });
              else set({ makingChargeWaiver: undefined, waiverCapPaise: undefined });
            }}>
              <SelectTrigger aria-label="Making-charge waiver"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No waiver</SelectItem>
                <SelectItem value="FULL">Full waiver</SelectItem>
                <SelectItem value="PERCENT">Percentage</SelectItem>
                <SelectItem value="FIXED">Fixed amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {waiver?.kind === "PERCENT" && <label className="block text-sm">
            Waiver percentage
            <Input type="number" min={0.01} max={100} step={0.01} value={waiver.basisPoints / 100}
              onChange={(e) => set({ makingChargeWaiver: { kind: "PERCENT", basisPoints: Math.round(Number(e.target.value) * 100) } })} />
          </label>}
          {waiver?.kind === "FIXED" && <label className="block text-sm">
            Waiver amount (₹)
            <Input type="number" min={0.01} step={0.01} value={waiver.amountPaise / 100}
              onChange={(e) => set({ makingChargeWaiver: { kind: "FIXED", amountPaise: Math.round(Number(e.target.value) * 100) } })} />
          </label>}
          {waiver && <label className="block text-sm">
            Total waiver cap (₹, optional)
            <Input type="number" min={0.01} step={0.01} value={rules.waiverCapPaise === undefined ? "" : rules.waiverCapPaise / 100}
              onChange={(e) => set({ waiverCapPaise: e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100) })} />
          </label>}
          {honour && <p className="rounded-xl border bg-muted/30 p-3 text-sm">
            {honour}{rules.waiverCapPaise ? ` · Up to ${money(rules.waiverCapPaise / 100)} total` : ""}
          </p>}
        </fieldset>
      )}
    </FormSection>
  );
}
