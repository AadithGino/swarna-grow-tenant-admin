"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/src/components/common/page-parts";
import { Button } from "@/components/ui/button";
import {
  blockersForField,
  CHECKOUT_BLOCKER_TAX_LINK,
  type CheckoutBlocker,
} from "@/src/features/ecommerce/ecommerce-checkout-blockers";
import {
  gstBpsFromPercentInput,
  gstPercentFromBps,
} from "@/src/features/ecommerce/ecommerce-settings-ui";

export type ComponentLineForm = {
  componentKey: string;
  label: string;
  rateBps: string;
  ratePercent?: string;
};

export type CheckoutTaxFormState = {
  presentation: string;
  sellerLegalName: string;
  sellerGstin: string;
  registeredState: string;
  defaultPlaceOfSupplyState: string;
  defaultItemTaxClassification: string;
  accountantSignOffReference: string;
  accountantApprovedAt: string;
  supportedDestinationStatesText: string;
  intraLines: ComponentLineForm[];
  interLines: ComponentLineForm[];
};

const PRESENTATION_OPTIONS = [
  {
    value: "UNCONFIGURED",
    label: "Not configured",
    hint: "Checkout blocked until you choose how tax appears at payment.",
  },
  {
    value: "SINGLE_ESTIMATE_ONLY",
    label: "Catalog estimate only",
    hint: "Products may show a single rate; live checkout stays blocked.",
  },
  {
    value: "ACCOUNTANT_COMPONENT_APPROVED",
    label: "Full GST breakdown at checkout",
    hint: "Use when your accountant supplied CGST/SGST or IGST component lines.",
  },
] as const;

function emptyLine(): ComponentLineForm {
  return { componentKey: "", label: "", rateBps: "", ratePercent: "" };
}

export function checkoutTaxFormFromApi(
  cfg: Record<string, unknown> | undefined,
): CheckoutTaxFormState {
  const rules = (cfg?.componentRules as { supplyCase?: string; componentLines?: Record<string, unknown>[] }[]) ?? [];
  const intraRule = rules.find((r) => r.supplyCase === "INTRA_STATE");
  const interRule = rules.find((r) => r.supplyCase === "INTER_STATE");
  const mapLines = (lines: Record<string, unknown>[] | undefined) =>
    (lines?.length ? lines : [emptyLine()]).map((line) => {
      const bps = line.rateBps != null ? Number(line.rateBps) : NaN;
      return {
        componentKey: String(line.componentKey ?? ""),
        label: String(line.label ?? ""),
        rateBps: line.rateBps != null ? String(line.rateBps) : "",
        ratePercent: Number.isFinite(bps) ? gstPercentFromBps(bps) : "",
      };
    });
  const legacy = (cfg?.componentLines as Record<string, unknown>[]) ?? [];
  return {
    presentation: String(cfg?.presentation ?? "UNCONFIGURED"),
    sellerLegalName: String(cfg?.sellerLegalName ?? ""),
    sellerGstin: String(cfg?.sellerGstin ?? ""),
    registeredState: String(cfg?.registeredState ?? ""),
    defaultPlaceOfSupplyState: String(cfg?.defaultPlaceOfSupplyState ?? ""),
    defaultItemTaxClassification: String(cfg?.defaultItemTaxClassification ?? ""),
    accountantSignOffReference: String(cfg?.accountantSignOffReference ?? ""),
    accountantApprovedAt: cfg?.accountantApprovedAt
      ? String(cfg.accountantApprovedAt).slice(0, 16)
      : "",
    supportedDestinationStatesText: ((cfg?.supportedDestinationStates as string[]) ?? []).join("\n"),
    intraLines: mapLines(intraRule?.componentLines?.length ? intraRule.componentLines : legacy),
    interLines: mapLines(interRule?.componentLines),
  };
}

