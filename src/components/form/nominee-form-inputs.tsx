"use client";

import { Textarea } from "@/components/ui/textarea";
import {
  CustomerNameInput,
  CustomerPhoneInput,
  FormFieldShell,
} from "@/src/components/form/customer-form-inputs";
import { NOMINEE_NOTES_MAX } from "@/src/lib/nominee-form";
import { cn } from "@/lib/utils";

export { CustomerNameInput as NomineeNameInput };
export { CustomerPhoneInput as NomineeMobileInput };

type NomineeNotesInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export function NomineeNotesInput({
  value,
  onChange,
  onBlur,
  error,
}: NomineeNotesInputProps) {
  return (
    <FormFieldShell
      label="Notes (optional)"
      error={error}
      hint={
        !error && value.length > NOMINEE_NOTES_MAX - 50
          ? `${NOMINEE_NOTES_MAX - value.length} characters left`
          : undefined
      }
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={3}
        maxLength={NOMINEE_NOTES_MAX}
        placeholder="Operational contact note only"
        className={cn(error && "border-red-600")}
        aria-invalid={Boolean(error)}
      />
    </FormFieldShell>
  );
}
