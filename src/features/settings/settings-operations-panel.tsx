"use client";

import type { ReactNode } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel, Surface } from "@/src/components/common/page-parts";
import { cn } from "@/lib/utils";

export type OperationsFormState = {
  multiSchemePerCustomer: boolean;
  kycMandatory: boolean;
  requireKycForRedemption: boolean;
  customerAppMaintenance: boolean;
  kycAllowedTypes: Array<"AADHAAR" | "PAN">;
  customerSelfEnrolEnabled: boolean;
  customerSelfRegistrationEnabled: boolean;
  customerLoginMode: "OTP_ONLY" | "PASSWORD_ONLY";
  customerAppWriteEnabled: boolean;
  customerAppPaymentsEnabled: boolean;
  redemptionApprovalRequired: boolean;
  receiptPrefix: string;
  receiptNumberFormat: string;
  passbookNumberFormat: string;
  schemeNumberFormat: string;
  goldPurity: string;
  weightRoundingMode: string;
  paymentReversalWindowHours: number;
  termsAndConditions: string;
};

type PolicyKey = keyof Pick<
  OperationsFormState,
  | "multiSchemePerCustomer"
  | "kycMandatory"
  | "requireKycForRedemption"
  | "customerAppMaintenance"
  | "customerSelfEnrolEnabled"
  | "customerSelfRegistrationEnabled"
  | "customerAppWriteEnabled"
  | "customerAppPaymentsEnabled"
  | "redemptionApprovalRequired"
>;

type PolicyDef = {
  key: PolicyKey;
  title: string;
  detail: string;
  code?: string;
};

type PolicySection = {
  label: string;
  policies: PolicyDef[];
};

const FORMAT_TOKENS = [
  "{prefix}",
  "{branchCode}",
  "{planCode}",
  "{year}",
  "{seq:6}",
  "{seq:5}",
] as const;

const WEIGHT_ROUNDING_OPTIONS = [
  { value: "HALF_UP", label: "Half up" },
  { value: "ROUND_DOWN", label: "Round down" },
  { value: "ROUND_UP", label: "Round up" },
] as const;

const POLICY_SECTIONS: PolicySection[] = [
  {
    label: "Enrolment",
    policies: [
      {
        key: "multiSchemePerCustomer",
        title: "Multiple schemes per customer",
        detail: "When off, enrolment fails with ONE_SCHEME_POLICY",
        code: "ONE_SCHEME_POLICY",
      },
      {
        key: "kycMandatory",
        title: "KYC before enrolment",
        detail: "Blocks enrol until KYC is submitted or verified",
      },
      {
        key: "requireKycForRedemption",
        title: "KYC before redemption",
        detail: "Blocks settlement until customer KYC is verified",
      },
    ],
  },
  {
    label: "Customer app",
    policies: [
      {
        key: "customerSelfRegistrationEnabled",
        title: "Public self-registration",
        detail: "Signup from app or web",
      },
      {
        key: "customerSelfEnrolEnabled",
        title: "Self-enrol into plans",
        detail: "Enrol without visiting showroom",
      },
      {
        key: "customerAppWriteEnabled",
        title: "App write access",
        detail: "Off = view-only customer app",
      },
      {
        key: "customerAppPaymentsEnabled",
        title: "In-app payments",
        detail: "Requires write access",
      },
      {
        key: "customerAppMaintenance",
        title: "Customer app maintenance",
        detail: "Temporarily returns a maintenance response for customer-app requests",
      },
    ],
  },
  {
    label: "Redemption",
    policies: [
      {
        key: "redemptionApprovalRequired",
        title: "Admin approval for redemption",
        detail: "Branch submits; admin approves payout",
      },
    ],
  },
];

function previewSequenceFormat(template: string, prefix: string) {
  if (!template.trim()) return "—";
  return template
    .replaceAll("{prefix}", prefix.trim() || "KL")
    .replaceAll("{branchCode}", "KOC")
    .replaceAll("{planCode}", "SAV")
    .replaceAll("{year}", "2026")
    .replace(/\{seq:(\d+)\}/g, (_match, digits: string) =>
      String(42).padStart(Number(digits), "0"),
    );
}

