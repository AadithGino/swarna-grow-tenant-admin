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

export type ComponentLineForm = {
  componentKey: string;
  label: string;
  rateBps: string;
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
    hint: "Checkout blocked until an accountant workflow is chosen.",
  },
  {
    value: "SINGLE_ESTIMATE_ONLY",
    label: "Display estimate only",
    hint: "Catalog may show single-rate estimates; live checkout stays blocked.",
  },
  {
    value: "ACCOUNTANT_COMPONENT_APPROVED",
    label: "Accountant component lines (checkout)",
    hint: "Requires seller details, approval evidence, and CGST/SGST or IGST lines entered by your accountant.",
  },
] as const;

function emptyLine(): ComponentLineForm {
  return { componentKey: "", label: "", rateBps: "" };
}

export function checkoutTaxFormFromApi(
  cfg: Record<string, unknown> | undefined,
): CheckoutTaxFormState {
  const rules = (cfg?.componentRules as { supplyCase?: string; componentLines?: Record<string, unknown>[] }[]) ?? [];
  const intraRule = rules.find((r) => r.supplyCase === "INTRA_STATE");
  const interRule = rules.find((r) => r.supplyCase === "INTER_STATE");
  const mapLines = (lines: Record<string, unknown>[] | undefined) =>
    (lines?.length ? lines : [emptyLine()]).map((line) => ({
      componentKey: String(line.componentKey ?? ""),
      label: String(line.label ?? ""),
      rateBps: line.rateBps != null ? String(line.rateBps) : "",
    }));
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
      .filter((r) => r.componentKey.trim() && r.label.trim() && Number.isInteger(Number(r.rateBps)))
      .map((r) => ({
        componentKey: r.componentKey.trim(),
        label: r.label.trim(),
        rateBps: Number(r.rateBps),
      }));

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
  lines,
  disabled,
  onChange,
  blockers,
  fieldKey,
}: {
  title: string;
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
    <div className="space-y-2 rounded-xl border border-[#efe7e1] p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-[#362a2e]">{title}</h4>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...lines, emptyLine()])}
        >
          Add line
        </Button>
      </div>
      <BlockerHints blockers={blockers} fieldKey={fieldKey} />
      {lines.map((line, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-3">
          <Input
            placeholder="Key (e.g. CGST)"
            value={line.componentKey}
            disabled={disabled}
            onChange={(e) => updateLine(index, { componentKey: e.target.value })}
          />
          <Input
            placeholder="Label"
            value={line.label}
            disabled={disabled}
            onChange={(e) => updateLine(index, { label: e.target.value })}
          />
          <Input
            placeholder="Rate (bps)"
            value={line.rateBps}
            disabled={disabled}
            inputMode="numeric"
            onChange={(e) => updateLine(index, { rateBps: e.target.value })}
          />
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
    <div className="space-y-4">
      <p className="rounded-xl bg-[#f8f4ef] px-4 py-3 text-xs leading-5 text-[#5d4c43]">
        Saving this form stores what your accountant supplied. It does not replace professional
        sign-off — enter the reference and approval date from your accountant&apos;s records.
      </p>
      <div>
        <FieldLabel>Checkout tax presentation</FieldLabel>
        <Select
          value={form.presentation}
          disabled={disabled}
          onValueChange={(v) => setForm({ ...form, presentation: v })}
        >
          <SelectTrigger>
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
          <p className="mt-1 text-xs text-muted-foreground">{selectedPresentation.hint}</p>
        ) : null}
        <BlockerHints blockers={blockers} fieldKey="presentation" />
      </div>

      {form.presentation === "ACCOUNTANT_COMPONENT_APPROVED" ? (
        <>
          <FieldLabel>Seller legal name</FieldLabel>
          <Input
            value={form.sellerLegalName}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, sellerLegalName: e.target.value })}
          />
          <BlockerHints blockers={blockers} fieldKey="sellerLegalName" />

          <FieldLabel>Seller GSTIN (15 characters, accountant verified)</FieldLabel>
          <Input
            value={form.sellerGstin}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, sellerGstin: e.target.value })}
            className="font-mono uppercase"
          />
          <BlockerHints blockers={blockers} fieldKey="sellerGstin" />

          <FieldLabel>Registered state</FieldLabel>
          <Input
            value={form.registeredState}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, registeredState: e.target.value })}
          />
          <BlockerHints blockers={blockers} fieldKey="registeredState" />

          <FieldLabel>Default place of supply (pickup)</FieldLabel>
          <Input
            value={form.defaultPlaceOfSupplyState}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, defaultPlaceOfSupplyState: e.target.value })}
          />
          <BlockerHints blockers={blockers} fieldKey="defaultPlaceOfSupplyState" />

          <FieldLabel>Default item tax classification</FieldLabel>
          <Input
            value={form.defaultItemTaxClassification}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, defaultItemTaxClassification: e.target.value })}
            className="font-mono"
          />
          <BlockerHints blockers={blockers} fieldKey="defaultItemTaxClassification" />

          <FieldLabel>Accountant sign-off reference</FieldLabel>
          <Input
            value={form.accountantSignOffReference}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, accountantSignOffReference: e.target.value })}
          />
          <BlockerHints blockers={blockers} fieldKey="accountantSignOffReference" />

          <FieldLabel>Accountant approved at</FieldLabel>
          <Input
            type="datetime-local"
            value={form.accountantApprovedAt}
            disabled={disabled}
            onChange={(e) => setForm({ ...form, accountantApprovedAt: e.target.value })}
          />
          <BlockerHints blockers={blockers} fieldKey="accountantApprovedAt" />

          <FieldLabel>Supported destination states (delivery / inter-state)</FieldLabel>
          <Textarea
            value={form.supportedDestinationStatesText}
            disabled={disabled}
            rows={3}
            placeholder="One state per line"
            onChange={(e) => setForm({ ...form, supportedDestinationStatesText: e.target.value })}
          />
          <BlockerHints blockers={blockers} fieldKey="supportedDestinationStates" />

          <ComponentLinesEditor
            title="Intra-state component lines (CGST/SGST)"
            lines={form.intraLines}
            disabled={disabled}
            blockers={blockers}
            fieldKey="componentRules"
            onChange={(intraLines) => setForm({ ...form, intraLines })}
          />
          <ComponentLinesEditor
            title="Inter-state component lines (IGST)"
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