export function checkoutTaxConfigPayload(form: CheckoutTaxFormState) {
  const parseLines = (rows: ComponentLineForm[]) =>
    rows
      .filter((r) => r.componentKey.trim() && r.label.trim())
      .map((r) => {
        const bps =
          r.ratePercent != null && r.ratePercent !== ""
            ? gstBpsFromPercentInput(r.ratePercent)
            : Number(r.rateBps);
        return {
          componentKey: r.componentKey.trim(),
          label: r.label.trim(),
          rateBps: bps,
        };
      })
      .filter((r) => Number.isInteger(r.rateBps));

  const intraLines = parseLines(form.intraLines);
  const interLines = parseLines(form.interLines);
  const supportedDestinationStates = form.supportedDestinationStatesText
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const payload: Record<string, unknown> = {
    presentation: form.presentation,
    sellerLegalName: form.sellerLegalName.trim(),
    sellerGstin: form.sellerGstin.trim(),
    registeredState: form.registeredState.trim(),
    defaultPlaceOfSupplyState: form.defaultPlaceOfSupplyState.trim(),
    defaultItemTaxClassification: form.defaultItemTaxClassification.trim(),
    accountantSignOffReference: form.accountantSignOffReference.trim(),
    accountantApprovedAt: form.accountantApprovedAt
      ? new Date(form.accountantApprovedAt).toISOString()
      : undefined,
    supportedDestinationStates,
  };

  if (form.presentation === "ACCOUNTANT_COMPONENT_APPROVED") {
    payload.componentLines = intraLines;
    payload.componentRules = [
      { supplyCase: "INTRA_STATE", componentLines: intraLines },
      { supplyCase: "INTER_STATE", componentLines: interLines },
    ];
  }

  return payload;
}