function PolicyRow({
  policy,
  enabled,
  disabled,
  onChange,
}: {
  policy: PolicyDef;
  enabled: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-[#28161a]">{policy.title}</span>
          {policy.code ? (
            <code className="text-[10px] text-[#9a6f2a]">{policy.code}</code>
          ) : null}
        </div>
        <p className="text-xs text-[#776a6d]">{policy.detail}</p>
      </div>
      <Switch
        checked={enabled}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
        className="shrink-0"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="bg-[#faf6f7] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a6f2a] sm:px-5">
      {children}
    </p>
  );
}

export function SettingsOperationsPanel({
  form,
  onFormChange,
  displayError,
  onFieldTouch,
  onFieldErrorClear,
  onSave,
  saveDisabled,
  saveSlot,
}: {
  form: OperationsFormState;
  onFormChange: (next: OperationsFormState) => void;
  displayError: (field: keyof OperationsFormState) => string | undefined;
  onFieldTouch: (field: keyof OperationsFormState) => void;
  onFieldErrorClear: (field: keyof OperationsFormState) => void;
  onSave: () => void;
  saveDisabled: boolean;
  saveSlot?: ReactNode;
}) {
  const patchForm = (patch: Partial<OperationsFormState>) =>
    onFormChange({ ...form, ...patch });

  const handlePolicyChange = (key: PolicyKey, next: boolean) => {
    if (key === "customerAppWriteEnabled" && !next) {
      patchForm({
        customerAppWriteEnabled: false,
        customerAppPaymentsEnabled: false,
      });
      return;
    }
    if (
      key === "customerAppPaymentsEnabled" &&
      !form.customerAppWriteEnabled
    ) {
      return;
    }
    patchForm({ [key]: next });
  };

  const insertToken = (
    field: "receiptNumberFormat" | "passbookNumberFormat" | "schemeNumberFormat",
    token: string,
  ) => {
    onFieldTouch(field);
    onFieldErrorClear(field);
    patchForm({ [field]: `${form[field]}${token}` });
  };

  const fieldClass = "h-9 text-sm";

  return (
    <div className="space-y-4">
      <Surface
        title="Operational rules"
        description="Enforced on enrolment, payments, receipts and redemptions"
      >
        <div className="divide-y divide-[#efe6ea]">
          {POLICY_SECTIONS.map((section) => (
            <div key={section.label}>
              <SectionLabel>{section.label}</SectionLabel>
              <div className="divide-y divide-[#f3eef0]">
                {section.policies.map((policy) => (
                  <PolicyRow
                    key={policy.key}
                    policy={policy}
                    enabled={Boolean(form[policy.key])}
                    disabled={
                      policy.key === "customerAppPaymentsEnabled" &&
                      !form.customerAppWriteEnabled
                    }
                    onChange={(next) => handlePolicyChange(policy.key, next)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div>
            <SectionLabel>Login mode</SectionLabel>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
              <p className="text-xs text-[#776a6d]">Customer authentication</p>
              <div className="inline-flex rounded-lg border border-[#eaded9] p-0.5">
                {(
                  [
                    ["OTP_ONLY", "OTP only"],
                    ["PASSWORD_ONLY", "Password only"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                      form.customerLoginMode === value
                        ? "bg-[#730321] text-white"
                        : "text-[#4f3d41] hover:bg-[#faf6f7]",
                    )}
                    onClick={() => patchForm({ customerLoginMode: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <SectionLabel>Allowed KYC documents</SectionLabel>
            <div className="flex flex-wrap gap-4 px-4 py-3 sm:px-5">
              {(["AADHAAR", "PAN"] as const).map((type) => {
                const checked = form.kycAllowedTypes.includes(type);
                return (
                  <label key={type} className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? form.kycAllowedTypes.filter((value) => value !== type)
                          : [...form.kycAllowedTypes, type];
                        if (next.length) patchForm({ kycAllowedTypes: next });
                      }}
                    />
                    {type === "AADHAAR" ? "Aadhaar" : "PAN"}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-[#efe6ea] p-4 sm:p-5">
          <SectionLabel>Formats & controls</SectionLabel>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel>Receipt prefix</FieldLabel>
              <Input
                value={form.receiptPrefix}
                onChange={(e) => {
                  onFieldTouch("receiptPrefix");
                  onFieldErrorClear("receiptPrefix");
                  patchForm({ receiptPrefix: e.target.value });
                }}
                className={cn(
                  fieldClass,
                  displayError("receiptPrefix") && "border-red-600",
                )}
              />
              <FormFieldError message={displayError("receiptPrefix")} />
            </div>
            <div>
              <FieldLabel>Gold purity</FieldLabel>
              <Input
                value="22K"
                readOnly
                aria-readonly="true"
                className={cn(
                  fieldClass,
                  displayError("goldPurity") && "border-red-600",
                )}
              />
              <FormFieldError message={displayError("goldPurity")} />
            </div>
            <div>
              <FieldLabel>Reversal window (hours)</FieldLabel>
              <Input
                type="number"
                min={0}
                max={168}
                value={form.paymentReversalWindowHours}
                onChange={(e) => {
                  onFieldTouch("paymentReversalWindowHours");
                  onFieldErrorClear("paymentReversalWindowHours");
                  patchForm({
                    paymentReversalWindowHours: Number(e.target.value),
                  });
                }}
                className={cn(
                  fieldClass,
                  displayError("paymentReversalWindowHours") && "border-red-600",
                )}
              />
              <FormFieldError
                message={displayError("paymentReversalWindowHours")}
              />
            </div>
            <div>
              <FieldLabel>Weight rounding</FieldLabel>
              <Select
                value={form.weightRoundingMode}
                onValueChange={(value) => {
                  onFieldTouch("weightRoundingMode");
                  onFieldErrorClear("weightRoundingMode");
                  patchForm({ weightRoundingMode: value });
                }}
              >
                <SelectTrigger
                  className={cn(
                    fieldClass,
                    displayError("weightRoundingMode") && "border-red-600",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEIGHT_ROUNDING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormFieldError message={displayError("weightRoundingMode")} />
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {(
              [
                ["receiptNumberFormat", "Receipt format"] as const,
                ["passbookNumberFormat", "Passbook format"] as const,
                ["schemeNumberFormat", "Scheme format"] as const,
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <FieldLabel>{label}</FieldLabel>
                <Input
                  value={form[field]}
                  onChange={(e) => {
                    onFieldTouch(field);
                    onFieldErrorClear(field);
                    patchForm({ [field]: e.target.value });
                  }}
                  className={cn(
                    "font-mono text-xs",
                    fieldClass,
                    displayError(field) && "border-red-600",
                  )}
                />
                <div className="mt-1 flex flex-wrap gap-1">
                  {FORMAT_TOKENS.map((token) => (
                    <button
                      key={`${field}-${token}`}
                      type="button"
                      className="rounded px-1.5 py-0.5 text-[10px] text-[#730321] hover:bg-[#f7ecee]"
                      onClick={() => insertToken(field, token)}
                    >
                      {token}
                    </button>
                  ))}
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-[#776a6d]">
                  {previewSequenceFormat(form[field], form.receiptPrefix)}
                </p>
                <FormFieldError message={displayError(field)} />
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-[#776a6d]">
            Formats lock after first issue{" "}
            <code className="text-[#9a6f2a]">SEQUENCE_FORMAT_LOCKED</code>
          </p>

          <div className="mt-4">
            <FieldLabel>Terms & conditions</FieldLabel>
            <Textarea
              rows={3}
              value={form.termsAndConditions}
              onChange={(e) => {
                onFieldTouch("termsAndConditions");
                onFieldErrorClear("termsAndConditions");
                patchForm({ termsAndConditions: e.target.value });
              }}
              className={cn(
                "text-sm",
                displayError("termsAndConditions") && "border-red-600",
              )}
            />
            <FormFieldError message={displayError("termsAndConditions")} />
          </div>
        </div>

        <div className="flex justify-end border-t border-[#efe6ea] px-4 py-3 sm:px-5">
          {saveSlot ?? (
            <Button
              className="h-9 gap-2"
              disabled={saveDisabled}
              onClick={() => void onSave()}
            >
              <Save className="size-4" />
              Save operations
            </Button>
          )}
        </div>
      </Surface>
    </div>
  );
}
