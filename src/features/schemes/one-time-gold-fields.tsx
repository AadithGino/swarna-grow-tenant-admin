import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldLabel } from "@/src/components/common/page-parts";
import type { OneTimeGoldRules } from "@/src/types/one-time-gold";

export function OneTimeGoldFields({ rules, disabled, onChange }: {
  rules: OneTimeGoldRules;
  disabled?: boolean;
  onChange: (rules: OneTimeGoldRules) => void;
}) {
  const id = useId();
  const units = rules.basis === "FIXED_WEIGHT_MG" ? 1000 : rules.basis === "RUPEE_PAISE" ? 100 : 1;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <FieldLabel htmlFor={`${id}-timing`}>Bonus credit timing</FieldLabel>
        <Select value={rules.timing} disabled={disabled} onValueChange={(timing: OneTimeGoldRules["timing"]) =>
          onChange({ ...rules, timing, amountPeriod: timing === "AT_MATURITY" ? "TERM_TOTAL" : rules.amountPeriod })}>
          <SelectTrigger id={`${id}-timing`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="AT_MATURITY">At maturity</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-basis`}>Calculate bonus as</FieldLabel>
        <Select value={rules.basis} disabled={disabled} onValueChange={(basis: OneTimeGoldRules["basis"]) => onChange({ ...rules, basis, value: 0 })}>
          <SelectTrigger id={`${id}-basis`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PRINCIPAL_PERCENT">Percentage of principal gold</SelectItem>
            <SelectItem value="FIXED_WEIGHT_MG">Fixed gold weight</SelectItem>
            <SelectItem value="RUPEE_PAISE">Rupee amount converted to gold</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rules.timing === "MONTHLY" && <div>
        <FieldLabel htmlFor={`${id}-period`}>Amount applies to</FieldLabel>
        <Select value={rules.amountPeriod} disabled={disabled} onValueChange={(amountPeriod: OneTimeGoldRules["amountPeriod"]) => onChange({ ...rules, amountPeriod })}>
          <SelectTrigger id={`${id}-period`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TERM_TOTAL">Whole term, split across months</SelectItem>
            <SelectItem value="PER_PERIOD">Each month</SelectItem>
          </SelectContent>
        </Select>
      </div>}
      <div>
        <FieldLabel htmlFor={`${id}-value`}>Bonus ({rules.basis === "PRINCIPAL_PERCENT" ? "%" : rules.basis === "FIXED_WEIGHT_MG" ? "g" : "₹"})</FieldLabel>
        <Input id={`${id}-value`} type="number" min={1 / units} step={1 / units} disabled={disabled}
          value={rules.value ? rules.value / units : ""} onChange={(event) => onChange({ ...rules, value: Math.round(Number(event.target.value) * units) })} />
      </div>
    </div>
  );
}