function BlockerHints({
  blockers,
  fieldKey,
}: {
  blockers: CheckoutBlocker[];
  fieldKey: string;
}) {
  const matched = blockersForField(blockers, fieldKey);
  if (!matched.length) return null;
  return (
    <ul className="mt-1 space-y-1 text-xs text-amber-900">
      {matched.map((b) => (
        <li key={b.code ?? b.message}>
          {b.message ?? b.code}
          {b.code && CHECKOUT_BLOCKER_TAX_LINK.has(b.code) ? (
            <>
              {" "}
              <Link href="/ecommerce/tax" className="font-semibold text-[#730321] underline">
                Tax settings
              </Link>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ComponentLinesEditor({
  title,
  description,
  lines,
  disabled,
  onChange,
  blockers,
  fieldKey,
}: {
  title: string;
  description?: string;
  lines: ComponentLineForm[];
  disabled: boolean;
  onChange: (lines: ComponentLineForm[]) => void;
  blockers: CheckoutBlocker[];
  fieldKey: string;
}) {
  function updateLine(index: number, patch: Partial<ComponentLineForm>) {
    onChange(lines.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#eaded9] bg-[#faf7f5] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-bold text-[#362a2e]">{title}</h4>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...lines, emptyLine()])}
        >
          Add component
        </Button>
      </div>
      <BlockerHints blockers={blockers} fieldKey={fieldKey} />
      <div className="hidden grid-cols-[100px_minmax(0,1fr)_88px_40px] gap-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:grid">
        <span>Key</span>
        <span>Label on receipt</span>
        <span>Rate %</span>
        <span />
      </div>
      {lines.map((line, index) => (
        <div
          key={index}
          className="grid gap-2 sm:grid-cols-[100px_minmax(0,1fr)_88px_40px] sm:items-center"
        >
          <Input
            placeholder="CGST"
            value={line.componentKey}
            disabled={disabled}
            onChange={(e) => updateLine(index, { componentKey: e.target.value })}
            className="h-10 font-mono uppercase"
          />
          <Input
            placeholder="Central GST"
            value={line.label}
            disabled={disabled}
            onChange={(e) => updateLine(index, { label: e.target.value })}
            className="h-10"
          />
          <Input
            placeholder="1.5"
            value={line.ratePercent ?? (line.rateBps ? gstPercentFromBps(Number(line.rateBps)) : "")}
            disabled={disabled}
            inputMode="decimal"
            onChange={(e) => {
              const ratePercent = e.target.value;
              updateLine(index, {
                ratePercent,
                rateBps: String(gstBpsFromPercentInput(ratePercent)),
              });
            }}
            className="h-10 tabular-nums"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || lines.length <= 1}
            className="text-muted-foreground"
            onClick={() => onChange(lines.filter((_, i) => i !== index))}
            aria-label="Remove line"
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  );
}

export function EcommerceCheckoutTaxPanel({
  form,
  setForm,
  blockers,
  disabled,
}: {
  form: CheckoutTaxFormState;
  setForm: (next: CheckoutTaxFormState) => void;
  blockers: CheckoutBlocker[];
  disabled: boolean;
}) {
  const selectedPresentation = PRESENTATION_OPTIONS.find((o) => o.value === form.presentation);

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>How should tax appear at payment?</FieldLabel>
        <Select
          value={form.presentation}
          disabled={disabled}
          onValueChange={(v) => setForm({ ...form, presentation: v })}
        >
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESENTATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPresentation?.hint ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{selectedPresentation.hint}</p>
        ) : null}
        <BlockerHints blockers={blockers} fieldKey="presentation" />
      </div>

      {form.presentation === "ACCOUNTANT_COMPONENT_APPROVED" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Seller legal name (on invoice)</FieldLabel>
              <Input
                value={form.sellerLegalName}
                disabled={disabled}
                onChange={(e) => setForm({ ...form, sellerLegalName: e.target.value })}
                className="h-11"
              />
              <BlockerHints blockers={blockers} fieldKey="sellerLegalName" />
            </div>
            <div>
              <FieldLabel>GSTIN (15 characters)</FieldLabel>
              <Input
                value={form.sellerGstin}
                disabled={disabled}
                onChange={(e) => setForm({ ...form, sellerGstin: e.target.value })}
                className="h-11 font-mono uppercase"
              />
              <BlockerHints blockers={blockers} fieldKey="sellerGstin" />
            </div>
            <div>
              <FieldLabel>Registered state</FieldLabel>
              <Input
                value={form.registeredState}
                disabled={disabled}
                onChange={(e) => setForm({ ...form, registeredState: e.target.value })}
                className="h-11"
              />
              <BlockerHints blockers={blockers} fieldKey="registeredState" />
            </div>
            <div>
              <FieldLabel>Default place of supply (pickup orders)</FieldLabel>
              <Input
                value={form.defaultPlaceOfSupplyState}
                disabled={disabled}
                onChange={(e) => setForm({ ...form, defaultPlaceOfSupplyState: e.target.value })}
                className="h-11"
              />
              <BlockerHints blockers={blockers} fieldKey="defaultPlaceOfSupplyState" />
            </div>
            <div>
              <FieldLabel>Default item tax classification</FieldLabel>
              <Input
                value={form.defaultItemTaxClassification}
                disabled={disabled}
                onChange={(e) =>
                  setForm({ ...form, defaultItemTaxClassification: e.target.value })
                }
                className="h-11 font-mono"
              />
              <BlockerHints blockers={blockers} fieldKey="defaultItemTaxClassification" />
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-[#eaded9] bg-white p-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Accountant sign-off reference</FieldLabel>
              <Input
                value={form.accountantSignOffReference}
                disabled={disabled}
                onChange={(e) =>
                  setForm({ ...form, accountantSignOffReference: e.target.value })
                }
                placeholder="Email / memo / file ref"
                className="h-11"
              />
              <BlockerHints blockers={blockers} fieldKey="accountantSignOffReference" />
            </div>
            <div>
              <FieldLabel>Accountant approved on</FieldLabel>
              <Input
                type="datetime-local"
                value={form.accountantApprovedAt}
                disabled={disabled}
                onChange={(e) => setForm({ ...form, accountantApprovedAt: e.target.value })}
                className="h-11"
              />
              <BlockerHints blockers={blockers} fieldKey="accountantApprovedAt" />
            </div>
          </div>

          <div>
            <FieldLabel>States you deliver to (for inter-state IGST)</FieldLabel>
            <Textarea
              value={form.supportedDestinationStatesText}
              disabled={disabled}
              rows={3}
              placeholder="Kerala&#10;Tamil Nadu&#10;(one per line)"
              onChange={(e) =>
                setForm({ ...form, supportedDestinationStatesText: e.target.value })
              }
              className="text-sm"
            />
            <BlockerHints blockers={blockers} fieldKey="supportedDestinationStates" />
          </div>

          <ComponentLinesEditor
            title="Same-state orders (CGST + SGST)"
            description="Typical split when customer and seller are in the same state."
            lines={form.intraLines}
            disabled={disabled}
            blockers={blockers}
            fieldKey="componentRules"
            onChange={(intraLines) => setForm({ ...form, intraLines })}
          />
          <ComponentLinesEditor
            title="Other-state delivery (IGST)"
            description="When place of supply is outside your registered state."
            lines={form.interLines}
            disabled={disabled}
            blockers={blockers}
            fieldKey="componentRules"
            onChange={(interLines) => setForm({ ...form, interLines })}
          />
        </>
      ) : null}
    </div>
  );
}
