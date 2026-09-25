"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import { sanitizeIndianPhoneDigits } from "@/src/lib/customer-form";
import { cn } from "@/lib/utils";

type FieldShellProps = {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
};

export function FormFieldShell({ label, error, children, hint }: FieldShellProps) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint && !error ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <FormFieldError message={error} />
    </div>
  );
}

const invalidClass = (invalid: boolean) => cn(invalid && "border-red-600");

type CustomerNameInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export function CustomerNameInput({
  value,
  onChange,
  onBlur,
  error,
}: CustomerNameInputProps) {
  return (
    <FormFieldShell label="Full name" error={error}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        maxLength={120}
        className={invalidClass(Boolean(error))}
        aria-invalid={Boolean(error)}
        autoComplete="name"
        placeholder="Customer full name"
      />
    </FormFieldShell>
  );
}

type CustomerPhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export function CustomerPhoneInput({
  value,
  onChange,
  onBlur,
  error,
}: CustomerPhoneInputProps) {
  return (
    <FormFieldShell
      label="Mobile number"
      error={error}
      hint={!error && value.length > 0 ? `${value.length}/10 digits` : undefined}
    >
      <Input
        value={value}
        onChange={(e) => onChange(sanitizeIndianPhoneDigits(e.target.value))}
        onBlur={onBlur}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        placeholder="10-digit mobile"
        className={invalidClass(Boolean(error))}
        aria-invalid={Boolean(error)}
        autoComplete="tel"
      />
    </FormFieldShell>
  );
}

type CustomerEmailInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export function CustomerEmailInput({
  value,
  onChange,
  onBlur,
  error,
}: CustomerEmailInputProps) {
  return (
    <FormFieldShell label="Email (optional)" error={error}>
      <Input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        maxLength={254}
        placeholder="name@example.com"
        className={invalidClass(Boolean(error))}
        aria-invalid={Boolean(error)}
        autoComplete="email"
      />
    </FormFieldShell>
  );
}

type CustomerAddressInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export function CustomerAddressInput({
  value,
  onChange,
  onBlur,
  error,
}: CustomerAddressInputProps) {
  return (
    <FormFieldShell
      label="Address"
      error={error}
      hint={
        !error && value.length > 900
          ? `${1000 - value.length} characters left`
          : undefined
      }
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        maxLength={1000}
        className={invalidClass(Boolean(error))}
        aria-invalid={Boolean(error)}
        autoComplete="street-address"
      />
    </FormFieldShell>
  );
}
