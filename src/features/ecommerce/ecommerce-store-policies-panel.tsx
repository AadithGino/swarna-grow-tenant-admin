"use client";

import { FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { cn } from "@/lib/utils";
import { EcommerceSettingsHint } from "@/src/features/ecommerce/ecommerce-settings-ui";

export type StorePoliciesForm = {
  shippingPolicyText: string;
  shippingApproved: boolean;
  returnsPolicyText: string;
  returnsApproved: boolean;
  cancellationPolicyText: string;
  cancellationApproved: boolean;
  refundContactPolicyText: string;
  refundContactApproved: boolean;
  returnEligibilityDays: string;
  returnExcludedCategoryIds: string;
};

const POLICY_MIN = 40;

export function storePoliciesFormFromApi(raw?: Record<string, unknown> | null): StorePoliciesForm {
  const p = (raw?.storePolicies as Record<string, unknown> | undefined) ?? {};
  return {
    shippingPolicyText: String(p.shippingPolicyText ?? ""),
    shippingApproved: Boolean(p.shippingPolicyApprovedAt),
    returnsPolicyText: String(p.returnsPolicyText ?? ""),
    returnsApproved: Boolean(p.returnsPolicyApprovedAt),
    cancellationPolicyText: String(p.cancellationPolicyText ?? ""),
    cancellationApproved: Boolean(p.cancellationPolicyApprovedAt),
    refundContactPolicyText: String(p.refundContactPolicyText ?? ""),
    refundContactApproved: Boolean(p.refundContactPolicyApprovedAt),
    returnEligibilityDays: p.returnEligibilityDays != null ? String(p.returnEligibilityDays) : "7",
    returnExcludedCategoryIds: ((p.returnExcludedCategoryIds as string[]) ?? []).join("\n"),
  };
}

export function storePoliciesPayload(form: StorePoliciesForm, current?: Record<string, unknown> | null) {
  const prev = (current?.storePolicies as Record<string, unknown> | undefined) ?? {};
  const now = new Date().toISOString();
  const days = Number.parseInt(form.returnEligibilityDays, 10);
  return {
    version: Number(prev.version ?? 0) + 1,
    publishedAt: now,
    shippingPolicyText: form.shippingPolicyText.trim(),
    shippingPolicyApprovedAt: form.shippingApproved ? now : undefined,
    returnsPolicyText: form.returnsPolicyText.trim(),
    returnsPolicyApprovedAt: form.returnsApproved ? now : undefined,
    cancellationPolicyText: form.cancellationPolicyText.trim(),
    cancellationPolicyApprovedAt: form.cancellationApproved ? now : undefined,
    refundContactPolicyText: form.refundContactPolicyText.trim(),
    refundContactApprovedAt: form.refundContactApproved ? now : undefined,
    returnEligibilityDays: Number.isFinite(days) ? days : 0,
    returnExcludedCategoryIds: form.returnExcludedCategoryIds
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export function storePolicyFieldIssues(form: StorePoliciesForm): string[] {
  const issues: string[] = [];
  const blocks: { label: string; text: string; approved: boolean }[] = [
    { label: "Shipping", text: form.shippingPolicyText, approved: form.shippingApproved },
    { label: "Returns", text: form.returnsPolicyText, approved: form.returnsApproved },
    { label: "Cancellation", text: form.cancellationPolicyText, approved: form.cancellationApproved },
    { label: "Refund contact", text: form.refundContactPolicyText, approved: form.refundContactApproved },
  ];
  for (const b of blocks) {
    if (b.text.trim().length > 0 && b.text.trim().length < POLICY_MIN) {
      issues.push(`${b.label} policy needs at least ${POLICY_MIN} characters or leave blank until ready.`);
    }
    if (b.approved && b.text.trim().length < POLICY_MIN) {
      issues.push(`${b.label} cannot be approved until the text meets the minimum length.`);
    }
  }
  return issues;
}

type Props = {
  form: StorePoliciesForm;
  disabled?: boolean;
  onChange: (next: StorePoliciesForm) => void;
};

function approvedCount(form: StorePoliciesForm) {
  return [
    form.shippingApproved,
    form.returnsApproved,
    form.cancellationApproved,
    form.refundContactApproved,
  ].filter(Boolean).length;
}

export function EcommerceStorePoliciesPanel({ form, disabled, onChange }: Props) {
  function patch(partial: Partial<StorePoliciesForm>) {
    onChange({ ...form, ...partial });
  }

  const approved = approvedCount(form);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#28161a]">Customer-facing policies</p>
        <StatusBadge
          status={approved === 4 ? "SUCCESS" : "PENDING"}
          label={`${approved} of 4 approved`}
        />
      </div>
      <EcommerceSettingsHint icon={FileText} title="Four policies shoppers must see">
        Write your own wording (minimum {POLICY_MIN} characters each). Tick approve only when
        product owner is happy — checkout stays blocked until all four are approved.
      </EcommerceSettingsHint>

      <PolicyBlock
        title="Shipping"
        text={form.shippingPolicyText}
        approved={form.shippingApproved}
        disabled={disabled}
        onText={(shippingPolicyText) => patch({ shippingPolicyText })}
        onApproved={(shippingApproved) => patch({ shippingApproved })}
      />
      <PolicyBlock
        title="Returns & exchanges"
        text={form.returnsPolicyText}
        approved={form.returnsApproved}
        disabled={disabled}
        onText={(returnsPolicyText) => patch({ returnsPolicyText })}
        onApproved={(returnsApproved) => patch({ returnsApproved })}
      />
      <PolicyBlock
        title="Cancellations"
        text={form.cancellationPolicyText}
        approved={form.cancellationApproved}
        disabled={disabled}
        onText={(cancellationPolicyText) => patch({ cancellationPolicyText })}
        onApproved={(cancellationApproved) => patch({ cancellationApproved })}
      />
      <PolicyBlock
        title="Refund timing & contact"
        text={form.refundContactPolicyText}
        approved={form.refundContactApproved}
        disabled={disabled}
        onText={(refundContactPolicyText) => patch({ refundContactPolicyText })}
        onApproved={(refundContactApproved) => patch({ refundContactApproved })}
      />

      <div className="grid gap-4 rounded-xl border border-[#eaded9] bg-[#faf7f5] p-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Return window (days after delivery)</FieldLabel>
          <Input
            type="number"
            min={0}
            max={365}
            disabled={disabled}
            value={form.returnEligibilityDays}
            onChange={(e) => patch({ returnEligibilityDays: e.target.value })}
            className="h-11"
          />
        </div>
        <div>
          <FieldLabel>Categories with no returns (optional IDs)</FieldLabel>
          <Textarea
            rows={3}
            disabled={disabled}
            value={form.returnExcludedCategoryIds}
            onChange={(e) => patch({ returnExcludedCategoryIds: e.target.value })}
            placeholder="One category ID per line"
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function PolicyBlock({
  title,
  text,
  approved,
  disabled,
  onText,
  onApproved,
}: {
  title: string;
  text: string;
  approved: boolean;
  disabled?: boolean;
  onText: (v: string) => void;
  onApproved: (v: boolean) => void;
}) {
  const len = text.trim().length;
  const meetsMin = len === 0 || len >= POLICY_MIN;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-5",
        approved ? "border-emerald-200 bg-emerald-50/40" : "border-[#eaded9] bg-white",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-[#28161a]">{title}</h3>
        {approved ? <StatusBadge status="VERIFIED" label="Approved for checkout" /> : null}
      </div>
      <Textarea
        rows={4}
        disabled={disabled}
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder={`${title} policy — plain language for customers`}
        className="text-sm leading-relaxed"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            "text-xs",
            meetsMin ? "text-muted-foreground" : "font-medium text-amber-800",
          )}
        >
          {len === 0
            ? `Leave empty until ready, or at least ${POLICY_MIN} characters to approve.`
            : `${len} characters${len < POLICY_MIN ? ` — need ${POLICY_MIN - len} more to approve` : ""}`}
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={approved}
            disabled={disabled || (len > 0 && len < POLICY_MIN)}
            onCheckedChange={(v) => onApproved(v === true)}
          />
          Approve for checkout
        </label>
      </div>
    </div>
  );
}
